const organization = 'ngocttgdbt-093';
const repositories = ['robo-ai-office', 'pti093', 'pti', 'pti093db'];

const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

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
