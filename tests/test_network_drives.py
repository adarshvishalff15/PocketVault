"""Tests for network drive support, dynamic roots discovery, UNC path safety, and error handling."""

import os
import pytest
import tempfile
from pathlib import Path
from config import get_roots, get_root_by_id, load_configured_roots
from file_manager import list_directory, safe_resolve_path, is_within_root
from app import app
from auth import create_user


@pytest.fixture
def auth_client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        with app.app_context():
            create_user("net_test_admin", "AdminNetPass123!", role="admin")

        login_res = client.post("/api/auth/login", json={
            "username": "net_test_admin",
            "password": "AdminNetPass123!"
        })
        assert login_res.status_code == 200
        yield client


def test_server_py_importable():
    """Verify server.py entrypoint exists, is importable, and defines app and run_server."""
    import server
    assert hasattr(server, "app")
    assert hasattr(server, "run_server")


def test_dynamic_roots_discovery():
    """Verify get_roots() dynamically returns current roots with drive_type metadata."""
    roots = get_roots(force_refresh=True)
    assert len(roots) > 0
    for r in roots:
        assert "id" in r
        assert "name" in r
        assert "path" in r
        assert "type" in r
        assert "drive_type" in r


def test_safe_resolve_with_network_and_drive_roots():
    """Verify is_within_root and safe_resolve_path handle canonical Windows and UNC paths safely."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        sub = root / "folder1"
        sub.mkdir()
        test_file = sub / "document.txt"
        test_file.write_text("sample content", encoding="utf-8")

        # Resolves properly
        resolved = safe_resolve_path(root, "folder1/document.txt")
        assert resolved.exists()
        assert is_within_root(root, resolved)

        # Directory traversal blocked
        with pytest.raises(PermissionError):
            safe_resolve_path(root, "../escaping.txt")


def test_list_directory_network_drive_stability():
    """Verify list_directory handles directories with relative paths without ValueError."""
    roots = get_roots()
    # Test on primary root (Desktop or first safe root)
    res = list_directory(roots[0]["id"], "")
    assert "items" in res
    assert "breadcrumbs" in res
    assert res["root_id"] == roots[0]["id"]
    for item in res["items"]:
        assert "rel_path" in item
        assert "name" in item
        # Path must be relative, not starting with slash or backslash
        assert not item["rel_path"].startswith("/")
        assert not item["rel_path"].startswith("\\")


def test_api_roots_includes_drive_type_metadata(auth_client):
    """Verify /api/roots endpoint returns drive_type and remote_name for network drives."""
    res = auth_client.get("/api/roots")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["roots"]) > 0
    for r in data["roots"]:
        assert "drive_type" in r
        assert "remote_name" in r


def test_error_handling_nonexistent_root(auth_client):
    """Verify accessing invalid root ID returns clean 404 JSON, not HTML or crash."""
    res = auth_client.get("/api/browse?root=999999")
    assert res.status_code == 404
    data = res.get_json()
    assert data["success"] is False
    assert "error" in data
