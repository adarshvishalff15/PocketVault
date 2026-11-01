"""Security module for the Windows 11 Remote File Server.

Provides strict path canonicalization, directory traversal prevention,
CSRF token validation, brute-force rate-limiting, and structured audit logging.
"""

from datetime import datetime, timezone, timedelta
from flask import request, session, abort
from pathlib import Path
import json
import os
import re
import secrets
from config import DATA_DIR, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES

# Audit log path
AUDIT_LOG_FILE = DATA_DIR / "audit.log"

# Windows reserved device names that must never be created or referenced
WINDOWS_RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}

# In-memory rate limiting tracker: { identifier: [timestamp1, timestamp2, ...] }
_FAILED_ATTEMPTS = {}
_LOCKOUTS = {}


def sanitize_filename(filename: str) -> str:
    """Sanitizes filename for safe creation on Windows and Linux filesystems.
    
    Prevents path traversal characters, control characters, and Windows reserved names.
    """
    if not filename:
        return "unnamed_file"

    # Strip directory components if any
    cleaned = Path(filename).name.strip()

    # Remove null bytes and control chars
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", cleaned)

    # Disallow Windows prohibited characters: < > : " / \ | ? *
    cleaned = re.sub(r'[<>:"/\\|?*]', "_", cleaned)

    # Disallow leading/trailing dots or spaces (Windows trims them and can behave weirdly)
    cleaned = cleaned.strip(". ")

    if not cleaned:
        cleaned = "unnamed_file"

    # Check for Windows reserved names (e.g. CON.txt, NUL, AUX)
    base_name = cleaned.split(".")[0].upper()
    if base_name in WINDOWS_RESERVED_NAMES:
        cleaned = f"file_{cleaned}"

    return cleaned[:255]


def is_within_root(root: Path, candidate: Path) -> bool:
    """Check that candidate path is strictly within the allowed root directory.
    
    Resolves symlinks, junctions, and relative segments ('..').
    Handles Windows drive letters, network shares, and UNC canonical forms.
    """
    try:
        try:
            root_resolved = root.resolve(strict=True)
        except Exception:
            root_resolved = root

        try:
            candidate_resolved = candidate.resolve(strict=False)
        except Exception:
            candidate_resolved = candidate

        root_norm = os.path.normpath(os.path.normcase(str(root_resolved)))
        candidate_norm = os.path.normpath(os.path.normcase(str(candidate_resolved)))

        # Compare canonical commonpath
        try:
            if os.path.normpath(os.path.commonpath([root_norm, candidate_norm])) == root_norm:
                return True
        except ValueError:
            pass

        # Fallback check on raw normalized paths (e.g. for mapped network drives Z:\)
        raw_root = os.path.normpath(os.path.normcase(str(root)))
        raw_cand = os.path.normpath(os.path.normcase(str(candidate)))
        try:
            if os.path.normpath(os.path.commonpath([raw_root, raw_cand])) == raw_root:
                return True
        except ValueError:
            pass

        return False
    except (OSError, RuntimeError, ValueError):
        return False


def safe_resolve_path(root: Path, relative_path: str) -> Path:
    """Safely resolves relative path against root.
    
    Rejects path traversal, null bytes, and paths escaping root.
    Raises PermissionError if resolution escapes the root boundary.
    """
    if "\x00" in relative_path:
        raise PermissionError("Null byte detected in path.")

    # Remove leading slashes to prevent Path joining from treating it as root
    rel_clean = relative_path.lstrip("/\\")

    # On Windows, check for drive letter injection in relative path (e.g. C:\Windows\System32)
    if os.name == "nt" and len(rel_clean) >= 2 and rel_clean[1] == ":":
        raw_root_prefix = str(root)[:2].upper()
        if not rel_clean.upper().startswith(raw_root_prefix):
            raise PermissionError("Path traversal or access outside permitted root denied.")

    candidate = (root / rel_clean)

    if not is_within_root(root, candidate):
        raise PermissionError("Path traversal or access outside permitted root denied.")

    return candidate


# --- CSRF Protection ---

def get_or_create_csrf_token() -> str:
    """Get existing CSRF token or create a new cryptographically secure token."""
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(32)
    return session["csrf_token"]


def validate_csrf():
    """Validates the CSRF token on state-changing requests.
    
    Checks X-CSRF-Token header or 'csrf_token' form parameter.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return True

    expected = session.get("csrf_token")
    if not expected:
        return False

    received = request.headers.get("X-CSRF-Token")
    if not received and request.form:
        received = request.form.get("csrf_token")
    if not received and request.is_json:
        try:
            received = request.get_json(silent=True, force=False).get("csrf_token")
        except Exception:
            pass

    return received is not None and secrets.compare_digest(str(received), str(expected))


# --- Rate Limiting & Lockout ---

def get_client_ip() -> str:
    """Extract client IP respecting X-Forwarded-For if trusted or remote_addr."""
    # When behind reverse proxy, take the first IP, else fallback to remote_addr
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "127.0.0.1"


def check_rate_limit(identifier: str) -> tuple[bool, int]:
    """Check if identifier (IP or username) is currently locked out.
    
    Returns (is_locked, remaining_seconds).
    """
    now = datetime.now(timezone.utc)

    # Check active lockout
    if identifier in _LOCKOUTS:
        lockout_expiry = _LOCKOUTS[identifier]
        if now < lockout_expiry:
            remaining = int((lockout_expiry - now).total_seconds())
            return True, remaining
        else:
            del _LOCKOUTS[identifier]

    # Clean old attempts older than 15 minutes
    cutoff = now - timedelta(minutes=15)
    attempts = [t for t in _FAILED_ATTEMPTS.get(identifier, []) if t > cutoff]
    _FAILED_ATTEMPTS[identifier] = attempts

    if len(attempts) >= MAX_LOGIN_ATTEMPTS:
        lockout_expiry = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        _LOCKOUTS[identifier] = lockout_expiry
        return True, LOCKOUT_DURATION_MINUTES * 60

    return False, 0


def record_login_failure(identifier: str):
    """Record a failed login attempt for the identifier."""
    now = datetime.now(timezone.utc)
    if identifier not in _FAILED_ATTEMPTS:
        _FAILED_ATTEMPTS[identifier] = []
    _FAILED_ATTEMPTS[identifier].append(now)


def reset_login_attempts(identifier: str):
    """Clear failed attempts for identifier on successful authentication."""
    _FAILED_ATTEMPTS.pop(identifier, None)
    _LOCKOUTS.pop(identifier, None)


# --- Security Audit Logging ---

def audit_log(action: str, username: str = "anonymous", status: str = "SUCCESS", details: str = ""):
    """Record a structured security event in the audit log.
    
    Logs never include passwords, hashes, or session secrets.
    """
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "username": username,
        "ip": get_client_ip(),
        "status": status,
        "details": details,
        "user_agent": request.headers.get("User-Agent", "unknown")[:150]
    }

    try:
        with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass


def get_recent_audit_logs(limit: int = 50) -> list[dict]:
    """Retrieve the most recent audit log entries."""
    if not AUDIT_LOG_FILE.exists():
        return []

    lines = []
    try:
        with open(AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    lines.append(line)
        results = []
        for line in reversed(lines[-limit:]):
            try:
                results.append(json.loads(line))
            except Exception:
                continue
        return results
    except Exception:
        return []
