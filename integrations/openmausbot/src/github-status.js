const API = 'https://api.github.com/repos/ngocttgdbt-093/robo-ai-office';
const headers = { 'accept': 'application/vnd.github+json', 'user-agent': 'robo-ai-office-status-bridge', 'x-github-api-version': '2022-11-28' };
export async function getGitHubStatus(fetcher = fetch) {
  const urls = [`${API}/actions/runs?per_page=8`, `${API}/pulls?state=open&per_page=8`];
  const responses = await Promise.all(urls.map(url => fetcher(url, { headers, signal: AbortSignal.timeout(8000) })));
  if (responses.some(r => !r.ok)) throw new Error('GitHub status unavailable');
  const [runs, prs] = await Promise.all(responses.map(r => r.json()));
  const workflowRuns = (runs.workflow_runs || []).map(r => ({
    id: String(r.id), name: String(r.name || 'Workflow').slice(0,120), status: r.status,
    conclusion: r.conclusion || null, createdAt: r.created_at, updatedAt: r.updated_at,
    url: r.html_url
  }));
  const pullRequests = (Array.isArray(prs) ? prs : []).map(p => ({
    number: p.number, title: String(p.title || '').slice(0,160),
    draft: Boolean(p.draft), updatedAt: p.updated_at, url: p.html_url
  }));
  return {source:'public-github-api', repository:'ngocttgdbt-093/robo-ai-office',
    observedAt:new Date().toISOString(), agentRuntimeConnected:false,
    workflowRuns, pullRequests};
}
export function createGitHubStatusCache(fetcher = fetch, ttlMs = 60_000) {
 let last = null, until = 0, pending = null;
 return async () => {
  if(last && Date.now() < until) return last;
  if(pending) return pending;
  pending = getGitHubStatus(fetcher).then(data => {last = data; until = Date.now()+ttlMs; return data;}).finally(()=>{pending=null;});
  try { return await pending; } catch (error) {
   if(last) return {...last, stale:true, error:'upstream_unavailable'};
   throw error;
  }
 };
}
