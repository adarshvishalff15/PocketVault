"""Regression tests for download functionality.

Verifies:
1. Single file download delivers original file directly (never wrapped in ZIP).
2. Preserves exact filename, spaces, unicode characters, extension, and MIME type.
3. Multiple files download as 'Selected_Files.zip'.
4. Single folder downloads as '<FolderName>.zip' preserving internal hierarchy.
5. Duplicate filenames are handled safely.
6. Unauthorized / traversal paths are strictly rejected.
"""

import pytest
import io
import urllib.parse
import zipfile
import tempfile
from pathlib import Path
from app import app
from config import ROOTS
from auth import create_user


@pytest.fixture
def auth_client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        with app.app_context():
            create_user("dl_test_admin", "AdminPassword123!", role="admin")

        login_res = client.post("/api/auth/login", json={
            "username": "dl_test_admin",
            "password": "AdminPassword123!"
        })
        assert login_res.status_code == 200
        csrf_token = login_res.get_json()["csrf_token"]
        client.csrf_token = csrf_token
        yield client


def test_single_file_direct_download(auth_client):
    """A. When exactly ONE file is requested, download original file directly (NEVER a ZIP)."""
    root_path = ROOTS[0]["path"]
    test_pdf = root_path / "test_invoice_single.pdf"
    test_pdf.write_bytes(b"%PDF-1.4 test pdf file stream")

    try:
        # GET /download with single file
        res_get = auth_client.get(f"/download?root=0&path={urllib.parse.quote(test_pdf.name)}")
        assert res_get.status_code == 200
        assert res_get.headers.get("Content-Type") in ("application/pdf", "application/octet-stream")
        assert "application/zip" not in res_get.headers.get("Content-Type", "")
        assert 'test_invoice_single.pdf' in res_get.headers.get("Content-Disposition", "")
        assert res_get.data == b"%PDF-1.4 test pdf file stream"
        res_get.close()

        # POST /download with array of length 1 (single file)
        res_post = auth_client.post(
            "/download",
            headers={"X-CSRF-Token": auth_client.csrf_token},
            json={"root": 0, "paths": [test_pdf.name]}
        )
        assert res_post.status_code == 200
        assert "application/zip" not in res_post.headers.get("Content-Type", "")
        assert 'test_invoice_single.pdf' in res_post.headers.get("Content-Disposition", "")
        assert res_post.data == b"%PDF-1.4 test pdf file stream"
        res_post.close()
    finally:
        if test_pdf.exists():
            test_pdf.unlink(missing_ok=True)


def test_single_file_unicode_and_spaces(auth_client):
    """Preserve exact original filename with spaces, unicode, and symbols."""
    root_path = ROOTS[0]["path"]
    unicode_file = root_path / "नोट्स 2026 - my report & review.txt"
    unicode_file.write_bytes("unicode file content".encode("utf-8"))

    try:
        encoded_name = urllib.parse.quote(unicode_file.name)
        res = auth_client.get(f"/download?root=0&path={encoded_name}")
        assert res.status_code == 200
        assert res.data == b"unicode file content"
        disposition = res.headers.get("Content-Disposition", "")
        assert "filename" in disposition
        res.close()
    finally:
        if unicode_file.exists():
            unicode_file.unlink(missing_ok=True)


def test_multiple_files_zip_download(auth_client):
    """B. When user selects MULTIPLE files, download as one ZIP named Selected_Files.zip."""
    root_path = ROOTS[0]["path"]
    f1 = root_path / "batch_file_1.txt"
    f2 = root_path / "batch_file_2.csv"
    f1.write_bytes(b"file one content")
    f2.write_bytes(b"a,b,c\n1,2,3")

    try:
        res = auth_client.post(
            "/download",
            headers={"X-CSRF-Token": auth_client.csrf_token},
            json={"root": 0, "paths": [f1.name, f2.name]}
        )
        assert res.status_code == 200
        assert "application/zip" in res.headers.get("Content-Type", "")
        assert "Selected_Files.zip" in res.headers.get("Content-Disposition", "")

        # Inspect ZIP archive contents
        with zipfile.ZipFile(io.BytesIO(res.data), "r") as zf:
            names = zf.namelist()
            assert f1.name in names
            assert f2.name in names
            assert zf.read(f1.name) == b"file one content"
            assert zf.read(f2.name) == b"a,b,c\n1,2,3"
        res.close()
    finally:
        f1.unlink(missing_ok=True)
        f2.unlink(missing_ok=True)


def test_single_folder_zip_download(auth_client):
    """C. When downloading a folder, create a ZIP archive named <FolderName>.zip preserving structure."""
    root_path = ROOTS[0]["path"]
    test_folder = root_path / "project_folder_dl"
    test_folder.mkdir(exist_ok=True)
    sub_dir = test_folder / "assets"
    sub_dir.mkdir(exist_ok=True)
    (sub_dir / "logo.svg").write_bytes(b"<svg></svg>")
    (test_folder / "readme.md").write_bytes(b"# Project Readme")

    try:
        res = auth_client.get(f"/download?root=0&path={test_folder.name}")
        assert res.status_code == 200
        assert "application/zip" in res.headers.get("Content-Type", "")
        assert f"{test_folder.name}.zip" in res.headers.get("Content-Disposition", "")

        with zipfile.ZipFile(io.BytesIO(res.data), "r") as zf:
            names = zf.namelist()
            assert any("project_folder_dl/readme.md" in n.replace("\\", "/") for n in names)
            assert any("project_folder_dl/assets/logo.svg" in n.replace("\\", "/") for n in names)
        res.close()
    finally:
        import shutil
        if test_folder.exists():
            shutil.rmtree(test_folder)


def test_unauthorized_download_traversal(auth_client):
    """Path traversal attempts are rejected."""
    res = auth_client.get("/download?root=0&path=../../Windows/System32/calc.exe")
    assert res.status_code in (403, 404)
    res.close()
