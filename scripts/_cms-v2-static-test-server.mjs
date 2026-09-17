import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};
const siteRoot = resolve(argument('--site-root') || process.env.CMS_V2_SITE_ROOT || '.');
const artifactRoot = resolve(argument('--artifact-root') || process.env.CMS_V2_ARTIFACT_ROOT || '.');
const port = Number(argument('--port') || process.env.CMS_V2_STATIC_PORT || 4180);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const relative = normalize(pathname.replace(/^\/+/, ''));
  const isPublicContent = pathname.startsWith('/public-content/');
  const root = isPublicContent ? artifactRoot : siteRoot;
  const local = isPublicContent ? relative.slice('public-content'.length).replace(/^[/\\]+/, '') : relative;
  const target = join(root, local || 'index.html');
  if (!target.startsWith(root) || !existsSync(target) || (await stat(target)).isDirectory()) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream', 'cache-control': 'no-store' }); createReadStream(target).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`CMS V2 static test server listening on ${port}`));
