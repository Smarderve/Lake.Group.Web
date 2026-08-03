/**
 * site-data.ts — pure extraction of today's static-site content into plain,
 * Payload-shaped objects. No Payload imports, so this module can be tested
 * with a dry-run (see verify-site-data.ts) without a database.
 *
 * Data sources (repo root):
 *  - assets/news-data.js            → window.LAKE_NEWS (news docs)
 *  - assets/africa-network-map.js   → COUNTRY_META   (country docs)
 *  - leadership-*.html              → leader profiles
 */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { basename, extname, resolve } from 'path'

/* ------------------------------------------------------------------ */
/* Path helpers                                                        */
/* ------------------------------------------------------------------ */

/** Walk up from cwd until we find the repo root (contains assets/news-data.js). */
export function findRepoRoot(start: string = process.cwd()): string {
  let dir = resolve(start)
  for (let i = 0; i < 6; i++) {
    if (existsSync(resolve(dir, 'assets', 'news-data.js'))) return dir
    const parent = resolve(dir, '..')
    if (parent === dir) break
    dir = parent
  }
  return resolve(start, '..') // fall back to "backend/" parent
}

/** Normalize a site asset path (strip query, fix slashes) → absolute path. */
export function assetPath(root: string, src: string): string {
  if (!src) return ''
  const clean = src.replace(/[?#].*$/, '').replace(/\\/g, '/')
  if (/^(https?:)?\/\//.test(clean)) return '' // external — cannot seed
  return resolve(root, clean)
}

export function exists(root: string, src: string): boolean {
  const p = assetPath(root, src)
  return !!p && existsSync(p)
}

/* ------------------------------------------------------------------ */
/* Small utilities                                                      */
/* ------------------------------------------------------------------ */

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

function pad(n: string | number): string {
  return String(n).padStart(2, '0')
}

/** Decode the few HTML entities used in the leadership pages. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
}

/** "15 Feb, 2026" / "Apr, 2014" / "2014" → ISO "YYYY-MM-DD" or null. */
export function parseSiteDate(s: string): string | null {
  if (!s) return null
  let m = s.trim().match(/^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})$/)
  if (m && MONTHS[m[2]]) return `${m[3]}-${MONTHS[m[2]]}-${pad(m[1])}`
  m = s.trim().match(/^([A-Za-z]{3}),?\s+(\d{4})$/)
  if (m && MONTHS[m[1]]) return `${m[2]}-${MONTHS[m[1]]}-01`
  m = s.trim().match(/^(\d{4})$/)
  if (m) return `${m[1]}-01-01`
  return null
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/* ------------------------------------------------------------------ */
/* News — assets/news-data.js                                          */
/* ------------------------------------------------------------------ */

export interface NewsSeed {
  legacyId: number
  title: string
  slug: string
  date: string | null
  category: string
  excerpt: string
  bannerImage: string | null   // site asset path
  images: string[]             // site asset paths
  videoUrl: string | null
  description: string[]        // paragraphs
}

/** Read window.LAKE_NEWS from assets/news-data.js (fake window global). */
export function loadNews(root: string = findRepoRoot()): NewsSeed[] {
  const file = resolve(root, 'assets', 'news-data.js')
  if (!existsSync(file)) return []
  const code = readFileSync(file, 'utf8')
  const fn = new Function('window', `${code}\nreturn window.LAKE_NEWS;`)
  const raw: any[] = (fn({}) as any[]) || []
  const seen = new Set<string>()

  return raw
    .filter((a) => a && a.title)
    .map((a) => {
      let slug = slugify(a.title)
      if (seen.has(slug)) slug = `${slug}-${a.id}`.slice(0, 80)
      seen.add(slug)
      const paragraphs: string[] = Array.isArray(a.description)
        ? a.description.filter((p: any) => typeof p === 'string' && p.trim())
        : []
      const excerpt =
        paragraphs[0] ||
        (Array.isArray(a.images) && a.images.length
          ? 'View photos from this Lake Group event and announcement.'
          : a.video
            ? 'Watch the Lake Gas feature video from this announcement.'
            : 'Read the full story from Lake Group news and events.')
      return {
        legacyId: typeof a.id === 'number' ? a.id : 0,
        title: String(a.title),
        slug,
        date: parseSiteDate(String(a.date || '')),
        category: String(a.category || 'Announcements'),
        excerpt: excerpt.slice(0, 220),
        bannerImage: typeof a.bannerImage === 'string' && a.bannerImage ? a.bannerImage : null,
        images: Array.isArray(a.images) ? a.images.filter((i: any) => typeof i === 'string' && i) : [],
        videoUrl: typeof a.video === 'string' && a.video ? a.video : null,
        description: paragraphs,
      }
    })
}

/* ------------------------------------------------------------------ */
/* Countries — assets/africa-network-map.js (COUNTRY_META)             */
/* ------------------------------------------------------------------ */

export interface CountrySeed {
  key: string        // map key (tz, ke, …) — used for the flag SVG
  name: string
  code: string       // ISO 3166-1 alpha-2
  lat: number
  lng: number
  zoom: number
  isHeadquarters: boolean
}

export function loadCountries(root: string = findRepoRoot()): CountrySeed[] {
  const file = resolve(root, 'assets', 'africa-network-map.js')
  if (!existsSync(file)) return []
  const code = readFileSync(file, 'utf8')
  const re = /([a-z]{2}):\s*\{\s*iso:\s*'([A-Z]{2})',\s*name:\s*'([^']+)',\s*center:\s*\[(-?[\d.]+),\s*(-?[\d.]+)\],\s*zoom:\s*(\d+)/g
  const out: CountrySeed[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(code)) !== null) {
    out.push({
      key: m[1],
      name: m[3],
      code: m[2],
      lat: parseFloat(m[4]),
      lng: parseFloat(m[5]),
      zoom: parseInt(m[6], 10),
      isHeadquarters: m[2] === 'TZ',
    })
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Leaders — leadership-*.html                                         */
/* ------------------------------------------------------------------ */

export interface LeaderSeed {
  slug: string
  name: string
  role: string
  unit: string
  lede: string
  bio: string[]                 // paragraphs
  quote: string | null
  mandate: string[]             // responsibility list
  facts: { label: string; value: string }[]
  photo: string | null          // site asset path
  isLogo: boolean
  featured: boolean
  sortOrder: number
}

/** Extract the <article class="lp-body ..."> block from a profile page. */
function extractLpBody(html: string): string {
  const m = html.match(/<article class="lp-body[\s\S]*?<\/article>/)
  return m ? m[0] : ''
}

function grab(block: string, pattern: RegExp): string | null {
  const m = block.match(pattern)
  return m ? stripTags(m[1]) : null
}

export function loadLeaders(root: string = findRepoRoot()): LeaderSeed[] {
  const files = readdirSync(resolve(root))
    .filter((f) => /^leadership-[\w-]+\.html$/.test(f))
    .sort()

  // Directory order + featured flag from leadership.html
  let directoryOrder: string[] = []
  let featuredSlug: string | null = null
  const hubFile = resolve(root, 'leadership.html')
  if (existsSync(hubFile)) {
    const hub = readFileSync(hubFile, 'utf8')
    directoryOrder = Array.from(hub.matchAll(/href="leadership-([\w-]+)\.html"/g)).map((m) => m[1])
    const feat = hub.match(/ld-person-card--featured[^>]*href="leadership-([\w-]+)\.html"/)
    if (feat) featuredSlug = feat[1]
  }

  const out: LeaderSeed[] = []
  for (const file of files) {
    const slug = file.replace(/^leadership-/, '').replace(/\.html$/, '')
    const html = readFileSync(resolve(root, file), 'utf8')
    const body = extractLpBody(html)
    if (!body) continue

    const photoMatch = body.match(/class="lp-photo([^"]*)"[^>]*>\s*<img src="([^"]+)"/)
    const photo = photoMatch && photoMatch[2] ? photoMatch[2] : null
    const isLogo = !!(photoMatch && photoMatch[1] && photoMatch[1].includes('--logo'))

    const mandate: string[] = []
    const mandateBlock = body.match(/<ul class="lp-mandate">([\s\S]*?)<\/ul>/)
    if (mandateBlock) {
      const lis = Array.from(mandateBlock[1].matchAll(/<li>([\s\S]*?)<\/li>/g))
      for (const li of lis) {
        const spans = Array.from(li[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)).map((s) => stripTags(s[1]))
        const text = spans[spans.length - 1]
        if (text) mandate.push(text)
      }
    }

    const facts: { label: string; value: string }[] = []
    const metaBlock = body.match(/<div class="lp-meta">([\s\S]*?)<\/div>\s*(?:<div class="lp-links"|<\/article>)/)
    if (metaBlock) {
      const pairs = Array.from(metaBlock[1].matchAll(/<div>\s*<strong[^>]*>([\s\S]*?)<\/strong>\s*<span[^>]*>([\s\S]*?)<\/span>\s*<\/div>/g))
      for (const p of pairs) {
        const label = stripTags(p[1])
        const value = stripTags(p[2])
        if (label || value) facts.push({ label, value })
      }
    }

    const lede = grab(body, /<p class="lp-lede"[^>]*>([\s\S]*?)<\/p>/)
    const bio: string[] = []
    const bioRe = /<p data-i18n="[^"]*"[^>]*>([\s\S]*?)<\/p>/g
    let bm: RegExpExecArray | null
    while ((bm = bioRe.exec(body)) !== null) {
      const text = stripTags(bm[1])
      if (text && text !== lede) bio.push(text)
    }

    const orderIdx = directoryOrder.indexOf(slug)
    out.push({
      slug,
      name: grab(body, /<h1 class="lp-name"[^>]*>([\s\S]*?)<\/h1>/) || '',
      role: grab(body, /<p class="lp-role"[^>]*>([\s\S]*?)<\/p>/) || '',
      unit: grab(body, /<div class="lp-unit"[^>]*>([\s\S]*?)<\/div>/) || '',
      lede: lede || '',
      bio,
      quote: grab(body, /<blockquote class="lp-quote"[^>]*>([\s\S]*?)<\/blockquote>/),
      mandate,
      facts,
      photo,
      isLogo,
      featured: slug === featuredSlug,
      sortOrder: orderIdx === -1 ? 999 : orderIdx + 1,
    })
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Media mime lookup                                                   */
/* ------------------------------------------------------------------ */

export function mimeFor(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.avif': 'image/avif', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
  }
  return map[ext] || 'application/octet-stream'
}

export function mediaName(filePath: string): string {
  return basename(filePath)
}
