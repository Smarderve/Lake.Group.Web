/**
 * Phase 10 — Analytics & Intelligence.
 *
 * Lightweight first-party analytics: the static site and the assistant POST
 * events (page views, chat questions, no-match queries, searches) to
 * /api/public/analytics/events; the admin summary aggregates them for the
 * content-health dashboard. No third-party trackers, no cookies — the beacon
 * is a fire-and-forget POST that never blocks the page.
 */

export const EVENT_TYPES = ['PAGE_VIEW', 'CHAT_QUESTION', 'CHAT_NO_MATCH', 'SEARCH'];

/** Trim/normalize an incoming event; returns null when invalid. */
export function normalizeEvent(input) {
  if (!input || typeof input !== 'object') return null;
  const type = typeof input.type === 'string' ? input.type.toUpperCase() : '';
  if (!EVENT_TYPES.includes(type)) return null;
  const page = typeof input.page === 'string' ? input.page.slice(0, 200).trim() : null;
  const query = typeof input.query === 'string' ? input.query.slice(0, 300).trim() : null;
  // A view without a page (or a chat/search without a query) is noise.
  if (type === 'PAGE_VIEW' && !page) return null;
  if (type !== 'PAGE_VIEW' && !query) return null;
  if (page === '') return null;
  const language = typeof input.language === 'string' && /^[a-z]{2,3}$/i.test(input.language)
    ? input.language.slice(0, 3).toLowerCase()
    : null;
  const sessionId = typeof input.sessionId === 'string' ? input.sessionId.slice(0, 64) : null;
  const detail = input.detail && typeof input.detail === 'object'
    ? JSON.parse(JSON.stringify(input.detail).slice(0, 2000))
    : null;
  return { type, page, query, language, sessionId, detail };
}

/** Best-effort capture — never throws (analytics must not break the site). */
export async function trackEvent(db, input) {
  const ev = normalizeEvent(input);
  if (!ev) return null;
  try {
    return await db.analyticsEvent.create({ data: ev });
  } catch (err) {
    return null;
  }
}

/** Aggregate events in the window for the admin dashboard. */
export async function analyticsSummary(db, { days = 30 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.analyticsEvent.findMany({ where: { createdAt: { gte: since } } });

  const pageViews = {};
  const chat = { questions: 0, noMatch: 0 };
  const queries = {};
  let totalQueries = 0;

  for (const r of rows) {
    if (r.type === 'PAGE_VIEW' && r.page) {
      pageViews[r.page] = (pageViews[r.page] || 0) + 1;
    } else if (r.type === 'CHAT_QUESTION') {
      chat.questions += 1;
      if (r.query) {
        queries[r.query] = (queries[r.query] || 0) + 1;
        totalQueries += 1;
      }
    } else if (r.type === 'CHAT_NO_MATCH') {
      chat.noMatch += 1;
      if (r.query) {
        queries[r.query] = (queries[r.query] || 0) + 1;
        totalQueries += 1;
      }
    }
  }

  return {
    windowDays: days,
    pageViews: Object.entries(pageViews)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    chat: {
      questions: chat.questions,
      noMatch: chat.noMatch,
      noMatchRate: chat.questions + chat.noMatch > 0
        ? Math.round((chat.noMatch / (chat.questions + chat.noMatch)) * 1000) / 10
        : 0,
    },
    topQueries: Object.entries(queries)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25),
    events: rows.length,
  };
}
