import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from graphify_drive_backup import make_archive, required_env

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
