# ROBO AI OFFICE 3D

Private cloud test release for the nine-room office. The server runs one read-only Agent task: inspect up to five commits from a selected public GitHub project. The owner’s run history is stored in D1. The GitHub feed and the Agent's execution state are separate.

- `npm test` runs Runtime tests against a disposable SQLite database.
- `npm run dev` opens the local preview with a disposable database and a local-only identity.
- `npm run build` bundles the UI and Runtime as a Sites Worker.

The test deployment is separate from production GitHub Pages. GitHub reads are limited to the four public repositories configured in `runtime.mjs`.

## Work activity

The owner-private test Site accepts task checkpoints at `POST /api/work`.
A connected Work publisher sends an ID, title, stage, status, sequence, agent name and optional skill names and project name. The server preserves order and rejects writes without its bridge secret. Use the site's service authorization in addition to the bridge key when publishing to the hosted private Site. Keep both values server-side. The interface polls accepted checkpoints and shows the associated office zone, handover and central display. The illustrated code and test rows contain no source or live terminal output.

### Publish activity from a scoped Codex run

Run Node.js 24+ and an authenticated Codex CLI from the intended checkout.
Set `ROBO_OFFICE_URL` and `ROBO_WORK_BRIDGE_SECRET` in the publisher environment.
For a private hosted Site, also set `ROBO_SITES_AUTH` to its service credential.
Apply the Drizzle migrations, including `0003_work_activity`, before serving the new Worker.

```sh
node --use-env-proxy scripts/codex-activity.mjs 'Run the regression suite' 'ROBO AI OFFICE' < prompt.txt
```

The publisher starts a scoped `codex exec --json --ephemeral` run. It sends fixed
activity labels derived from lifecycle, file-change and command exit events.
A failed test stays visible in the recent timeline while the task continues.
The dashboard stops showing the run as active if its heartbeat goes stale.
Only runs started through this publisher are tracked. The publisher does not
forward raw prompts, replies, commands, stdout or credentials to the dashboard.

### Local live acceptance

From this checkout, with Node.js 24+ and the Codex CLI signed in:

```sh
node scripts/verify-codex-live.mjs
```

Open the printed local monitor URL before pressing Enter. The script creates
a loopback-only monitor, then starts a read-only Codex task that requests a
failing test followed by a passing test. The final check reads the monitor's
API and requires both test results in order plus a completed turn.
The monitor uses temporary storage and closes after two minutes or on Ctrl+C.
