import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

export function classifyCodexEvent(event) {
  switch (event.type) {
    case 'turn.started': return ['planning', 'running', 'started'];
    case 'turn.completed': return [null, 'completed', 'completed'];
    case 'turn.failed': return [null, 'failed', 'failed'];
    case 'item.started':
    case 'item.completed': break;
    default: return null;
  }
  const { item } = event;
  const started = event.type === 'item.started';
  if (item?.type === 'file_change' && !started && item.status === 'completed') {
    return ['implementation', 'running', 'edited'];
  }
  if (item?.type !== 'command_execution') return null;
  const test = /\b(?:npm test|npm run test|node --test|pytest|python3? -m unittest|cargo test|go test)\b/.test(item.command ?? '');
  const phase = test ? 'verification' : null;
  if (started) return [phase, 'running', test ? 'test_running' : 'command_running'];
  if (!Number.isInteger(item.exit_code)) return null;
  if (test) return [phase, 'running', item.exit_code === 0 ? 'test_passed' : 'test_failed'];
  return item.exit_code !== 0 ? [phase, 'running', 'command_failed'] : null;
}

async function main(title, project) {
  const { ROBO_OFFICE_URL, ROBO_WORK_BRIDGE_SECRET, ROBO_SITES_AUTH } = process.env;
  if (!title?.trim() || title.length > 120 || !project?.trim() || project.length > 100 || !ROBO_OFFICE_URL || !ROBO_WORK_BRIDGE_SECRET) {
    throw new Error('Set ROBO_OFFICE_URL, ROBO_WORK_BRIDGE_SECRET and pass <title> <project>; pipe the prompt on stdin.');
  }
  const url = new URL('/api/work', ROBO_OFFICE_URL);
  if (url.username || url.password || (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && url.hostname === '127.0.0.1'))) {
    throw new Error('Office URL must use HTTPS or local loopback.');
  }
  const env = { ...process.env };
  delete env.ROBO_WORK_BRIDGE_SECRET;
  delete env.ROBO_SITES_AUTH;
  const options = { env, stdio: ['inherit', 'pipe', 'inherit'] };
  const child = process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/c', 'codex exec --json --ephemeral -'], options)
    : spawn('codex', ['exec', '--json', '--ephemeral', '-'], options);
  const childDone = new Promise(resolve => {
    child.once('error', () => resolve(1));
    child.once('close', code => resolve(code ?? 1));
  });
  const id = randomUUID();
  let phase = 'planning';
  let seq = 0;
  let active = false;
  let terminal = false;
  let failedDelivery = false;
  let pending = Promise.resolve();

  function publish(event) {
    const [nextPhase, status, activity] = event;
    phase = nextPhase ?? phase;
    active = status === 'running';
    terminal = !active;
    const body = JSON.stringify({ id, title, project, agent: 'Codex', phase, status, activity, seq: ++seq });
    pending = pending.then(async () => {
      if (failedDelivery) return;
      try {
        const response = await fetch(url, {
          method: 'POST', body, redirect: 'error', signal: AbortSignal.timeout(10000),
          headers: {
            'Content-Type': 'application/json', 'X-Robo-Bridge': ROBO_WORK_BRIDGE_SECRET,
            ...(ROBO_SITES_AUTH ? { 'OAI-Sites-Authorization': 'Bearer ' + ROBO_SITES_AUTH } : {}),
          },
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        console.log('Office:', activity);
      } catch (error) {
        failedDelivery = true;
        console.error('Office delivery failed:', error.message);
      }
    });
  }

  const timer = setInterval(() => {
    if (active) publish([null, 'running', 'heartbeat']);
  }, 30000);
  try {
    for await (const line of createInterface({ input: child.stdout })) {
      let event;
      try { event = classifyCodexEvent(JSON.parse(line)); } catch { continue; }
      if (event && !terminal && (active || event[2] === 'started')) publish(event);
    }
    const exitCode = await childDone;
    if (active) publish([null, 'failed', 'failed']);
    await pending;
    return failedDelivery || !terminal ? 1 : exitCode;
  } finally {
    clearInterval(timer);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = await main(...process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
