# Render Free pilot — operator instructions

**This deploys only the authenticated, ephemeral status bridge. NOT OpenMausBot / Codex / Superpowers.**

Blueprint: repository root `render.yaml` on `feature/openmausbot-status-bridge`.
- Node runtime, Singapore region, free plan.
- Automatic deploys disabled; manual deployment and change review required.
- Render generates `BRIDGE_TOKEN` as an environment secret. Do not share it or paste it in public or browser-side code.
- Public `GET /health` returns process health, **not** evidence of a live AI agent.
- `GET /api/status` and `POST /api/events` require a bearer secret. Do not connect these endpoints directly from an unauthenticated GitHub Pages client.
- No persistent data; statuses reset when the free service sleeps/restarts. Never infer 'active' from old events.
- Free Render web services sleep after 15 minutes idle and can cold-start; they are not a 24/7 Agent host.

## First deploy
1. Connect Render to GitHub by the official OAuth flow; grant permission only to `ngocttgdbt-093/robo-ai-office` if the option is offered.
2. From Render Dashboard choose **New > Blueprint**, select that repository and **feature/openmausbot-status-bridge**.
3. Review the resource plan. Confirm it says **Free** before applying. If Render does not show the free plan, cancel instead of entering payment details.
4. Inspect build and deploy logs; ensure the service is Live. Do not treat a deployment preview as live verification.
5. Access `https://<your-render-host>/health` and verify JSON with `ok: true`. Treat this as only HTTP health. API endpoints need an authorized server-to-server client.

## Requirements before actual ROBO AI OFFICE integration
- Add trusted runtime adapters and GitHub event capture, with replay protection, quotas, and event identity.
- Keep agent access keys in the trusted backend; do not bundle in 3D office frontend.
- Persist status in a supported store, report missing heartbeat as unknown/offline, and distinguish test records from live events.
- Provision separate persistent host for OpenMausBot itself; this free web service does not keep agents running.
