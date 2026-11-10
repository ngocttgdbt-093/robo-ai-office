#!/usr/bin/env python3
"""Validate repository-scoped Agent Skills metadata and safety contract (stdlib only)."""
from pathlib import Path
import re
import sys

REQUIRED_SAFETY = (
    "Never push, merge, or deploy directly to production",
    "Never modify OmniRoute",
    "Never include secrets",
    "Do not claim a recurring automation",
)

def validate(skill_file: Path) -> list[str]:
    errors = []
    if not skill_file.is_file():
        return [f"Missing skill: {skill_file}"]
    body = skill_file.read_text(encoding="utf-8")
    match = re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n", body, re.S)
    if not match:
        return ["Missing YAML frontmatter delimited by ---"]
    metadata = {}
    for line in match.group(1).splitlines():
        if not line.strip():
            continue
        if ":" not in line:
            errors.append(f"Malformed frontmatter line: {line}")
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        if key in metadata:
            errors.append(f"Duplicate metadata key: {key}")
        metadata[key] = value.strip()
    name = metadata.get("name", "")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
        errors.append("Invalid skill name")
    if name != skill_file.parent.name:
        errors.append("Skill name must match directory name")
    description = metadata.get("description", "")
    if not description or len(description) > 1024:
        errors.append("Skill description must be non-empty and <= 1024 chars")
    if not body[match.end():].strip():
        errors.append("Skill has no instructions")
    for phrase in REQUIRED_SAFETY:
        if phrase not in body:
            errors.append(f"Missing safety rule: {phrase}")
    return errors

if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".agents/skills/robo-coding/SKILL.md")
    issues = validate(path)
    if issues:
        print("\n".join(f"FAIL: {issue}" for issue in issues))
        sys.exit(1)
    print(f"PASS: validated {path}")
