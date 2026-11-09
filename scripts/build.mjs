import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

const definitions = [['/','index.html','text/html'],['/office.css','office.css','text/css'],['/office.js','office.js','text/javascript']];
const assets = Object.fromEntries(await Promise.all(definitions.map(async ([route,file,type]) =>
  [route, { body:await readFile(file, 'utf8'), type }])));
const runtime = (await readFile('runtime.mjs','utf8')).replace('export default createRuntime();','const runtime = createRuntime();');
const worker = runtime + `
const assets = ${JSON.stringify(assets)};
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) return runtime(request, env);
    if (!Object.hasOwn(assets,path)) return new Response('Không tìm thấy.', {status:404});
    if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405});
    const {body,type} = assets[path];
    return new Response(request.method === 'HEAD' ? null : body, {headers:{
      'Content-Type': type + '; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Content-Security-Policy': "default-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    }});
  },
};`;
await mkdir('dist/server', {recursive:true});
await mkdir('dist/.openai', {recursive:true});
await writeFile('dist/server/index.js', worker);
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
