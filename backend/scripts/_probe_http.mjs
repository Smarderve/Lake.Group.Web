import 'dotenv/config';

async function get(url) {
  const r = await fetch(url);
  let body = null;
  try { body = await r.json(); } catch { body = 'non-json'; }
  return { status: r.status, body };
}

const m = await get('http://127.0.0.1:4000/api/public/metrics/employees');
console.log('METRICS:', JSON.stringify(m));
const c = await get('http://127.0.0.1:4000/api/public/companies');
console.log('COMPANIES:', JSON.stringify(c));
const n = await get('http://127.0.0.1:4000/api/public/news');
console.log('NEWS:', JSON.stringify(n));
const mp = await get('http://127.0.0.1:4000/api/public/map');
console.log('MAP:', JSON.stringify(mp));
const l = await get('http://127.0.0.1:4000/api/public/leadership');
console.log('LEADERSHIP:', JSON.stringify(l));
