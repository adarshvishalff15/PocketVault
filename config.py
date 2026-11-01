"""Configuration module for PocketVault Mobile File Server.

Handles safe roots detection (Android Termux, Linux, Windows),
security defaults, environment configuration, and persistence.
"""

from pathlib import Path
import ctypes
import os
import secrets
import sys
import time

# Base project directory
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True, parents=True)

# Application metadata
APP_NAME = os.environ.get("POCKETVAULT_NAME", os.environ.get("FILE_SERVER_NAME", "PocketVault"))
HOST = os.environ.get("POCKETVAULT_HOST", os.environ.get("FILE_SERVER_HOST", "0.0.0.0"))
PORT = int(os.environ.get("POCKETVAULT_PORT", os.environ.get("FILE_SERVER_PORT", "8288")))
DEBUG = os.environ.get("POCKETVAULT_DEBUG", os.environ.get("FILE_SERVER_DEBUG", "0")).lower() in ("1", "true", "yes")

# Secret key for sessions
SECRET_KEY_FILE = DATA_DIR / "secret.key"
if not SECRET_KEY_FILE.exists():
    SECRET_KEY_FILE.write_text(secrets.token_hex(32), encoding="utf-8")
SECRET_KEY = os.environ.get("POCKETVAULT_SECRET_KEY", os.environ.get("FILE_SERVER_SECRET_KEY", SECRET_KEY_FILE.read_text(encoding="utf-8").strip()))

# Rate limiting
MAX_LOGIN_ATTEMPTS = int(os.environ.get("POCKETVAULT_MAX_ATTEMPTS", "5"))
LOCKOUT_DURATION_MINUTES = int(os.environ.get("POCKETVAULT_LOCKOUT_MINS", "10"))

# Default admin credentials
ENV_USER = os.environ.get("POCKETVAULT_USER", os.environ.get("FILE_SERVER_USER", "vishal"))
ENV_PASSWORD = os.environ.get("POCKETVAULT_PASSWORD", os.environ.get("FILE_SERVER_PASSWORD", "vishal123"))

# Session duration in seconds (default: 24 hours)
SESSION_LIFETIME = int(os.environ.get("POCKETVAULT_SESSION_HOURS", "24")) * 3600

# File type definitions
MEDIA_EXTENSIONS = {
    "audio": {".mp3", ".m4a", ".ogg", ".wav", ".flac", ".aac", ".wma", ".opus"},
    "video": {".mp4", ".webm", ".m4v", ".mov", ".mkv", ".avi", ".ts"},
    "image": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".ico", ".tiff"},
    "pdf": {".pdf"},
    "document": {".docx", ".doc", ".odt", ".rtf"},
    "presentation": {".pptx", ".ppt", ".odp"},
    "spreadsheet": {".xlsx", ".xls", ".ods", ".csv"},
    "text": {
        ".txt", ".log", ".md", ".json", ".xml", ".yaml", ".yml", ".ini",
        ".conf", ".py", ".java", ".kt", ".c", ".cpp", ".h", ".html",
        ".css", ".js", ".ts", ".sh", ".bat", ".ps1", ".sql", ".rs",
        ".go", ".php", ".rb", ".toml", ".env", ".gitignore",
    },
    "archive": {".zip", ".tar", ".gz", ".7z", ".rar"},
    "executable": {".exe", ".msi", ".dll", ".apk"},
}


def get_file_category(suffix: str) -> str:
    ext = suffix.lower()
    for cat, exts in MEDIA_EXTENSIONS.items():
        if ext in exts:
            return cat
    return "other"


# Cache timestamp for dynamic roots
_LAST_ROOTS_CHECK = 0.0


def is_android_environment() -> bool:
    """Check whether we are running on an Android device (Termux / PRoot)."""
    return (
        os.path.exists("/sdcard")
        or os.path.exists("/storage/emulated/0")
        or "TERMUX_VERSION" in os.environ
        or "ANDROID_ROOT" in os.environ
        or Path.home().joinpath("storage").is_dir()
    )


def get_android_roots() -> list[dict]:
    """Auto-detect common storage roots on Android and Termux."""
    roots = []
    user_home = Path.home()
    termux_storage = user_home / "storage"

    # Priority Android storage paths
    candidate_locations = [
        ("Internal Storage", [Path("/storage/emulated/0"), Path("/sdcard"), termux_storage / "shared"]),
        ("Camera & DCIM", [Path("/sdcard/DCIM"), Path("/storage/emulated/0/DCIM"), termux_storage / "dcim"]),
        ("Pictures & Wallpapers", [Path("/sdcard/Pictures"), Path("/storage/emulated/0/Pictures"), termux_storage / "pictures"]),
        ("Videos & Movies", [Path("/sdcard/Movies"), Path("/storage/emulated/0/Movies"), termux_storage / "movies"]),
        ("Downloads", [Path("/sdcard/Download"), Path("/storage/emulated/0/Download"), termux_storage / "downloads"]),
        ("Documents", [Path("/sdcard/Documents"), Path("/storage/emulated/0/Documents"), termux_storage / "documents"]),
        ("Music & Audio", [Path("/sdcard/Music"), Path("/storage/emulated/0/Music"), termux_storage / "music"]),
    ]

    for label, paths in candidate_locations:
        for p in paths:
            try:
                if p.exists() and p.is_dir():
                    resolved = p.resolve()
                    # Prevent duplicate path entries
                    if resolved not in [r["path"] for r in roots] and p not in [r["path"] for r in roots]:
                        roots.append({
                            "id": len(roots),
                            "name": label,
                            "path": resolved,
                            "type": "folder",
                            "drive_type": "folder",
                            "remote_name": "",
                        })
                        break
            except Exception:
                continue

    # Fallback to Termux home directory if nothing found
    if not roots:
        roots.append({
            "id": 0,
            "name": "Termux Home",
            "path": user_home.resolve(),
            "type": "folder",
            "drive_type": "folder",
            "remote_name": "",
        })

    return roots


def get_default_safe_roots() -> list[dict]:
    """Returns safe, user-friendly default roots.
    
    If running on Android / Termux, auto-discovers Android shared folders.
    If running on Windows / Linux, mounts standard user library folders and safe drives.
    """
    if is_android_environment():
        android_roots = get_android_roots()
        if android_roots:
            return android_roots

    roots = []
    user_home = Path.home()

    # User library folders
    common_user_folders = [
        ("Pictures", user_home / "Pictures"),
        ("Videos", user_home / "Videos"),
        ("Music", user_home / "Music"),
        ("Documents", user_home / "Documents"),
        ("Downloads", user_home / "Downloads"),
        ("Desktop", user_home / "Desktop"),
    ]

    for label, folder in common_user_folders:
        try:
            if folder.exists():
                resolved = folder.resolve(strict=True)
                if resolved.is_dir() and resolved not in [r["path"] for r in roots]:
                    roots.append({
                        "id": len(roots),
                        "name": label,
                        "path": resolved,
                        "type": "folder",
                        "drive_type": "folder",
                        "remote_name": "",
                    })
        except (OSError, RuntimeError):
            continue

    # On Windows, discover non-system and data drives
    if os.name == "nt":
        try:
            ctypes.windll.kernel32.SetErrorMode(0x0001 | 0x0002)
        except Exception:
            pass

        try:
            mask = ctypes.windll.kernel32.GetLogicalDrives()
            for i in range(26):
                letter = chr(65 + i)
                drive_str = f"{letter}:\\"
                if mask & (1 << i):
                    try:
                        dtype = ctypes.windll.kernel32.GetDriveTypeW(drive_str)
                        if dtype in (0, 1, 5):  # Unknown, No Root, CD-ROM
                            continue

                        p = Path(drive_str)
                        if not p.is_dir():
                            continue

                        label = ""
                        try:
                            vol_buf = ctypes.create_unicode_buffer(1024)
                            res = ctypes.windll.kernel32.GetVolumeInformationW(drive_str, vol_buf, 1024, None, None, None, None, 0)
                            if res:
                                label = vol_buf.value.strip()
                        except Exception:
                            pass

                        name = f"{label} ({letter}:)" if label else f"Drive ({letter}:)"
                        if p not in [r["path"] for r in roots]:
                            roots.append({
                                "id": len(roots),
                                "name": name,
                                "path": p,
                                "type": "drive",
                                "drive_type": "drive",
                                "remote_name": "",
                            })
                    except Exception:
                        continue
        except Exception:
            pass

    # If nothing was found, fall back to user home
    if not roots:
        roots.append({"id": 0, "name": "Home Directory", "path": user_home.resolve(), "type": "folder", "drive_type": "folder", "remote_name": ""})

    return roots


def load_configured_roots() -> list[dict]:
    """Load roots configured via POCKETVAULT_ROOTS / FILE_SERVER_ROOTS or fallback to safe defaults."""
    configured = os.environ.get("POCKETVAULT_ROOTS", os.environ.get("FILE_SERVER_ROOTS", "")).strip()
    if not configured:
        return get_default_safe_roots()

    roots = []
    candidates = [p.strip() for p in configured.split(os.pathsep) if p.strip()]
    for idx, cand in enumerate(candidates):
        try:
            p = Path(cand).expanduser()
            if not p.is_dir():
                continue
            try:
                resolved = p.resolve(strict=True)
            except Exception:
                resolved = p

            if resolved not in [r["path"] for r in roots] and p not in [r["path"] for r in roots]:
                roots.append({
                    "id": idx,
                    "name": resolved.name or str(resolved),
                    "path": resolved,
                    "type": "folder",
                    "drive_type": "folder",
                    "remote_name": "",
                })
        except (OSError, RuntimeError):
            continue

    if not roots:
        return get_default_safe_roots()
    return roots


# Global loaded roots list (maintained in-place)
ROOTS = load_configured_roots()


def get_roots(force_refresh: bool = False) -> list[dict]:
    """Retrieve all roots dynamically with lightweight caching."""
    global ROOTS, _LAST_ROOTS_CHECK
    now = time.time()
    if force_refresh or not ROOTS or (now - _LAST_ROOTS_CHECK) > 5.0:
        fresh = load_configured_roots()
        ROOTS.clear()
        ROOTS.extend(fresh)
        _LAST_ROOTS_CHECK = now
    return ROOTS


def get_root_by_id(root_id: int):
    """Find root by its integer ID."""
    roots = get_roots()
    for r in roots:
        if r["id"] == root_id:
            return r
    roots = get_roots(force_refresh=True)
    for r in roots:
        if r["id"] == root_id:
            return r
    return None
