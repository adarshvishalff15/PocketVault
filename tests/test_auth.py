"""Tests for authentication, password hashing, and user permission models."""

import pytest
import os
import tempfile
from pathlib import Path
from auth import (
    create_user, update_user, delete_user, authenticate,
    get_user, list_users, DEFAULT_PERMISSIONS
)

def test_user_lifecycle_and_hashing():
    # Create test user
    success, msg = create_user("testuser", "securePassword123", "Test User", role="user")
    assert success

    # Verify authentication with correct password
    auth_ok, user_data, err = authenticate("testuser", "securePassword123")
    assert auth_ok
    assert user_data["username"] == "testuser"
    assert user_data["display_name"] == "Test User"

    # Reject incorrect password
    auth_bad, _, err = authenticate("testuser", "wrongpassword")
    assert not auth_bad

    # Reject non-existent user
    auth_none, _, _ = authenticate("nonexistent_user", "pass")
    assert not auth_none

    # Update user
    upd_ok, _ = update_user("testuser", display_name="Updated Name")
    assert upd_ok
    assert get_user("testuser")["display_name"] == "Updated Name"

    # Delete user
    del_ok, _ = delete_user("testuser")
    assert del_ok
    assert get_user("testuser") is None
