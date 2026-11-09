# GitHub activity observer (phase 1)

The observer is read-only and intentionally restricted to `ngocttgdbt-093/robo-ai-office`.
It retrieves open PRs and recent GitHub Actions runs, then stores a JSON snapshot as a 7-day Actions artifact.
It does **not** call Codex, read ChatGPT conversations, dispatch AutoGPT, modify other repositories, or power the 3D UI.

## Safety and availability
- Uses GitHub Actions' scoped `GITHUB_TOKEN` with read permissions only.
- Does not require a continuously running personal PC.
- The hourly schedule is **not active until this workflow exists on the default branch**. It may run later than the nominal cron time.
- Manual `workflow_dispatch` is also available once GitHub recognizes the workflow on the default branch.
- No tokens are printed or stored in the snapshot.
- Other projects require separate, explicit read-only integration and authorization.

## Acceptance
1. Review PR and workflow permissions.
2. Merge only after approval.
3. Run workflow manually and inspect `robo-github-activity` artifact.
4. Verify the JSON reflects actual PRs and Actions runs.
5. Only then connect this output to the office dashboard and expand event sources.
