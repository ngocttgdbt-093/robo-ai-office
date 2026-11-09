# ROBO AI OFFICE 3D

Private cloud test release for the nine-room office. The server runs one read-only Agent task: inspect up to five commits from a selected public GitHub project. The owner’s run history is stored in D1. The GitHub feed and the Agent's execution state are separate.

- `npm test` runs Runtime tests against a disposable SQLite database.
- `npm run dev` opens the local preview with a disposable database and a local-only identity.
- `npm run build` bundles the UI and Runtime as a Sites Worker.

The test deployment is separate from production GitHub Pages. GitHub reads are limited to the four public repositories configured in `runtime.mjs`.
