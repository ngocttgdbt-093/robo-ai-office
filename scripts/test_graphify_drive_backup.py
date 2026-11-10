import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from graphify_drive_backup import make_archive, required_env, upload

class GraphifyBackupTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.graph = Path(self.tmp.name)
        self.sha = "a" * 40

    def test_valid_graph_archive(self):
        (self.graph / "graph.json").write_text('{"nodes":[]}', encoding="utf-8")
        data, name = make_archive(self.graph, self.sha)
        self.assertTrue(data.startswith(b"PK"))
        self.assertIn("aaaaaaaaaaaa", name)

    def test_upload_download_round_trip(self):
        (self.graph / "graph.json").write_text('{"nodes":[]}', encoding="utf-8")
        data, name = make_archive(self.graph, self.sha)
        folder_id = "test-folder-id"
        file_id = "test-file-id"
        env = {
            "GRAPHIFY_DRIVE_FOLDER_ID": folder_id,
            "GOOGLE_OAUTH_CLIENT_ID": "example",
            "GOOGLE_OAUTH_CLIENT_SECRET": "example",
            "GOOGLE_OAUTH_REFRESH_TOKEN": "example",
        }
        for downloaded in (data, data[:-1]):
            with self.subTest(matches=downloaded == data):
                responses = [
                    io.BytesIO(b'{"access_token":"example"}'),
                    io.BytesIO(json.dumps({
                        "id": file_id, "name": name, "parents": [folder_id],
                    }).encode()),
                    io.BytesIO(downloaded),
                ]
                with patch.dict(os.environ, env), patch(
                    "graphify_drive_backup.urllib.request.urlopen", side_effect=responses
                ) as open_url:
                    if downloaded == data:
                        self.assertTrue(upload(data, name)["folder_verified"])
                    else:
                        with self.assertRaisesRegex(ValueError, "SHA256"):
                            upload(data, name)
                    self.assertEqual(open_url.call_count, 3)
                    request = open_url.call_args.args[0]
                    self.assertEqual(request.get_method(), "GET")
                    self.assertIn(f"/files/{file_id}?alt=media", request.full_url)

    def test_missing_graph_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "graph.json"):
            make_archive(self.graph, self.sha)

    def test_wrong_commit_fails_closed(self):
        (self.graph / "graph.json").write_text("{}")
        with self.assertRaisesRegex(ValueError, "SHA"):
            make_archive(self.graph, "main")

    def test_oversized_graph_fails_closed(self):
        (self.graph / "graph.json").write_bytes(b"x" * (20 * 1024 * 1024 + 1))
        with self.assertRaisesRegex(ValueError, "oversized"):
            make_archive(self.graph, self.sha)

    def test_missing_secret_fails_closed(self):
        with patch.dict(os.environ, {"GRAPHIFY_DRIVE_FOLDER_ID": ""}):
            with self.assertRaisesRegex(ValueError, "missing"):
                required_env("GRAPHIFY_DRIVE_FOLDER_ID")

if __name__ == "__main__":
    unittest.main()
