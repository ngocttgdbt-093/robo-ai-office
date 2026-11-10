import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { setTimeout as delay } from 'node:timers/promises';

const title = 'Nghiệm thu Codex trực tiếp';
const secret = randomUUID();
const server = spawn(process.execPath, ['scripts/dev.mjs', '--port', '0'], {
  env: { ...process.env, ROBO_WORK_BRIDGE_SECRET: secret },
  stdio: ['ignore', 'pipe', 'inherit'],
});
const output = createInterface({ input: server.stdout });
try {
  let url;
  for await (const line of output) {
    const port = /^Office preview listening on (\d+)$/.exec(line)?.[1];
    if (port) url = 'http://127.0.0.1:' + port;
    break;
  }
  if (!url) throw new Error('Local monitor failed to start');
  console.log('Mở monitor trong trình duyệt:', url);
  console.log('Nhấn Enter để bắt đầu. Sau khi kiểm tra xong, Ctrl+C để đóng monitor.');
  const keyboard = createInterface({ input: process.stdin });
  await keyboard.question('');
  keyboard.close();

  const publisher = spawn(process.execPath, ['scripts/codex-activity.mjs', title, 'ROBO AI OFFICE'], {
    env: { ...process.env, ROBO_OFFICE_URL: url, ROBO_WORK_BRIDGE_SECRET: secret, ROBO_SITES_AUTH: '' },
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  const done = once(publisher, 'close');
  publisher.stdin.end(`Read-only verification in the current repository. Do not modify any files.
Run node --test missing-codex-acceptance-fixture.test.mjs as one separate command.
Then run node --test tests/codex-activity.test.mjs as a second separate command.
Report the actual outcome of both commands.`);
  const [exitCode] = await done;
  const response = await fetch(url + '/api/work');
  if (!response.ok) throw new Error('Monitor HTTP ' + response.status);
  const task = (await response.json()).find(item => item.title === title);
  const activities = task?.timeline.map(entry => entry.activity) ?? [];
  const failed = activities.indexOf('test_failed');
  const passed = activities.lastIndexOf('test_passed');
  console.log('Lộ trình nhận được:', activities.join(' → ') || '(trống)');
  if (exitCode !== 0 || task?.status !== 'completed' || failed < 0 || passed <= failed) {
    throw new Error('Chưa đạt: cần có kiểm thử lỗi, chạy lại thành công, rồi hoàn tất.');
  }
  console.log('Đạt: monitor đã nhận lộ trình từ tiến trình Codex.');
  await delay(120000);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  output.close();
  server.kill();
}
