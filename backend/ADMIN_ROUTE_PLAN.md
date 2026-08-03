# Admin Route Plan — wiring the dashboard & site to the CMS

How the existing static site (`dashboard.html`, `news.html`, `leadership.html`,
company pages) plugs into this self-hosted Payload backend.

---

## 1. The admin dashboard

Payload ships a complete admin panel at **`/admin`** with login, roles, media
library and CRUD for every collection. Two ways to expose it:

### Option A (recommended for now) — redirect the existing dashboard

Replace the fake `doLogin()` in `dashboard.html` with a redirect to the CMS:

```js
async function doLogin() {
  // Real auth happens on the CMS; the site dashboard becomes the branded entry point.
  window.location.href = 'https://cms.example.com/admin'
}
```

Zero frontend work; the content team gets a battle-tested admin with search,
filtering, drafts and image uploads immediately.

### Option B — custom branded dashboard (later phase)

Keep `dashboard.html` and talk to Payload's REST API directly:

```js
// 1. Sign in — Payload sets a secure httpOnly `payload-token` cookie
const res = await fetch('https://cms.example.com/api/users/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email, password }),
})

// 2. CRUD against any collection
await fetch(`https://cms.example.com/api/news/${id}`, {
  method: 'PATCH',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'New title' }),
})
```

Requires `CORS_ORIGINS` to include the dashboard origin (see `.env.example`).

---

## 2. REST API surface (all public read)

| Collection | List                        | Single                            |
| ---------- | --------------------------- | --------------------------------- |
| News       | `GET /api/news`             | `GET /api/news/{id}`              |
| Leaders    | `GET /api/leaders`          | `GET /api/leaders/{id}`           |
| Companies  | `GET /api/companies`        | `GET /api/companies/{id}`         |
| Countries  | `GET /api/countries`        | `GET /api/countries/{id}`         |
| Media      | `GET /api/media`            | `GET /api/media/{id}`             |
| Users      | `GET /api/users` (admin only) | auth: `POST /api/users/login`   |

### Example — news page

```js
const res = await fetch('https://cms.example.com/api/news?limit=12&sort=-date&depth=1')
const { docs } = await res.json()
// docs[].title, docs[].date, docs[].category, docs[].bannerImage.url, …
```

Filtering by status: `?where[status][equals]=published`.

---

## 3. Wiring the static pages (phase 2)

| Page            | Endpoint used                         |
| --------------- | ------------------------------------- |
| `news.html`     | `GET /api/news?sort=-date&depth=1`    |
| `news-article.html` | `GET /api/news/{id}` (by slug)    |
| `leadership.html`   | `GET /api/leaders?sort=sortOrder&depth=1` |
| `leadership-*.html` | `GET /api/leaders?where[slug][equals]=…` |
| `africa-network.html` | `GET /api/countries` + `GET /api/companies` |
| Megamenu        | `GET /api/companies?sort=sortOrder`   |

Keep the static HTML shell; swap the hardcoded JS globals for `fetch` calls.
Do this collection-by-collection, News first, as a proof of concept.

---

## 4. Seed migration (phase 3)

A one-time Node script converts today's data into the CMS:

- `assets/news-data.js` → `news` docs (title, category, date, paragraphs, images)
- `assets/africa-network-map.js` `COUNTRY_META` → `countries` docs
- Leadership pages → `leaders` docs (name, role, lede, bio, quote, mandate, facts)
- Company pages → `companies` docs (name, slug, division, logo, pageUrl)

Run it with `npx payload run scripts/seed.ts` after the DB is up, then switch
pages over to the API.

---

## 5. Security notes (enterprise)

- Writes require login — read access is public so the website can fetch content.
- `Users` is admin-only read, and the first user is bootstrapped via the UI.
- Set a strong `PAYLOAD_SECRET` and `POSTGRES_PASSWORD`; put the CMS behind
  your company VPN/firewall, not a public URL, if only internal editors manage it.
- The REST API is CORS-locked to `CORS_ORIGINS`.
