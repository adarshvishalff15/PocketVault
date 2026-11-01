"""Tests for media streaming range requests and document preview parsers."""

import pytest
import tempfile
import zipfile
import csv
from pathlib import Path
from config import ROOTS
from preview_manager import (
    get_stream_response, inspect_zip_archive, parse_docx,
    parse_pptx, parse_spreadsheet, read_text_preview, get_file_checksum
)
from app import app


def test_zip_archive_safe_inspection():
    with tempfile.TemporaryDirectory() as tmpdir:
        zip_path = Path(tmpdir) / "test_archive.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("folder1/hello.txt", "Hello World inside zip")
            zf.writestr("data.csv", "a,b,c\n1,2,3")

        data = inspect_zip_archive(zip_path)
        assert data["success"] is True
        assert data["total_entries"] == 2
        names = [e["name"] for e in data["entries"]]
        assert "folder1/hello.txt" in names
        assert "data.csv" in names


def test_spreadsheet_csv_preview():
    with tempfile.TemporaryDirectory() as tmpdir:
        csv_path = Path(tmpdir) / "test.csv"
        csv_path.write_text("Name,Age,Role\nAlice,30,Engineer\nBob,25,Designer\n", encoding="utf-8")

        data = parse_spreadsheet(csv_path)
        assert data["success"] is True
        assert data["headers"] == ["Name", "Age", "Role"]
        assert len(data["rows"]) == 2
        assert data["rows"][0] == ["Alice", "30", "Engineer"]


def test_text_preview_and_encoding():
    with tempfile.TemporaryDirectory() as tmpdir:
        txt_path = Path(tmpdir) / "code.py"
        txt_path.write_text("def hello():\n    return 'world'\n", encoding="utf-8")

        data = read_text_preview(txt_path)
        assert data["success"] is True
        assert data["total_lines"] == 2
        assert "def hello():" in data["content"]


def test_checksum_calculation():
    with tempfile.TemporaryDirectory() as tmpdir:
        f_path = Path(tmpdir) / "sample.bin"
        f_path.write_bytes(b"antigravity test stream data")

        data = get_file_checksum(f_path)
        assert data["success"] is True
        assert len(data["sha256"]) == 64
        assert data["size"] == len(b"antigravity test stream data")


def test_byte_range_streaming_endpoint():
    root_path = ROOTS[0]["path"]
    media_file = root_path / "test_stream_media.mp4"
    media_file.write_bytes(b"0123456789" * 20)  # 200 bytes

    try:
        with app.test_client() as client:
            with app.app_context():
                from auth import create_user
                create_user("stream_user", "pass12345", role="admin")

            login_res = client.post("/api/auth/login", json={"username": "stream_user", "password": "pass12345"})
            assert login_res.status_code == 200

            res = client.get(f"/stream?root=0&path={media_file.name}", headers={"Range": "bytes=0-49"})
            assert res.status_code == 206
            assert "Content-Range" in res.headers
            assert res.headers["Content-Range"].startswith("bytes 0-49/")
            assert res.headers["Accept-Ranges"] == "bytes"
            assert len(res.data) == 50
            res.close()
    finally:
        media_file.unlink(missing_ok=True)
