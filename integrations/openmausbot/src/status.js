export const STATES = Object.freeze(['idle','queued','running','awaiting_approval','failed','completed','unknown']);
const STATE_SET = new Set(STATES);
export function normalizeEvent(input, now = new Date().toISOString()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Event must be an object');
  const { project, agent, state, task, source, runId } = input;
  for (const [key, value] of Object.entries({ project, agent, state, task, source })) {
    if (typeof value !== 'string' || !value.trim() || value.length > 160) throw new TypeError(`Invalid ${key}`);
  }
  if (!STATE_SET.has(state)) throw new TypeError('Unsupported state');
  if (runId !== undefined && (typeof runId !== 'string' || runId.length > 160)) throw new TypeError('Invalid runId');
  return { project, agent, state, task, source, ...(runId ? { runId } : {}), updatedAt: now };
}
export function createStatusStore(capacity = 200) {
  const records = new Map();
  return {
    update(event) {
      const key = `${event.project}\u0000${event.agent}`;
      records.delete(key);
      records.set(key, event);
      if (records.size > capacity) records.delete(records.keys().next().value);
      return event;
    },
    list() { return [...records.values()]; }
  };
}
export function normalizeGitHubWorkflow(payload) {
  const run = payload?.workflow_run;
  if (!run || typeof run !== 'object') throw new TypeError('Missing workflow_run');
  const repo = payload?.repository?.full_name;
  if (typeof repo !== 'string') throw new TypeError('Missing repository');
  const state = run.status === 'completed'
    ? (run.conclusion === 'success' ? 'completed' : run.conclusion === 'action_required' ? 'awaiting_approval' : 'failed')
    : run.status === 'in_progress' ? 'running' : 'queued';
  return normalizeEvent({ project: repo, agent: 'github-actions', state, task: String(run.name || 'workflow').slice(0,160), source: 'github', runId: String(run.id || '') });
}
