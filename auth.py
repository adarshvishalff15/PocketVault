"""Authentication and user management module for PocketVault.

Handles secure password hashing, user storage, session tracking,
role-based permissions, and administrator provisioning.
"""

from datetime import datetime, timezone
from flask import session
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os
from pathlib import Path
from config import DATA_DIR, ENV_USER, ENV_PASSWORD
from security import audit_log

USERS_FILE = DATA_DIR / "users.json"
DATA_DIR.mkdir(exist_ok=True, parents=True)

DEFAULT_PERMISSIONS = {
    "admin": {
        "read": True,
        "download": True,
        "upload": True,
        "mkdir": True,
        "rename": True,
        "move_copy": True,
        "delete": True,
        "stream": True,
        "preview": True,
        "admin": True,
    },
    "user": {
        "read": True,
        "download": True,
        "upload": True,
        "mkdir": True,
        "rename": True,
        "move_copy": False,
        "delete": False,
        "stream": True,
        "preview": True,
        "admin": False,
    },
    "readonly": {
        "read": True,
        "download": True,
        "upload": False,
        "mkdir": False,
        "rename": False,
        "move_copy": False,
        "delete": False,
        "stream": True,
        "preview": True,
        "admin": False,
    }
}


def _load_users() -> dict[str, dict]:
    """Load users database from data/users.json."""
    if not USERS_FILE.exists():
        return {}
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_users(users: dict[str, dict]):
    """Save users database safely to disk."""
    DATA_DIR.mkdir(exist_ok=True, parents=True)
    temp_file = USERS_FILE.with_suffix(".tmp")
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)
        os.replace(str(temp_file), str(USERS_FILE))
    except Exception:
        # Fallback direct write
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)


def init_auth():
    """Initialize auth system. Ensures default admin user is seeded if configured."""
    users = _load_users()
    clean_env_user = (ENV_USER or "vishal").strip().lower()

    # If users database doesn't have the configured admin user and ENV_PASSWORD is set, seed it
    if clean_env_user not in users and ENV_PASSWORD:
        admin_user = {
            "username": clean_env_user,
            "password_hash": generate_password_hash(ENV_PASSWORD),
            "display_name": clean_env_user.capitalize(),
            "role": "admin",
            "permissions": DEFAULT_PERMISSIONS["admin"].copy(),
            "allowed_roots": ["*"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "disabled": False,
        }
        users[clean_env_user] = admin_user
        _save_users(users)
        audit_log("USER_INIT", clean_env_user, "SUCCESS", "Initialized default admin user from configuration")


def is_setup_needed() -> bool:
    """Return True if no users exist in the system and no env password is provided."""
    users = _load_users()
    return len(users) == 0 and not ENV_PASSWORD


def get_user(username: str) -> dict | None:
    """Look up user by case-insensitive username."""
    if not username:
        return None
    users = _load_users()
    return users.get(username.strip().lower())


def list_users() -> list[dict]:
    """Return list of all registered users without password hashes."""
    users = _load_users()
    sanitized = []
    for u in users.values():
        copy = u.copy()
        copy.pop("password_hash", None)
        sanitized.append(copy)
    return sanitized


def create_user(
    username: str,
    password: str,
    display_name: str = "",
    role: str = "user",
    permissions: dict | None = None,
    allowed_roots: list | None = None,
) -> tuple[bool, str]:
    username = (username or "").strip().lower()
    if not username or len(username) < 3:
        return False, "Username must be at least 3 characters."
    if not password or len(password) < 4:
        return False, "Password must be at least 4 characters."

    users = _load_users()
    if username in users:
        return False, "Username already exists."

    if not permissions:
        permissions = DEFAULT_PERMISSIONS.get(role, DEFAULT_PERMISSIONS["user"]).copy()

    users[username] = {
        "username": username,
        "password_hash": generate_password_hash(password),
        "display_name": display_name.strip() or username.capitalize(),
        "role": role,
        "permissions": permissions,
        "allowed_roots": allowed_roots if allowed_roots is not None else ["*"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "disabled": False,
    }
    _save_users(users)
    return True, "User created successfully."


def update_user(
    username: str,
    display_name: str | None = None,
    password: str | None = None,
    role: str | None = None,
    permissions: dict | None = None,
    allowed_roots: list | None = None,
    disabled: bool | None = None,
) -> tuple[bool, str]:
    username = (username or "").strip().lower()
    users = _load_users()
    if username not in users:
        return False, "User not found."

    user = users[username]
    if display_name is not None:
        user["display_name"] = display_name.strip()
    if password:
        if len(password) < 4:
            return False, "Password must be at least 4 characters."
        user["password_hash"] = generate_password_hash(password)
    if role is not None:
        user["role"] = role
    if permissions is not None:
        user["permissions"] = permissions
    if allowed_roots is not None:
        user["allowed_roots"] = allowed_roots
    if disabled is not None:
        user["disabled"] = bool(disabled)

    _save_users(users)
    return True, "User updated successfully."


def delete_user(username: str) -> tuple[bool, str]:
    username = (username or "").strip().lower()
    users = _load_users()
    if username not in users:
        return False, "User not found."

    # Prevent deleting the last active admin
    admins = [u for u in users.values() if u.get("role") == "admin" and not u.get("disabled")]
    if len(admins) <= 1 and users[username].get("role") == "admin":
        return False, "Cannot delete the sole active administrator."

    del users[username]
    _save_users(users)
    return True, "User deleted."


def authenticate(username: str, password: str) -> tuple[bool, dict | None, str]:
    """Authenticates username and password case-insensitively. Returns (success, user_dict, error_msg)."""
    clean_username = (username or "").strip().lower()
    clean_env_user = (ENV_USER or "vishal").strip().lower()
    users = _load_users()

    # If users database doesn't have the account, but it matches environment credentials
    if clean_username not in users and ENV_PASSWORD:
        if clean_username == clean_env_user and password == ENV_PASSWORD:
            init_auth()
            users = _load_users()

    user = users.get(clean_username)
    if not user:
        return False, None, "Invalid username or password."

    if user.get("disabled"):
        return False, None, "Account is disabled. Please contact the administrator."

    if not check_password_hash(user["password_hash"], password):
        return False, None, "Invalid username or password."

    return True, user, ""


def get_current_user() -> dict | None:
    """Retrieve currently authenticated user from session."""
    username = session.get("username")
    if not username:
        return None
    user = get_user(str(username).strip().lower())
    if not user or user.get("disabled"):
        return None
    return user


def has_permission(permission_name: str) -> bool:
    """Check if the current user has the specified permission."""
    user = get_current_user()
    if not user:
        return False
    if user.get("role") == "admin":
        return True
    return bool(user.get("permissions", {}).get(permission_name, False))


def can_access_root(root_id: int) -> bool:
    """Check if the current user is allowed to access the specified root ID."""
    user = get_current_user()
    if not user:
        return False
    if user.get("role") == "admin":
        return True
    allowed = user.get("allowed_roots", ["*"])
    if "*" in allowed:
        return True
    return root_id in allowed or str(root_id) in [str(x) for x in allowed]
