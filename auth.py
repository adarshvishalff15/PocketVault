"""Authentication and user management module.

Handles secure password hashing, user storage, session tracking,
role-based permissions, and the first-run administrator wizard.
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
            return json.load(f)
    except Exception:
        return {}


def _save_users(users: dict[str, dict]):
    """Save users database safely to disk."""
    temp_file = USERS_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)
    temp_file.replace(USERS_FILE)


def init_auth():
    """Initialize auth system. If environment credentials exist and users.json is empty, auto-seed."""
    users = _load_users()
    if not users and ENV_PASSWORD:
        # Auto-seed from environment variables
        admin_user = {
            "username": ENV_USER,
            "password_hash": generate_password_hash(ENV_PASSWORD),
            "display_name": ENV_USER.capitalize(),
            "role": "admin",
            "permissions": DEFAULT_PERMISSIONS["admin"].copy(),
            "allowed_roots": ["*"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "disabled": False,
        }
        users[ENV_USER] = admin_user
        _save_users(users)
        audit_log("USER_INIT", ENV_USER, "SUCCESS", "Initialized default admin user from environment variables")


def is_setup_needed() -> bool:
    """Return True if no users exist in the system and no env password is provided."""
    users = _load_users()
    return len(users) == 0 and not ENV_PASSWORD


def get_user(username: str) -> dict | None:
    users = _load_users()
    return users.get(username)


def list_users() -> list[dict]:
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
    username = username.strip().lower()
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
    users = _load_users()
    if username not in users:
        return False, "User not found."

    user = users[username]
    if display_name is not None:
        user["display_name"] = display_name.strip()
    if password:
        if len(password) < 6:
            return False, "Password must be at least 6 characters."
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
    users = _load_users()
    if username not in users:
        return False, "User not found."

    # Prevent deleting the last admin
    admins = [u for u in users.values() if u.get("role") == "admin" and not u.get("disabled")]
    if len(admins) <= 1 and users[username].get("role") == "admin":
        return False, "Cannot delete the sole active administrator."

    del users[username]
    _save_users(users)
    return True, "User deleted."


def authenticate(username: str, password: str) -> tuple[bool, dict | None, str]:
    """Authenticates username and password. Returns (success, user_dict, error_msg)."""
    username = username.strip().lower()
    users = _load_users()

    # If database is empty but environment credentials match
    if not users and ENV_PASSWORD:
        if username == ENV_USER.lower() and password == ENV_PASSWORD:
            init_auth()
            users = _load_users()

    user = users.get(username)
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
    user = get_user(username)
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
    if "*" in allowed or str(root_id) in [str(x) for x in allowed] or root_id in allowed:
        return True
    return False
