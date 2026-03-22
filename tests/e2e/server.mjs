import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3456;
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // API routes — return JSON for network tracking tests
  if (pathname.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, path: pathname }));
    return;
  }

  // HTML pages — map pathname to fixture file
  const slug = pathname === '/' ? 'index' : pathname.slice(1).replace(/\//g, '-');
  const filePath = path.join(FIXTURES_DIR, `${slug}.html`);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`Not found: ${pathname}`);
  }
});

server.listen(PORT);
