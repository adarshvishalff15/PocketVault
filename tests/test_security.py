"""Tests for security, path traversal prevention, CSRF, and rate limiting."""

import pytest
import os
import tempfile
from pathlib import Path
from security import (
    is_within_root, safe_resolve_path, sanitize_filename,
    check_rate_limit, record_login_failure, reset_login_attempts
)

def test_sanitize_filename():
    assert sanitize_filename("test.txt") == "test.txt"
    assert sanitize_filename("../test.txt") == "test.txt"
    assert sanitize_filename("..\\..\\secret.pass") == "secret.pass"
    assert sanitize_filename("file<with>bad:chars?.mp4") == "file_with_bad_chars_.mp4"
    # Windows reserved names
    assert sanitize_filename("CON.txt") == "file_CON.txt"
    assert sanitize_filename("aux.pdf") == "file_aux.pdf"
    assert sanitize_filename("NUL") == "file_NUL"


def test_path_traversal_prevention():
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir).resolve()
        sub = root / "allowed_subfolder"
        sub.mkdir()
        allowed_file = sub / "doc.txt"
        allowed_file.write_text("safe content")

        # Safe access inside root
        resolved = safe_resolve_path(root, "allowed_subfolder/doc.txt")
        assert resolved.exists()
        assert is_within_root(root, resolved)

        # Traversal attempt with ../ escaping root
        with pytest.raises(PermissionError):
            safe_resolve_path(root, "../outside.txt")

        with pytest.raises(PermissionError):
            safe_resolve_path(root, "..\\..\\windows\\system32")

        # Absolute path outside root
        with pytest.raises(PermissionError):
            safe_resolve_path(root, "C:\\Windows\\System32")


def test_rate_limiting_lockout():
    test_ip = "192.168.1.99"
    reset_login_attempts(test_ip)

    # Initial state: not locked
    locked, _ = check_rate_limit(test_ip)
    assert not locked

    # Record 5 failures
    for _ in range(5):
        record_login_failure(test_ip)

    # Should now be locked out
    locked, remaining = check_rate_limit(test_ip)
    assert locked
    assert remaining > 0

    # Reset
    reset_login_attempts(test_ip)
    locked, _ = check_rate_limit(test_ip)
    assert not locked
