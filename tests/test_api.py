"""Integration tests for Flask application, CSRF protection, and REST endpoints."""

import pytest
import io
import json
from app import app
from auth import create_user, DEFAULT_PERMISSIONS

@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = False
    with app.test_client() as client:
        with app.app_context():
            create_user("admin_test", "adminpass123", role="admin")
            create_user("readonly_test", "readonlypass123", role="readonly")
        yield client


def test_auth_status_unauthenticated(client):
    res = client.get("/api/auth/status")
    assert res.status_code == 200
    data = res.get_json()
    assert "csrf_token" in data
    assert data["authenticated"] is False


def test_login_and_csrf_protection(client):
    # Valid login
    res = client.post("/api/auth/login", json={
        "username": "admin_test",
        "password": "adminpass123"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    csrf_token = data["csrf_token"]

    # State changing request WITHOUT CSRF token must be blocked (403)
    res_no_csrf = client.post("/api/folder", json={
        "root": 0,
        "name": "test_folder"
    })
    assert res_no_csrf.status_code == 403

    # State changing request WITH valid CSRF token in header
    res_csrf = client.post(
        "/api/folder",
        headers={"X-CSRF-Token": csrf_token},
        json={"root": 0, "name": "test_folder_csrf"}
    )
    # Status code will be 200 or 400 depending on folder existence, but not 403 CSRF blocked
    assert res_csrf.status_code in (200, 400)


def test_roots_and_browse_api(client):
    # Login first
    login_res = client.post("/api/auth/login", json={
        "username": "admin_test",
        "password": "adminpass123"
    })
    assert login_res.status_code == 200

    # Browse roots
    roots_res = client.get("/api/roots")
    assert roots_res.status_code == 200
    data = roots_res.get_json()
    assert data["success"] is True
    assert len(data["roots"]) > 0

    # Browse root 0
    browse_res = client.get("/api/browse?root=0")
    assert browse_res.status_code == 200
    b_data = browse_res.get_json()
    assert b_data["success"] is True
    assert "items" in b_data
    assert "storage" in b_data
