# ROBO AI OFFICE

Private cloud-first foundation for coordinating coding agents, Superpowers workflows, CI verification and (later) a 3D office interface.

## Current state
This repository contains **policy and CI scaffolding only**. It does not yet run an AI agent, install Superpowers into a cloud coding environment, or provide a 24/7 service.

## Principles
- No dependency on an always-on personal PC.
- Work on isolated branches; review before merging.
- Protect PTI production repositories from unintended changes.
- Apply official Superpowers skills after runtime installation and live verification.
- Prefer GitHub Actions for bounded checks, not continuous background hosting.
- Keep credentials in provider secrets, never in Git.

See [AGENTS.md](AGENTS.md) and [rollout plan](docs/rollout.md).
