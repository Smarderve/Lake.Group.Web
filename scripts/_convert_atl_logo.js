#!/usr/bin/env node
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DEST = path.join(ROOT, 'assets', 'images', 'logos', 'companies', 'atl.png');
const TMP = path.join(ROOT, 'scripts', '_scraped');
fs.mkdirSync(TMP, { recursive: true });

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          get(new URL(r.headers.location, url).href).then(resolve, reject);
          return;
        }
        const chunks = [];
        r.on('data', (d) => chunks.push(d));
        r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(chunks) }));
      })
      .on('error', reject);
  });
}

(async () => {
  const urls = [
    'https://atl-tz.com/wp-content/uploads/2025/04/logo_yellow.jpg',
    'https://atl-tz.com/wp-content/uploads/2025/04/logo_yellow.jpg.webp'
  ];
  let srcFile = null;
  for (const u of urls) {
    const r = await get(u);
    console.log(u, r.status, r.body.length, r.body.slice(0, 4).toString('hex'));
    if (r.status === 200 && r.body.length > 1000) {
      const ext = r.body[0] === 0xff && r.body[1] === 0xd8 ? '.jpg' : '.webp';
      srcFile = path.join(TMP, 'atl_logo_src' + ext);
      fs.writeFileSync(srcFile, r.body);
      break;
    }
  }
  if (!srcFile) throw new Error('no atl logo downloaded');

  // Prefer magick / ffmpeg / powershell System.Drawing
  const ps = `
Add-Type -AssemblyName System.Drawing
$src = '${srcFile.replace(/'/g, "''")}'
$dst = '${DEST.replace(/'/g, "''")}'
$img = [System.Drawing.Image]::FromFile($src)
$img.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
Write-Host "saved" $dst
`;
  const psFile = path.join(TMP, 'convert_atl.ps1');
  fs.writeFileSync(psFile, ps);
  try {
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], {
      stdio: 'inherit'
    });
  } catch (e) {
    console.log('System.Drawing failed, trying ffmpeg');
    execFileSync('ffmpeg', ['-y', '-i', srcFile, DEST], { stdio: 'inherit' });
  }
  if (!fs.existsSync(DEST)) throw new Error('atl.png missing');
  console.log('atl.png bytes', fs.statSync(DEST).size);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
