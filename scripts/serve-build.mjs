// Dependency-free local production preview. Hosting still uses Vercel/Django.
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
if (!existsSync(path.join(root, 'index.html'))) throw new Error('Run npm run build first.');
const backend = new URL(process.env.API_PROXY_TARGET || 'http://127.0.0.1:8010');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
let port = Number(process.env.PORT || 5175);
const server = http.createServer((request, response) => {
  if (request.url.startsWith('/api/')) {
    const proxy = http.request({ hostname: backend.hostname, port: backend.port, path: request.url, method: request.method, headers: { ...request.headers, host: backend.host } }, result => {
      response.writeHead(result.statusCode, result.headers);
      result.pipe(response);
    });
    proxy.on('error', () => { response.writeHead(502, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: 'The backend is unavailable. Start Django on port 8010.' })); });
    request.pipe(proxy);
    return;
  }
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400); response.end(); return; }
  let filename = path.resolve(root, `.${pathname}`);
  if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) { response.writeHead(403); response.end(); return; }
  if (!existsSync(filename) || statSync(filename).isDirectory()) {
    if (path.extname(pathname)) { response.writeHead(404); response.end(); return; }
    filename = path.join(root, 'index.html');
  }
  response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  if (request.method === 'HEAD') { response.end(); return; }
  const stream = createReadStream(filename);
  stream.on('error', () => response.destroy());
  stream.pipe(response);
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port < 5190) { port++; server.listen(port, '127.0.0.1'); }
  else throw error;
});
server.on('listening', () => console.log(`Ready Candidate: http://127.0.0.1:${port}/\nAPI proxy: ${backend.origin}`));
server.listen(port, '127.0.0.1');
