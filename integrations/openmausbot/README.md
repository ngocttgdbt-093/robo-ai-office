# OpenMausBot — controlled pilot

Status: experimental adapter, not deployed (2026-11-10).

Upstream: https://github.com/milind-soni/OpenMausBot
Documentation: https://docs.openmausbot.com/docs/features/automation and https://docs.openmausbot.com/docs/self-hosting/networking

## Architecture
OpenMausBot runs in an isolated approved cloud machine or local computer. Its webhook receiver can trigger bot tasks, but **is not a documented outbound agent-status feed**. A trusted adapter must explicitly publish normalized status events to this bridge. An OpenMausBot health check alone is not proof that an agent is running. GitHub workflow status can be normalized by the helper function, but is NOT connected to any live webhook yet.

The bridge accepts authenticated POST /api/events and returns GET /api/status; GET /health needs no token. All agent states are bounded in memory (200 latest records) and are lost on restart. Node.js 20+ is required. This is an integration prototype, not a 24/7 production service.

## Tests / local run
From integrations/openmausbot run `npm test`. Set a random `BRIDGE_TOKEN` of at least 24 characters and run `npm start`. Default bind is 127.0.0.1:8788. Never use a browser-shipped token. POST with Authorization: Bearer <secret> and a JSON body, for example:

```json
{"project":"ngocttgdbt-093/robo-ai-office","agent":"coding-agent","state":"running","task":"Pilot test","source":"openmausbot","runId":"pilot-001"}
```

Allowed states: idle, queued, running, awaiting_approval, failed, completed, unknown.

## Hard security gates for cloud deployment
- Review and pin OpenMausBot version; isolate runtime, storage and app credentials.
- Do not expose OpenMausBot's harness API or this bridge directly to the public Internet. Use trusted HTTPS reverse proxy and access controls. Only expose dedicated webhook receiver when required.
- Add signed event authentication, replay protection, persistence, tenant authorization, audit trail, rate limiting, stale heartbeat and retry/idempotency before production.
- Connect the OpenMausBot task runner and GitHub event source by authenticated server-to-server adapters; never claim synthetic test data is real work.
- Verify obra/superpowers installation and activation in the actual agent runtime.
- Integrate authenticated status endpoint into 3D office and test every state including offline.
- Pilot only in robo-ai-office with narrowly scoped GitHub permissions. No push to PTI production repositories, no merge or deploy without explicit approval.

No cloud instance, OpenMausBot installation, secret, webhook or 3D status stream is provisioned by this PR. GitHub Actions is not an always-on runtime.
