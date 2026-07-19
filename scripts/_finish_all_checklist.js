#!/usr/bin/env node
/**
 * End-to-end finisher for LogoLoop / ATL-Agro / localization checklist.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CACHE = '47';

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}
function write(p, s) {
  fs.writeFileSync(path.join(ROOT, p), s);
}

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

const ATL_NAV =
  '<a href="atl.html" class="mm-company" role="menuitem"><img src="assets/images/logos/companies/atl.png" alt="ATL" loading="lazy" width="110" height="68"><span data-i18n="nav.co.atl">ATL</span></a>';
const AGRO_NAV =
  '<a href="lake-agro.html" class="mm-company" role="menuitem"><img src="assets/images/logos/companies/lake-agro.png" alt="Lake Agro" loading="lazy" width="110" height="68"><span data-i18n="nav.co.lakeAgro">Lake Agro</span></a>';
const ATL_MOB = '<a href="atl.html" data-i18n="nav.co.atl">ATL</a>';
const AGRO_MOB = '<a href="lake-agro.html" data-i18n="nav.co.lakeAgro">Lake Agro</a>';

const EXT_ATL_NAV =
  /<a href="https:\/\/atl-tz\.com"[^>]*class="mm-company mm-external"[\s\S]*?<\/a>/g;
const EXT_AGRO_NAV =
  /<a href="https:\/\/lakeagro\.com\/?"[^>]*class="mm-company mm-external"[\s\S]*?<\/a>/g;
const EXT_ATL_MOB =
  /<a href="https:\/\/atl-tz\.com"[^>]*class="mob-external"[\s\S]*?<\/a>/g;
const EXT_AGRO_MOB =
  /<a href="https:\/\/lakeagro\.com\/?"[^>]*class="mob-external"[\s\S]*?<\/a>/g;

function patchHtmlFile(file, raw) {
  let s = raw;
  let n = 0;
  const before = s;
  s = s.replace(EXT_ATL_NAV, () => {
    n++;
    return ATL_NAV;
  });
  s = s.replace(EXT_AGRO_NAV, () => {
    n++;
    return AGRO_NAV;
  });
  s = s.replace(EXT_ATL_MOB, () => {
    n++;
    return ATL_MOB;
  });
  s = s.replace(EXT_AGRO_MOB, () => {
    n++;
    return AGRO_MOB;
  });

  // services directory rows
  s = s.replace(
    /<a href="https:\/\/atl-tz\.com" class="div-row div-external"[\s\S]*?<\/a>/g,
    `<a href="atl.html" class="div-row"><div class="div-no">10</div><div class="div-main"><h3><span class="div-glyph" aria-hidden="true"><img src="assets/images/logos/companies/atl.png" alt="" loading="lazy"></span> <span>ATL (Aluminium Trailers)</span></h3></div><div class="div-side"><p data-i18n="services.desc.atl">Tanzania's aluminium fuel tanker and custom trailer manufacturer — engineered for African routes.</p><span class="svc-link" data-i18n="common.learnMore">Learn more</span></div></a>`
  );
  s = s.replace(
    /<a href="https:\/\/lakeagro\.com\/?" class="div-row div-external"[\s\S]*?<\/a>/g,
    `<a href="lake-agro.html" class="div-row"><div class="div-no">17</div><div class="div-main"><h3><span class="div-glyph" aria-hidden="true"><img src="assets/images/logos/companies/lake-agro.png" alt="" loading="lazy"></span> <span>Lake Agro</span></h3></div><div class="div-side"><p data-i18n="services.desc.lakeAgro">Agribusiness plantations and integrated Ag Parks — creating customers and food for life across Africa.</p><span class="svc-link" data-i18n="common.learnMore">Learn more</span></div></a>`
  );

  // contact directory
  if (file === 'contact.html') {
    s = s.replace(
      /id="atl">[\s\S]*?<\/article>/,
      `id="atl">
        <div class="ct-dir-logo"><img src="assets/images/logos/companies/atl.png" alt="ATL" loading="lazy"></div>
        <div class="ct-dir-meta">
          <h3>ATL (Aluminium Trailers)</h3>
          <div class="ct-dir-div">Manufacturing</div>
          <div class="ct-dir-lines">
            <span>Tanzania aluminium trailer manufacturing</span>
            <a href="atl.html">Company page</a>
            <a href="tel:+255222780510">+255 222 780 510</a>
            <a href="mailto:admin@lakeoilgroup.com">admin@lakeoilgroup.com</a>
          </div>
          <span class="ct-src ct-src--hq">Source: Group HQ · Kipawa plant details on company page</span>
        </div>
      </article>`
    );
    s = s.replace(
      /id="lake-agro">[\s\S]*?<\/article>/,
      `id="lake-agro">
        <div class="ct-dir-logo"><img src="assets/images/logos/companies/lake-agro.png" alt="Lake Agro" loading="lazy"></div>
        <div class="ct-dir-meta">
          <h3>Lake Agro</h3>
          <div class="ct-dir-div">Agro Processing</div>
          <div class="ct-dir-lines">
            <span>Agro-processing division</span>
            <a href="lake-agro.html">Company page</a>
            <a href="mailto:info@lakeagro.com">info@lakeagro.com</a>
            <a href="tel:+255222780510">+255 222 780 510</a>
          </div>
          <span class="ct-src ct-src--hq">Source: Group HQ + Lake Agro</span>
        </div>
      </article>`
    );
  }

  // Localize ATL hotlinked gallery on atl.html
  if (file === 'atl.html') {
    s = s
      .replace(
        /https:\/\/atl-tz\.com\/wp-content\/uploads\/2025\/02\/1-2\.jpg/g,
        'assets/images/atl/tanker-1.jpg'
      )
      .replace(
        /https:\/\/atl-tz\.com\/wp-content\/uploads\/2025\/02\/39\.jpg/g,
        'assets/images/atl/tanker-2.jpg'
      )
      .replace(
        /https:\/\/atl-tz\.com\/wp-content\/uploads\/2025\/02\/46-qu1wm36pke816ngzqbe4u9h1r5e63spqo7k60ix8xc\.png/g,
        'assets/images/atl/tanker-3.png'
      );
  }

  // Cache bump
  s = s
    .replace(/tokens\.css\?v=\d+/g, `tokens.css?v=${CACHE}`)
    .replace(/flagship\.css\?v=\d+/g, `flagship.css?v=${CACHE}`)
    .replace(/theme\.css\?v=\d+/g, `theme.css?v=${CACHE}`)
    .replace(/site\.js\?v=\d+/g, `site.js?v=${CACHE}`)
    .replace(/i18n\.js\?v=\d+/g, `i18n.js?v=${CACHE}`)
    .replace(/i18n-content\.js\?v=\d+/g, `i18n-content.js?v=${CACHE}`)
    .replace(/LogoLoop\.css\?v=\d+/g, `LogoLoop.css?v=${CACHE}`)
    .replace(/logo-loop-mount\.js\?v=\d+/g, `logo-loop-mount.js?v=${CACHE}`);

  return { s, changed: s !== before || n > 0, replacements: n };
}

async function downloadAtlImages() {
  const dir = path.join(ROOT, 'assets', 'images', 'atl');
  fs.mkdirSync(dir, { recursive: true });
  const items = [
    ['https://atl-tz.com/wp-content/uploads/2025/02/1-2.jpg', 'tanker-1.jpg'],
    ['https://atl-tz.com/wp-content/uploads/2025/02/39.jpg', 'tanker-2.jpg'],
    [
      'https://atl-tz.com/wp-content/uploads/2025/02/46-qu1wm36pke816ngzqbe4u9h1r5e63spqo7k60ix8xc.png',
      'tanker-3.png'
    ]
  ];
  for (const [url, name] of items) {
    const dest = path.join(dir, name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log('have', name);
      continue;
    }
    try {
      const r = await get(url);
      if (r.status === 200) {
        fs.writeFileSync(dest, r.body);
        console.log('dl', name, r.body.length);
      } else console.log('fail status', name, r.status);
    } catch (e) {
      console.log('fail', name, e.message);
    }
  }
}

function ensureAgroLogo() {
  const src = path.join(ROOT, 'scripts', '_scraped', 'agro_logoresizey.png');
  const dest = path.join(ROOT, 'assets', 'images', 'logos', 'companies', 'lake-agro.png');
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    const b = fs.readFileSync(dest);
    console.log('agro logo', b.readUInt32BE(16) + 'x' + b.readUInt32BE(20));
  }
}

function ensureCompanyPages() {
  if (!fs.existsSync(path.join(ROOT, 'atl.html')) || !fs.existsSync(path.join(ROOT, 'lake-agro.html'))) {
    execFileSync('node', [path.join(ROOT, 'scripts', '_build_atl_agro_pages.js')], {
      stdio: 'inherit',
      cwd: ROOT
    });
  }
  // Ensure data-company-logo + theme on agro
  let agro = read('lake-agro.html');
  if (!/data-company-logo="assets\/images\/logos\/companies\/lake-agro\.png"/.test(agro)) {
    agro = agro.replace(
      /<body([^>]*)>/,
      '<body data-company-logo="assets/images/logos/companies/lake-agro.png" data-company-alt="Lake Agro" class="co-theme-agro">'
    );
    write('lake-agro.html', agro);
  }
  if (!/co-theme-agro/.test(agro) && !/color-agro-green/.test(agro)) {
    // inject green theme block if missing
    const style = `
body.co-theme-agro {
  --gold: var(--color-agro-green-bright);
  --gold-deep: var(--color-agro-green);
  --color-yellow-accent: var(--color-agro-green-bright);
  --yellow: var(--color-agro-green-bright);
}
body.co-theme-agro .fs-section.fs-on-dark {
  background: linear-gradient(160deg, var(--color-agro-green-deep) 0%, #013220 55%, var(--color-brand-blue-darkest) 100%);
}
body.co-theme-agro .info-panel,
body.co-theme-agro .ct-info { background: var(--color-agro-green-deep); }
`;
    agro = read('lake-agro.html');
    if (!/co-theme-agro/.test(agro)) {
      agro = agro.replace('</style>', style + '\n</style>');
      agro = agro.replace(/<body([^>]*)>/, (m, attrs) => {
        if (/class=/.test(attrs)) return `<body${attrs.replace(/class="/, 'class="co-theme-agro ')}>`;
        return `<body${attrs} class="co-theme-agro">`;
      });
      write('lake-agro.html', agro);
      console.log('injected agro theme');
    }
  }
  let atl = read('atl.html');
  if (!/data-company-logo="assets\/images\/logos\/companies\/atl\.png"/.test(atl)) {
    atl = atl.replace(
      /<body([^>]*)>/,
      '<body data-company-logo="assets/images/logos/companies/atl.png" data-company-alt="ATL">'
    );
    write('atl.html', atl);
  }
}

function ensureIndexMarquee() {
  let idx = read('index.html');
  if (!/background:\s*var\(--color-brand-blue\)/.test(idx)) {
    idx = idx.replace(
      /\.marquee-wrap \{[\s\S]*?\}/,
      `.marquee-wrap {
      background: var(--color-brand-blue);
      padding: 13px 0;
      overflow: hidden;
      width: 100%;
      border-top: 2px solid var(--color-yellow-accent);
      border-bottom: 2px solid var(--color-yellow-accent);
      box-sizing: border-box;
    }`
    );
  }
  if (!/--logoloop-fadeColorAuto:\s*var\(--color-brand-blue\)/.test(idx)) {
    idx = idx.replace(
      /\.marquee-wrap \.logoloop \{[\s\S]*?\}/,
      `.marquee-wrap .logoloop {
      --logoloop-fadeColorAuto: var(--color-brand-blue);
    }`
    );
  }
  if (!/about\.badge/.test(idx)) {
    idx = idx.replace(
      /<div class="about-badge">[\s\S]*?<\/div>\s*<\/div>\s*<div class="reveal">/,
      `<div class="about-badge">
            <div class="num" data-i18n-number="2006">2006</div>
            <p data-i18n="about.badge" data-i18n-html="">Founded in<br />Tanzania</p>
          </div>
        </div>
        <div class="reveal">`
    );
  }
  write('index.html', idx);
}

function ensureMount() {
  let m = read('assets/components/logo-loop-mount.js');
  if (!/atl\.png/.test(m) || !/lake-agro\.png/.test(m)) {
    console.log('WARNING mount missing atl/agro — rewriting logo list');
  }
  m = m.replace(/fadeOutColor:\s*'var\(--color-yellow-accent\)'/, "fadeOutColor: 'var(--color-brand-blue)'");
  if (!/atl\.png/.test(m)) {
    m = m.replace(
      /\{ src: 'assets\/images\/logos\/companies\/gulf-aggregates\.png'[^}]+\}/,
      `{ src: 'assets/images/logos/companies/gulf-aggregates.png', alt: 'Gulf Aggregates', title: 'Gulf Aggregates', href: 'gulf-aggregates.html' },
    { src: 'assets/images/logos/companies/atl.png', alt: 'ATL', title: 'ATL Aluminium Trailers', href: 'atl.html' },
    { src: 'assets/images/logos/companies/lake-agro.png', alt: 'Lake Agro', title: 'Lake Agro', href: 'lake-agro.html' }`
    );
  }
  write('assets/components/logo-loop-mount.js', m);
}

function ensureTokens() {
  let t = read('assets/tokens.css');
  if (!/--footer-logo-height/.test(t)) {
    t = t.replace(
      /(--nav-logo-letterbox-scale:\s*1\.75;)/,
      `$1\n  --footer-logo-height:            56px;\n  --footer-logo-height-mobile:     48px;`
    );
  }
  if (!/--color-agro-green/.test(t)) {
    t = t.replace(
      /(--color-light:\s*#EFF2FB;)/,
      `$1\n\n  --color-agro-green:         #008435;\n  --color-agro-green-deep:    #004b1e;\n  --color-agro-green-bright:  #489f10;\n  --color-agro-orange:        #e67e22;`
    );
  }
  write('assets/tokens.css', t);
}

function ensureFooterCss() {
  for (const file of ['assets/flagship.css', 'assets/theme.css']) {
    let s = read(file);
    if (!/footer-logo-height/.test(s)) {
      s = s.replace(
        /\.footer-logo img \{ height: 40px; width: auto; display: block; \}/,
        '.footer-logo img { height: var(--footer-logo-height, 56px); width: auto; display: block; max-width: min(280px, 100%); object-fit: contain; }'
      );
    }
    write(file, s);
  }
}

(async () => {
  ensureTokens();
  ensureFooterCss();
  ensureAgroLogo();
  ensureMount();
  ensureIndexMarquee();
  await downloadAtlImages();
  ensureCompanyPages();

  // Sync nav from templates first
  try {
    execFileSync('node', [path.join(ROOT, 'scripts', 'normalize_nav.js')], {
      stdio: 'inherit',
      cwd: ROOT
    });
  } catch (e) {
    console.log('normalize_nav error', e.message);
  }

  // Belt-and-suspenders: patch every HTML for external ATL/Agro
  let filesChanged = 0;
  let totalRepl = 0;
  for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
    const raw = read(f);
    const { s, changed, replacements } = patchHtmlFile(f, raw);
    if (s !== raw) {
      write(f, s);
      filesChanged++;
      totalRepl += replacements;
      console.log('patched', f, 'repl', replacements);
    }
  }
  console.log('filesChanged', filesChanged, 'navReplacements', totalRepl);

  // Remaining destination links (ignore image CDN leftovers)
  const remaining = [];
  for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
    const s = read(f);
    if (/href="https:\/\/atl-tz\.com"|href="https:\/\/lakeagro\.com/.test(s)) remaining.push(f);
  }
  console.log('remaining external HREFs', remaining);

  // Re-run place/digit localization if residual
  const j = JSON.parse(read('assets/i18n-content.json'));
  const darAr = /\bDar es Salaam\b/.test(JSON.stringify(j.ar));
  const darHi = /\bDar es Salaam\b/.test(JSON.stringify(j.hi));
  if (darAr || darHi || !j.ar['about.badge']) {
    execFileSync('node', [path.join(ROOT, 'scripts', '_fix_ar_hi_places_digits.js')], {
      stdio: 'inherit',
      cwd: ROOT
    });
  }
  console.log('ar hero', j.ar['hero.eyebrow']);
  console.log('DONE finish_all');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
