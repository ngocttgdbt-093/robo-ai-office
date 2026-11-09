# ROBO AI OFFICE 3D

Private cloud test release for the nine-room office. The server runs one read-only Agent task: inspect up to five commits from a selected public GitHub project. The owner’s run history is stored in D1. The GitHub feed and the Agent's execution state are separate.

- `npm test` runs Runtime tests against a disposable SQLite database.
- `npm run dev` opens the local preview with a disposable database and a local-only identity.
- `npm run build` bundles the UI and Runtime as a Sites Worker.

The test deployment is separate from production GitHub Pages. GitHub reads are limited to the four public repositories configured in `runtime.mjs`.

## Work activity

The owner-private test Site accepts task checkpoints at `POST /api/work`.
A connected Work publisher sends an ID, title, stage, status, sequence, agent name and optional skill names. The server preserves order and rejects writes without its bridge secret. Use the site's service authorization in addition to the bridge key when publishing to the hosted private Site. Keep both values server-side. The interface polls accepted checkpoints and shows the associated office zone, handover and central display. The illustrated code and test rows contain no source or live terminal output.
