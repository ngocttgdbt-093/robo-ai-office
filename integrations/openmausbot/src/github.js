// Public GitHub Actions feed. No GitHub access token, only explicitly configured public repository.
const ALLOWED = /^ngocttgdbt-093\/robo-ai-office$/;
export function workflowState(run) {
  if (run.status === 'completed') {
    if (run.conclusion === 'success') return 'completed';
    if (run.conclusion === 'action_required') return 'awaiting_approval';
    if (run.conclusion === 'cancelled' || run.conclusion === 'skipped') return 'unknown';
    return 'failed';
  }
  if (run.status === 'in_progress') return 'running';
  if (run.status === 'queued' || run.status === 'requested' || run.status === 'waiting' || run.status === 'pending') return 'queued';
  return 'unknown';
}
export function createGitHubFeed({ repository = 'ngocttgdbt-093/robo-ai-office', fetchImpl = fetch, ttlMs = 120000, clock = () => Date.now() } = {}) {
  if (!ALLOWED.test(repository)) throw new Error('Only the approved public pilot repository may be queried');
  let cached = null, fetchedAt = 0, pending = null;
  async function refresh() {
    const uri = `https://api.github.com/repos/${repository}/actions/runs?per_page=20`;
    const response = await fetchImpl(uri, {
      headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'robo-office-public-status-pilot' },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('upstream_unavailable');
    const body = await response.json();
    if (!Array.isArray(body.workflow_runs)) throw new Error('malformed_upstream');
    cached = body.workflow_runs.map(run => ({
      project: repository, agent: 'github-actions', state: workflowState(run),
      task: String(run.name || 'GitHub workflow').slice(0,160), source: 'github-public',
      runId: String(run.id || ''), updatedAt: run.updated_at || run.created_at || null,
      url: typeof run.html_url === 'string' && run.html_url.startsWith('https://github.com/') ? run.html_url : null
    })).slice(0,20);
    fetchedAt = clock();
  }
  return async () => {
    if (cached === null || clock() - fetchedAt >= ttlMs) {
      if (!pending) pending = refresh().finally(() => { pending = null; });
      try { await pending; } catch {
        return { source: 'github-public', verified: false, stale: cached !== null, updatedAt: cached === null ? null : new Date(fetchedAt).toISOString(), runs: cached || [], error: 'upstream_unavailable' };
      }
    }
    return { source: 'github-public', verified: true, stale: false, updatedAt: new Date(fetchedAt).toISOString(), runs: cached };
  };
}
