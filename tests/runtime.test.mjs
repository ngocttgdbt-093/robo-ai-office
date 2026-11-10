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
  db.exec(readFileSync(new URL('../drizzle/0001_work_events.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../drizzle/0002_work_project.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../drizzle/0003_work_activity.sql', import.meta.url), 'utf8'));
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
  }), { DB, ROBO_WORK_BRIDGE_SECRET: 'test-bridge' });
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

test('health reports storage and GitHub availability without exposing records', async () => {
  const response = await setup()('health', {}, false);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { storage: true, github: true });
});

test('Work bridge rejects anonymous writes and records real phase changes exactly once', async () => {
  const request = setup();
  const event = { id: crypto.randomUUID(), title: 'Office release', project: 'ROBO AI OFFICE', agent: 'Codex', skills: ['TDD'], phase: 'planning', status: 'running', seq: 1 };
  const send = (data, key) => request('work', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Robo-Bridge': key }, body: JSON.stringify(data),
  }, false);
  assert.equal((await send(event, 'wrong')).status, 401);
  assert.equal((await send(event, 'test-bridge')).status, 200);
  assert.equal((await send({ ...event, phase: 'implementation', seq: 2, project: undefined }, 'test-bridge')).status, 200);
  assert.equal((await send(event, 'test-bridge')).status, 409);
  let [task] = await (await request('work')).json();
  assert.deepEqual([task.previous, task.phase, task.status], ['planning', 'implementation', 'running']);
  assert.equal((await send({ ...event, phase: 'verification', seq: 3, status: 'completed' }, 'test-bridge')).status, 200);
  assert.equal((await send({ ...event, seq: 4 }, 'test-bridge')).status, 409);
  [task] = await (await request('work')).json();
  assert.equal(task.status, 'completed');
  assert.equal(task.agent, 'Codex');
  assert.equal(task.project, 'ROBO AI OFFICE');
  assert.deepEqual(task.skills, ['TDD']);
});

test('GitHub Actions activity is authenticated and preserves upstream run status', async () => {
  const request = setup(async url => {
    assert.match(url, /robo-ai-office\/actions\/runs/);
    return Response.json({workflow_runs:[{id:7,name:'Verify',status:'in_progress',conclusion:null,updated_at:'2026-11-09T01:00:00Z'}]});
  });
  assert.equal((await request('ci', {}, false)).status, 401);
  const response = await request('ci');
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).runs[0], {
    id:7, name:'Verify', status:'in_progress', conclusion:null,
    updated:'2026-11-09T01:00:00Z', url:'https://github.com/ngocttgdbt-093/robo-ai-office/actions/runs/7',
  });
});

test('uses fresh Render workflow data and falls back when the bridge snapshot is stale', async () => {
  for (const stale of [false, true]) {
    const calls = [];
    const request = setup(async url => {
      calls.push(url);
      return url.includes('.onrender.com')
        ? Response.json({repository:'ngocttgdbt-093/robo-ai-office',observedAt:new Date().toISOString(),stale,workflowRuns:[{id:'42',name:'Build',status:'queued'}]})
        : Response.json({workflow_runs:[]});
    });
    const body = await (await request('ci')).json();
    assert.equal(body.source, stale ? 'github' : 'render');
    assert.equal(calls.length, stale ? 2 : 1);
    if (!stale) assert.equal(body.runs[0].id, 42);
  }
});

test('preserves the test failure and retry in the timeline after completion', async () => {
  const request = setup();
  const event = { id: crypto.randomUUID(), title: 'Test retry', agent: 'Codex', phase: 'verification' };
  for (const [index, activity] of ['test_running', 'test_failed', 'heartbeat', 'test_passed', 'completed'].entries()) {
    const response = await request('work', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Robo-Bridge': 'test-bridge' },
      body: JSON.stringify({ ...event, seq: index + 1, activity, status: activity === 'completed' ? 'completed' : 'running' }),
    });
    assert.equal(response.status, 200);
  }
  const [task] = await (await request('work')).json();
  assert.equal(task.status, 'completed');
  assert.deepEqual(task.timeline.map(entry => entry.activity), ['test_running', 'test_failed', 'test_passed', 'completed']);
});
