import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const M = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  js: 'text/javascript',
  mjs: 'text/javascript',
  css: 'text/css',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  woff2: 'font/woff2',
  txt: 'text/plain',
  xml: 'application/xml',
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(root, p);
    fs.readFile(f, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404');
        return;
      }
      const ext = path.extname(f).slice(1).toLowerCase();
      res.writeHead(200, { 'Content-Type': M[ext] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(4173, '127.0.0.1', () => console.log('static QA server up on 4173'));
