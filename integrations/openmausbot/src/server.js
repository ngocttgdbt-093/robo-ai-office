import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { createStatusStore, normalizeEvent } from './status.js';
import { createGitHubStatusCache } from './github-status.js';
export function createBridge({ token, maxBytes = 16384 } = {}) {
  if (typeof token !== 'string' || token.length < 24) throw new Error('BRIDGE_TOKEN must have at least 24 characters');
  const store = createStatusStore();
  const githubStatus = createGitHubStatusCache();
  const check = (provided) => {
    const expected = Buffer.from(token), actual = Buffer.from(provided || '');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  };
  return http.createServer(async (req, res) => {
    const respond = (code, data) => { res.writeHead(code, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data)); };
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/health' && req.method === 'GET') return respond(200, {ok:true, service:'robo-status-bridge'});
    if (pathname === '/api/github-status' && req.method === 'GET') {
      try { return respond(200, await githubStatus()); }
      catch { return respond(503, {error:'github_unavailable', agentRuntimeConnected:false}); }
    }
    if (!check(req.headers.authorization?.replace(/^Bearer /, ''))) return respond(401,{error:'unauthorized'});
    if (pathname === '/api/status' && req.method === 'GET') return respond(200,{agents:store.list()});
    if (pathname !== '/api/events' || req.method !== 'POST') return respond(404,{error:'not_found'});
    let body = '', bytes = 0;
    try {
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > maxBytes) return respond(413,{error:'payload_too_large'});
        body += chunk.toString('utf8');
      }
      const event = normalizeEvent(JSON.parse(body));
      store.update(event);
      return respond(202,{accepted:true});
    } catch { return respond(400,{error:'invalid_event'}); }
  });
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const server = createBridge({token:process.env.BRIDGE_TOKEN});
  const port = Number(process.env.PORT || process.env.BRIDGE_PORT || 8788);
  const host = process.env.RENDER === 'true' ? '0.0.0.0' : '127.0.0.1';
  server.listen(port, host, () => console.log('Bridge listening; authenticated API required'));
}
