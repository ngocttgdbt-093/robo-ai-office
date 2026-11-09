import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createRuntime } from '../runtime.mjs';

function setup(upstream = async () => Response.json([{
  sha: 'abc1234', html_url: 'https://github.com/ngocttgdbt-093/pti/commit/abc1234',
  commit: { message: 'real result', committer: { date: '2026-11-09T01:00:00Z' } },
}])) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0000_runs.sql', import.meta.url), 'utf8'));
  const DB = { prepare(sql) {
    return { bind(...args) {
      const statement = db.prepare(sql);
      return { run: async () => statement.run(...args), all: async () => ({ results: statement.all(...args) }) };
    } };
  } };
  const runtime = createRuntime(upstream);
  return (path, options = {}, authenticated = true) => runtime(new Request('https://office.test/api/' + path, {
    ...options,
    headers: { ...(authenticated ? { 'oai-authenticated-user-id': 'test-owner' } : {}), ...options.headers },
  }), { DB });
}

test('requires identity and rejects cross-origin writes and unknown repositories', async () => {
  const request = setup();
  assert.equal((await request('runs', {}, false)).status, 401);
  const options = { method: 'POST', headers: { Origin: 'https://elsewhere.test', 'Content-Type': 'application/json' }, body: '{"repo":"pti"}' };
  assert.equal((await request('runs', options)).status, 403);
  options.headers.Origin = 'https://office.test';
  options.body = '{"repo":"other/private"}';
  assert.equal((await request('runs', options)).status, 400);
});

test('records actual GitHub audit and persists the result', async () => {
  const request = setup(async url => {
    assert.match(url, /api\.github\.com\/repos\/ngocttgdbt-093\/pti\/commits/);
    return Response.json([{ sha: 'abc1234', commit: { message: 'live commit', committer: { date: '2026-11-09T01:00:00Z' } } }]);
  });
  const result = await request('runs', { method: 'POST', headers: { Origin: 'https://office.test', 'Content-Type': 'application/json' }, body: '{"repo":"pti"}' });
  assert.equal(result.status, 201);
  const [run] = await (await request('runs')).json();
  assert.equal(run.status, 'completed');
  assert.equal(run.result[0].title, 'live commit');
  const isolated = await request('runs', { headers: { 'oai-authenticated-user-id': 'other' } });
  assert.deepEqual(await isolated.json(), []);
});

test('records source failure without inventing results', async () => {
  const request = setup(async () => new Response('', { status: 429 }));
  await request('runs', { method: 'POST', headers: { Origin: 'https://office.test', 'Content-Type': 'application/json' }, body: '{"repo":"pti"}' });
  const [run] = await (await request('runs')).json();
  assert.equal(run.status, 'failed');
  assert.match(run.error, /429/);
  assert.equal(run.result, null);
});
