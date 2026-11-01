"""Verification test suite for PocketVault Mobile Personal File Server.

Tests:
1. Default Port 8288 configuration.
2. Read-Only v1.0 enforcement on modification endpoints.
3. Android / Host storage discovery.
4. Wallpaper and installed apps APIs.
"""

from pathlib import Path
import json
import os
import sys
import unittest

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import config
from app import app


class TestPocketVault(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_default_port(self):
        """Verify default port is 8288."""
        self.assertEqual(config.PORT, 8288)

    def test_readonly_upload_blocked(self):
        """Verify file upload is rejected in Read-Only v1.0."""
        res = self.client.post("/api/upload")
        self.assertEqual(res.status_code, 403)
        data = res.get_json()
        self.assertIn("READ-ONLY", data["error"])

    def test_readonly_delete_blocked(self):
        """Verify deletion is rejected in Read-Only v1.0."""
        res = self.client.post("/api/delete")
        self.assertEqual(res.status_code, 403)
        data = res.get_json()
        self.assertIn("READ-ONLY", data["error"])

    def test_readonly_rename_blocked(self):
        """Verify renaming is rejected in Read-Only v1.0."""
        res = self.client.post("/api/rename")
        self.assertEqual(res.status_code, 403)
        data = res.get_json()
        self.assertIn("READ-ONLY", data["error"])

    def test_readonly_mkdir_blocked(self):
        """Verify folder creation is rejected in Read-Only v1.0."""
        res = self.client.post("/api/folder")
        self.assertEqual(res.status_code, 403)
        data = res.get_json()
        self.assertIn("READ-ONLY", data["error"])

    def test_wallpaper_current_api(self):
        """Verify wallpaper API returns valid styling."""
        res = self.client.get("/api/wallpaper/current")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("wallpaper", data)

    def test_roots_discovery(self):
        """Verify safe storage roots are discovered."""
        roots = config.get_roots()
        self.assertGreater(len(roots), 0)
        self.assertTrue(all("id" in r and "path" in r for r in roots))


if __name__ == "__main__":
    unittest.main()

