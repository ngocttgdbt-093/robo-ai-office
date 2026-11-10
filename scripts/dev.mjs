import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import './build.mjs';
import { pathToFileURL } from 'node:url';

const { default: worker } = await import(pathToFileURL(process.cwd() + '/dist/server/index.js'));
const database = new DatabaseSync(':memory:');
for (const name of ['0000_runs.sql', '0001_work_events.sql', '0002_work_project.sql', '0003_work_activity.sql']) database.exec(readFileSync('drizzle/' + name, 'utf8'));
const DB = { prepare(sql) {
  return { bind(...args) {
    const statement = database.prepare(sql);
    return { run: async () => statement.run(...args), all: async () => ({ results: statement.all(...args) }) };
  } };
} };
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 3000);
createServer(async (incoming, outgoing) => {
  try {
    const origin = 'http://' + incoming.headers.host;
    const headers = new Headers(incoming.headers);
    headers.set('oai-authenticated-user-id','local-preview');
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const response = await worker.fetch(new Request(new URL(incoming.url, origin), {
      method:incoming.method, headers, body:chunks.length ? Buffer.concat(chunks) : undefined,
    }), { DB, ROBO_WORK_BRIDGE_SECRET: process.env.ROBO_WORK_BRIDGE_SECRET });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500).end();
  }
}).listen(port, '127.0.0.1', () => console.log('Office preview listening on ' + port));
