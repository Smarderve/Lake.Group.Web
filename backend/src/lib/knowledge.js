/**
 * Phase 9 — AI / Corporate Knowledge.
 *
 * Assembles the structured fact bundle the chatbot consumes: PUBLISHED rows
 * from every governed entity, each fact carrying its source and a site URL
 * so the assistant can cite where an approved answer comes from. This is the
 * "chatbot receives approved value" half of the blueprint's first vertical
 * slice — an edit → review → publish cycle flows to the chatbot on its next
 * knowledge fetch, no rebuild required.
 *
 * Blueprint §7: prefer authoritative structured facts; retrieve only approved
 * content; provide source information; avoid inventing statistics.
 *
 * GET /api/public/knowledge/facts → { facts: [...], generatedAt }
 */
import { publicMetric } from './metrics.js';

function fact({ id, type, text, source, verification = 'VERIFIED', url = '/', title = 'Read more' }) {
  return { id, type, lang: 'en', text, source, verification, url, title };
}

/** The full PUBLISHED fact bundle (Phase 9 knowledge ingestion). */
export async function knowledgeFacts(db) {
  const facts = [];

  /* Metrics — the governed corporate truth, source + verification attached. */
  const metrics = await db.metric.findMany({ where: { status: 'PUBLISHED' } });
  for (const m of metrics) {
    const pub = publicMetric(m);
    facts.push(fact({
      id: `metric:${m.key}`,
      type: 'metric',
      text: `${pub.label}: ${pub.value}${pub.unit ? ` (${pub.unit})` : ''}`,
      source: m.source || 'Lake Group official site',
      verification: m.verificationStatus ?? 'UNVERIFIED',
      url: '/about.html',
      title: 'About Lake Group',
    }));
  }

  /* Countries — ONE aggregate fact (a list beats a partial per-country hit
     when the visitor asks "which countries?"). */
  const countries = await db.country.findMany({ where: { status: 'PUBLISHED' } });
  if (countries.length) {
    const names = countries.map((c) => c.name).sort();
    const last = names.pop();
    facts.push(fact({
      id: 'countries',
      type: 'countries',
      text: `Lake Group operates across ${countries.length + 1} countries: ${names.join(', ')} and ${last}.`,
      source: 'Lake Group official website (operations map)',
      url: '/africa-network.html',
      title: 'Operations Map',
    }));
  }

  /* Companies — registry rows (name + description). */
  const companies = await db.company.findMany({ where: { status: 'PUBLISHED' } });
  for (const c of companies) {
    facts.push(fact({
      id: `company:${c.slug}`,
      type: 'company',
      text: `${c.name} — ${(c.description ?? '').trim()}`.replace(/—\s*$/, ''),
      source: 'Lake Group official website (company registry)',
      url: `/${c.slug}.html`,
      title: c.name,
    }));
  }

  /* Leadership. */
  const leadership = await db.leadership.findMany({ where: { status: 'PUBLISHED' } });
  for (const ld of leadership) {
    facts.push(fact({
      id: `leadership:${ld.name}`,
      type: 'leadership',
      text: `${ld.name} is ${ld.position}. ${ld.bio ?? ''}`.trim().replace(/\s+/g, ' '),
      source: 'Lake Group official website (leadership)',
      url: '/leadership.html',
      title: ld.name,
    }));
  }

  /* History — year-prefixed milestones. */
  const history = await db.historyEvent.findMany({ where: { status: 'PUBLISHED' }, orderBy: { date: 'asc' } });
  for (const h of history) {
    facts.push(fact({
      id: `history:${h.id}`,
      type: 'history',
      text: `${new Date(h.date).getUTCFullYear()}: ${h.title}. ${h.description ?? ''}`.trim(),
      source: 'Lake Group official website (history)',
      url: '/history.html',
      title: 'Our History',
    }));
  }

  /* Projects. */
  const projects = await db.project.findMany({ where: { status: 'PUBLISHED' } });
  for (const p of projects) {
    facts.push(fact({
      id: `project:${p.id}`,
      type: 'project',
      text: `${p.title}. ${p.description ?? ''}`.trim(),
      source: 'Lake Group official website (major projects)',
      url: '/projects.html',
      title: 'Major Projects',
    }));
  }

  /* CSR pillars. */
  const csr = await db.cSREntry.findMany({ where: { status: 'PUBLISHED' } });
  for (const c of csr) {
    facts.push(fact({
      id: `csr:${c.id}`,
      type: 'csr',
      text: `${c.title} — ${c.description ?? ''}`.trim(),
      source: 'Lake Group official website (CSR & Sustainability)',
      url: '/csr.html',
      title: 'CSR & Sustainability',
    }));
  }

  /* Contacts — verified lines (publicDisplay gated). */
  const contacts = await db.contact.findMany({ where: { status: 'PUBLISHED', publicDisplay: true } });
  for (const c of contacts) {
    facts.push(fact({
      id: `contact:${c.id}`,
      type: 'contact',
      text: [c.name, c.phone, c.email].filter(Boolean).join(' · '),
      source: 'Lake Group verified contact data (official site)',
      verification: c.verificationStatus ?? 'UNVERIFIED',
      url: '/contact.html',
      title: c.name,
    }));
  }

  /* News — headlines + short lede (long-form bodies stay in the site's own
     retrieval index; facts stay structured). */
  const news = await db.news.findMany({ where: { status: 'PUBLISHED' } });
  for (const n of news) {
    facts.push(fact({
      id: `news:${n.id}`,
      type: 'news',
      text: `${n.title}. ${(n.metaDescription || n.body || '').replace(/\s+/g, ' ').slice(0, 200)}`.trim(),
      source: 'Lake Group newsroom',
      url: '/news.html',
      title: 'News',
    }));
  }

  return facts;
}
