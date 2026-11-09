const organization = 'ngocttgdbt-093';
const repositories = ['robo-ai-office', 'pti093', 'pti', 'pti093db'];

const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

const workPhases = ['planning', 'implementation', 'verification'];
const workStatuses = ['running', 'completed', 'failed'];

async function workEvents(request, env) {
  const key = request.headers.get('X-Robo-Bridge');
  const bridge = Boolean(key && env.ROBO_WORK_BRIDGE_SECRET && key === env.ROBO_WORK_BRIDGE_SECRET);
  const owner = request.headers.get('oai-authenticated-user-id');
  if (!(bridge || (owner && request.method === 'GET'))) return json({ error: 'Chưa có quyền truy cập trạng thái Work.' }, 401);
  const sql = (query, ...args) => env.DB.prepare(query).bind(...args);
  try {
    if (request.method === 'GET') {
      const { results } = await sql(`SELECT w.id, w.title, w.phase, w.previous, w.status, w.updated, w.agent, w.skills, w.project,
        (SELECT first.updated FROM work_events first WHERE first.id = w.id AND first.seq =
          1 + coalesce((SELECT max(prior.seq) FROM work_events prior
            WHERE prior.id = w.id AND prior.seq < w.seq AND prior.phase <> w.phase), 0)) AS phase_started
        FROM work_events w WHERE NOT EXISTS (
          SELECT 1 FROM work_events next WHERE next.id = w.id AND next.seq > w.seq
        ) ORDER BY w.updated DESC, w.seq DESC LIMIT 20`).all();
      return json(results.map(event => ({ ...event, skills: JSON.parse(event.skills) })));
    }
    if (request.method !== 'POST') return json({ error: 'Phương thức không hỗ trợ.' }, 405);
    if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') return json({ error: 'Định dạng không hỗ trợ.' }, 415);
    const body = await request.text();
    if (body.length > 1024) return json({ error: 'Yêu cầu quá lớn.' }, 413);
    const { id, title, phase, status, seq, agent, skills = [], project = null } = JSON.parse(body) ?? {};
    if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id) ||
        typeof title !== 'string' || !title.trim() || title.length > 120 ||
        typeof agent !== 'string' || !agent.trim() || agent.length > 40 ||
        (project !== null && (typeof project !== 'string' || !project.trim() || project.length > 100)) ||
        !Array.isArray(skills) || skills.length > 5 ||
        skills.some(skill => typeof skill !== 'string' || !skill.trim() || skill.length > 48) ||
        !workPhases.includes(phase) || !workStatuses.includes(status) ||
        !Number.isSafeInteger(seq) || seq < 1) return json({ error: 'Sự kiện không hợp lệ.' }, 400);

    const result = await sql(`INSERT INTO work_events (id, seq, title, phase, previous, status, updated, agent, skills, project)
      SELECT ?, ?, ?, ?, CASE WHEN prior.phase <> ? THEN prior.phase ELSE prior.previous END, ?, ?, ?, ?, coalesce(?, prior.project)
      FROM (SELECT 1) seed LEFT JOIN work_events prior ON prior.id = ?
        AND prior.seq = (SELECT max(seq) FROM work_events WHERE id = ?)
      WHERE (prior.id IS NULL AND ? = 1 AND ? = 'running')
         OR (prior.status = 'running' AND prior.seq + 1 = ?)`,
      id, seq, title.trim(), phase, phase, status, new Date().toISOString(), agent.trim(), JSON.stringify([...new Set(skills.map(skill => skill.trim()))]), project?.trim() ?? null, id, id, seq, status, seq).run();
    return (result.meta?.changes ?? result.changes) === 1
      ? json({ accepted: true }) : json({ error: 'Sự kiện đã được ghi hoặc sai thứ tự.' }, 409);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Nội dung yêu cầu không hợp lệ.' }, 400);
    console.error('Work events storage operation failed', error);
    return json({ error: 'Kho trạng thái Work tạm thời không khả dụng.' }, 503);
  }
}

export function createRuntime(upstream = fetch) {
  async function commits(repo, count) {
    const response = await upstream(`https://api.github.com/repos/${organization}/${repo}/commits?per_page=${count}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Robo-AI-Office' },
      signal: AbortSignal.timeout(8500),
    });
    if (!response.ok) throw new Error('GitHub HTTP ' + response.status);
    return (await response.json()).map(item => ({
      sha: item.sha,
      title: item.commit.message.split('\n')[0].slice(0, 220),
      date: item.commit.committer.date,
      url: `https://github.com/${organization}/${repo}/commit/${encodeURIComponent(item.sha)}`,
    }));
  }

  const sourceError = error => /^GitHub HTTP \d+$/.test(error.message)
    ? error.message : 'Không nhận được dữ liệu GitHub hợp lệ trong thời hạn.';

  return async function runtime(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/work') return workEvents(request, env);
    if (request.method === 'GET' && url.pathname === '/api/health') {
      const [storage, github] = await Promise.allSettled([
        Promise.resolve().then(() => env.DB.prepare('SELECT id FROM agent_runs LIMIT 0').bind().all()),
        commits('robo-ai-office', 1),
      ]);
      const health = { storage: storage.status === 'fulfilled', github: github.status === 'fulfilled' };
      return json(health, health.storage && health.github ? 200 : 503);
    }
    const owner = request.headers.get('oai-authenticated-user-id');
    if (!owner) return json({ error: 'Cần đăng nhập để truy cập Agent Runtime.' }, 401);
    if (request.method === 'GET' && url.pathname === '/api/ci') {
      try {
        const repo = 'robo-ai-office';
        const base = `https://api.github.com/repos/${organization}/${repo}/actions/runs`;
        const response = await upstream(base + '?per_page=12', {
          headers: { Accept:'application/vnd.github+json', 'User-Agent':'Robo-AI-Office' },
          signal: AbortSignal.timeout(8500),
        });
        if (!response.ok) throw new Error('GitHub HTTP ' + response.status);
        const { workflow_runs } = await response.json();
        return json(workflow_runs.filter(run => Number.isSafeInteger(run.id)).map(run => ({
          id:run.id, name:run.name, status:run.status, conclusion:run.conclusion, updated:run.updated_at,
          url:`https://github.com/${organization}/${repo}/actions/runs/${run.id}`,
        })));
      } catch (error) {
        return json({error:sourceError(error)}, 503);
      }
    }
    if (request.method === 'GET' && url.pathname === '/api/projects') {
      const projects = await Promise.all(repositories.map(async repo => {
        try {
          return { repo, commit: (await commits(repo, 1))[0] ?? null };
        } catch (error) {
          return { repo, error: sourceError(error) };
        }
      }));
      return json(projects);
    }
    if (url.pathname !== '/api/runs') return json({ error: 'Không tìm thấy.' }, 404);
    if (!env.DB) return json({ error: 'Kho lịch sử Agent chưa khả dụng.' }, 503);

    try {
      const sql = (query, ...args) => env.DB.prepare(query).bind(...args);
      if (request.method === 'GET') {
        const cutoff = new Date(Date.now() - 60_000).toISOString();
        await sql("UPDATE agent_runs SET status = 'failed', finished = ?, error = ? WHERE owner = ? AND status = 'running' AND started < ?",
          new Date().toISOString(), 'Lần chạy bị gián đoạn.', owner, cutoff).run();
        const { results } = await sql('SELECT id, repo, status, started, finished, result, error FROM agent_runs WHERE owner = ? ORDER BY started DESC, id DESC LIMIT 25', owner).all();
        return json(results.map(run => ({ ...run, result: JSON.parse(run.result) })));
      }
      if (request.method !== 'POST') return json({ error: 'Phương thức không hỗ trợ.' }, 405);
      if (request.headers.get('Origin') !== url.origin) return json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403);
      if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') return json({ error: 'Định dạng không hỗ trợ.' }, 415);
      const body = await request.text();
      if (body.length > 512) return json({ error: 'Yêu cầu quá lớn.' }, 413);
      const { repo } = JSON.parse(body) ?? {};
      if (!repositories.includes(repo)) return json({ error: 'Dự án chưa được phép truy xuất.' }, 400);

      const id = crypto.randomUUID();
      const started = new Date().toISOString();
      const inserted = await sql(`INSERT INTO agent_runs (id, owner, repo, status, started)
        SELECT ?, ?, ?, 'running', ? WHERE NOT EXISTS (
          SELECT 1 FROM agent_runs WHERE owner = ? AND status = 'running' AND started >= ?
        )`, id, owner, repo, started, owner, new Date(Date.now() - 60_000).toISOString()).run();
      if ((inserted.meta?.changes ?? inserted.changes) === 0) return json({ error: 'Agent đang chạy. Vui lòng đợi lần chạy hiện tại.' }, 409);

      let result = null;
      let error = null;
      try {
        result = await commits(repo, 5);
      } catch (failure) {
        error = sourceError(failure);
      }
      const status = error ? 'failed' : 'completed';
      const finished = new Date().toISOString();
      await sql('UPDATE agent_runs SET status = ?, finished = ?, result = ?, error = ? WHERE id = ?', status, finished, result && JSON.stringify(result), error, id).run();
      return json({ id, repo, status, started, finished, result, error }, 201);
    } catch (error) {
      if (error instanceof SyntaxError && request.method === 'POST') return json({ error: 'Nội dung yêu cầu không hợp lệ.' }, 400);
      console.error('Agent Runtime storage operation failed', error);
      return json({ error: 'Kho lịch sử Agent tạm thời không khả dụng.' }, 503);
    }
  };
}

export default createRuntime();
