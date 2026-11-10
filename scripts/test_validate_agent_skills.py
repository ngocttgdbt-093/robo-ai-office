"""Positive and negative checks for the Agent Skills validator."""
import tempfile
from pathlib import Path
import unittest

from validate_agent_skills import validate

VALID = """---
name: robo-coding
description: Scoped coding assistant
---
# Test
Never push, merge, or deploy directly to production
Never modify OmniRoute
Never include secrets
Do not claim a recurring automation
"""

class TestSkillValidator(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        directory = Path(self.tmp.name) / "robo-coding"
        directory.mkdir()
        self.file = directory / "SKILL.md"

    def test_valid_skill(self):
        self.file.write_text(VALID, encoding="utf-8")
        self.assertEqual(validate(self.file), [])

    def test_missing_skill(self):
        self.assertTrue(validate(self.file))

    def test_missing_frontmatter(self):
        self.file.write_text("# No metadata", encoding="utf-8")
        self.assertTrue(any("frontmatter" in e for e in validate(self.file)))

    def test_mismatched_directory(self):
        self.file.write_text(VALID.replace("robo-coding", "other-skill"), encoding="utf-8")
        self.assertTrue(any("directory" in e for e in validate(self.file)))

    def test_missing_safety_rule(self):
        self.file.write_text(VALID.replace("Never modify OmniRoute", ""), encoding="utf-8")
        self.assertTrue(any("safety rule" in e for e in validate(self.file)))

    def test_empty_description(self):
        self.file.write_text(VALID.replace("description: Scoped coding assistant", "description:"), encoding="utf-8")
        self.assertTrue(any("description" in e for e in validate(self.file)))

if __name__ == "__main__":
    unittest.main()
