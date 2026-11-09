# Codex cloud onboarding — ROBO AI OFFICE

Status: **Not connected or verified**. This guide is a setup checklist, not proof of a working agent.

## 1. Connect a cloud coding agent
1. Open ChatGPT Codex / Codex web from an account with Codex access.
2. Authorize GitHub access to **only** `ngocttgdbt-093/robo-ai-office` initially. Avoid granting all repositories.
3. Select `ngocttgdbt-093/robo-ai-office` as the working repository.
4. Keep the default branch protected by workflow: all changes on feature branches, reviewed via PR.
5. Do not paste access tokens, passwords or private keys into chat.

## 2. Install Superpowers in the actual runtime
Follow the current official instructions at https://github.com/obra/superpowers for the selected agent.
The ChatGPT plugin connection and this repository's AGENTS.md are **not** equivalent to installing Superpowers in a coding runtime.

## 3. Live acceptance test
Prompt the connected coding agent:

> Read AGENTS.md and docs/rollout.md. Report which Superpowers skills are actually installed and accessible, with evidence. On a new feature branch, write a failing test for a tiny pure function (e.g. normalize a task status), implement the smallest passing solution, run tests, review the diff, and open a PR. Do not merge or deploy. Do not touch any PTI repository.

Acceptance criteria:
- [ ] Agent can read this repository.
- [ ] Official Superpowers skill activation is demonstrated, not assumed.
- [ ] Isolated branch and a new PR are visible.
- [ ] Test fails before implementation and passes afterward.
- [ ] CI passes and review is documented.
- [ ] No production repository was changed.

## 4. Next phase
Only after acceptance, consider orchestration, event ingestion, and a 3D activity dashboard. GitHub Actions is not a persistent agent host.
