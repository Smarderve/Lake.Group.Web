import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const siteRoot = resolve(process.env.CMS_V2_SITE_ROOT || '.');
const artifactRoot = resolve(process.env.CMS_V2_ARTIFACT_ROOT || '.');
const port = Number(process.env.CMS_V2_STATIC_PORT || 4180);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const relative = normalize(pathname.replace(/^\/+/, ''));
  const root = relative.startsWith('public-content/') ? artifactRoot : siteRoot;
  const local = relative.startsWith('public-content/') ? relative.slice('public-content/'.length) : relative;
  const target = join(root, local || 'index.html');
  if (!target.startsWith(root) || !existsSync(target) || (await stat(target)).isDirectory()) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream', 'cache-control': 'no-store' }); createReadStream(target).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`CMS V2 static test server listening on ${port}`));
