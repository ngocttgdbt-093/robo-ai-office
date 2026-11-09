# Runbook: 24/7 OpenMausBot on a dedicated VPS

**Status:** NOT DEPLOYED. No VPS address, access method, domain, engine credentials or live acceptance evidence has been supplied. This document is a deployment plan, not a deployment receipt.

## Operating model

1. Provision a dedicated Ubuntu Linux VPS, at least 4 GB RAM (increase for concurrent browsers). Use SSH keys, a non-root operator, OS security updates, encrypted backups and monitoring.
2. Choose **one** official supported access mode. Recommended private access: official Tailscale mode with systemd (no public bot dashboard). Alternatively, official Docker Compose + Caddy and a domain. Do not invent a custom Docker entrypoint or forward the privileged harness on 8799 to the Internet.
3. Use the exact upstream repository and official deployment guide:
   - https://docs.openmausbot.com/docs/self-hosting/deploy-vps
   - https://docs.openmausbot.com/docs/self-hosting/networking
   - https://github.com/milind-soni/OpenMausBot
4. Pin a reviewed published version/image digest, not arbitrary unreviewed latest. Install the supported Codex CLI and authenticate as the SAME service user. Optional external provider charges require a budget and quotas.
5. For the Docker/domain path, execute from the VPS after DNS and access controls exist:
   ```bash
   git clone https://github.com/milind-soni/OpenMausBot.git
   cd OpenMausBot/deploy
   cp .env.example .env
   # Set the actual domain and required engines in .env; do not commit it.
   docker compose pull omb
   docker compose up -d
   docker compose ps
   ```
   Before production, review/pin the upstream image tag or digest in the compose configuration and verify the resulting image. Official deployment uses an on-disk volume and a restart policy.
6. Generate a one-time pairing code on the VPS as documented, pair approved devices, then revoke unused sessions. Do not send codes, API keys, tokens or private SSH keys through chat.
7. Configure the bridge as a separate private service, behind private connectivity and service-to-service authentication; it is NOT connected to the upstream OpenMausBot runtime automatically. Publish events only from trusted adapters. Do not put bridge bearer tokens in browser JavaScript.
8. Implement heartbeat timeout and persistence before claiming live/offline state accuracy in the 3D UI. Confirm explicit production repository allowlists and human approval gates before any cross-repository work.
9. Back up app data, CLI engine credentials, browser state and workspaces following upstream backup instructions, with consistent SQLite snapshots.

## Live acceptance checklist (all required)

- [ ] VPS ownership, access, charges and availability verified.
- [ ] Official release/version and dependency provenance verified.
- [ ] Process healthy after start and after a deliberate VPS reboot.
- [ ] Remote browser pairing works over a secure approved channel.
- [ ] Codex/other engine CLI authenticated and completes a harmless task.
- [ ] Superpowers installed in that actual runtime and recognized by a real agent.
- [ ] GitHub permissions restricted to pilot repository, no production writes.
- [ ] Signed/authenticated real status event reaches bridge and 3D display.
- [ ] Failure, restart, disconnected-agent, and awaiting-approval states render honestly.
- [ ] Logs and backups checked, monitoring/alerting tested.
- [ ] Rate limits/cost controls established.
- [ ] User confirms acceptance before enabling broader tasks.

## Cautions

Running a process continuously does not mean it works on projects autonomously. Scheduling, authorized event triggers, validated credentials, bounded task definitions and quota monitoring are independent components.

Do not publish 127.0.0.1:8799 harness API through NAT, Docker published ports, firewall exceptions, reverse proxy bypass or raw GitHub Pages. Use the documented pairing/security methods. Keep the 3D UI public read-only or require a suitable authenticated backend.
