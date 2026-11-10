# Graphify Local → Google Drive backup (pilot)

Status: **pilot, not production-active**. This repository is public. Do not feed customer/claims information, credentials, or private files into Graphify or its artifacts.

## Architecture
- GitHub Actions builds the code graph with `graphifyy` and `graphify update .` (no VPS and no persistent background server).
- Pull requests and pushes to main can produce a short-lived (7-day) CI artifact.
- Google Drive upload is intentionally **manual opt-in** via `workflow_dispatch → upload_to_drive=true` until the first successful verified export and owner approval for automatic uploads.
- A ZIP contains `graph.json`, optional `GRAPH_REPORT.md`, optional `graph.html`, and a SHA256 manifest. Uploads are versioned by Git commit; existing files are not overwritten.
- Google Drive is backup storage, not a continuously running MCP server.

## Credential setup (NOT in Git)
Create an OAuth client in Google Cloud with the Google Drive API enabled; use a consented OAuth refresh token with the minimum feasible Drive scope (ideally `drive.file` for files created by the app). Record secrets in repository Settings → Secrets and variables → Actions:
`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`, `GRAPHIFY_DRIVE_FOLDER_ID`.
Use an OAuth user authorized to write to the chosen Drive folder; the existing ChatGPT Drive connector does not authorize GitHub Actions. Never place credentials in Git issues, PRs, Markdown, or messages.

Note: With `drive.file`, access to a pre-created folder may require the app to be granted access through a supported picker/consent flow. Validate the folder access during a manual pilot; do not silently broaden OAuth scopes. Alternatively, use an app-created folder.

## Acceptance gates
1. Pull-request workflow passes Python regression tests and produces `graphify-out/graph.json`.
2. Review output size/content for sensitive data.
3. Provision secrets outside GitHub source and run manual dispatch with upload enabled.
4. Confirm the returned ZIP exists in the correct Google Drive folder and can be downloaded/reconstructed.
5. Only then approve an automatic upload trigger or a cross-project rollout. No auto-delete policy is enabled in the pilot.

## Security and operational limitations
- Only process repositories for which access is expressly authorized. This pilot analyzes this repository only.
- Graphify dependencies are third-party supply-chain code; pin a verified version/hash before production scheduling.
- PRs and ordinary push events **do not** upload to Google Drive.
- Do not log OAuth tokens or graph contents; failure should stop uploads rather than fall back to a different folder.
- No changes to OmniRoute, Codex global config, existing Agent Skills or protected production repositories.
