# Agent Skills rollout — ROBO AI OFFICE

## Current installation scope
This repository includes a repo-scoped, instruction-only Skill at `.agents/skills/robo-coding/SKILL.md`. Codex can discover it when opened from this repository in a supported environment. This commit does **not** install the Skill into a user's other repositories, a local computer, ChatGPT Work, or a cloud runtime.

## Reuse across projects
After reviewing the Skill, install a copy into `$HOME/.agents/skills/robo-coding/` in the target Codex environment for user-wide discovery, or copy it into each approved repository's `.agents/skills/robo-coding/`. Do not overwrite an existing Skill with the same name. Check project-specific `AGENTS.md` first. Shared instruction files do not grant permission to access other repositories.

## Validation and acceptance
1. Validate YAML frontmatter has `name` and `description`; ensure the directory name matches `name` and neither has invalid characters.
2. Launch supported Codex in a checkout of this branch and verify `robo-coding` appears via `/skills` or is selected implicitly for a safe coding task.
3. Confirm non-coding prompts do not trigger the Skill and a production-write request still requires explicit permission.
4. Run a small test-driven change on a disposable branch and record evidence of RED, GREEN, regression tests and review.
5. Request review; merge only with explicit approval. Then consider user-wide installation on each approved machine/runtime.

## Not included
No scheduled triggers, GitHub Actions changes, external network calls, secrets, autonomous agents, Superpowers installation, Ponytail installation, Graphify installation, or production deployment.

## Important distinction
Skills allow automatic selection within an already running ChatGPT/Codex task; they cannot initiate work on their own. Unattended tasks need a separate supported scheduler/runner with access, approval policy, monitoring and logging.
