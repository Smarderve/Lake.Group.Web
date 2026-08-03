/**
 * seed.ts — migrate today's static-site content into the CMS.
 *
 * Run from backend/ (requires a reachable database):
 *   npx payload run scripts/seed.ts
 *
 * Idempotent: countries upsert by `code`, news by `legacyId`, leaders by
 * `slug`. Media files are uploaded once and cached per absolute path.
 */
import { existsSync, readFileSync } from 'fs'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  findRepoRoot,
  loadNews,
  loadCountries,
  loadLeaders,
  assetPath,
  mimeFor,
  mediaName,
  type NewsSeed,
  type CountrySeed,
  type LeaderSeed,
} from './site-data'

const VALID_NEWS_CATEGORIES = [
  'Expansion', 'LPG', 'Awards', 'Business', 'Logistics',
  'Events', 'Sports', 'CSR', 'Announcements',
]

function validCategory(cat: string): string {
  return VALID_NEWS_CATEGORIES.includes(cat) ? cat : 'Announcements'
}

/** Convert plain paragraphs into Payload's Lexical rich-text state. */
function paragraphsToLexical(paragraphs: string[]): Record<string, unknown> {
  return {
    root: {
      type: 'root',
      version: 1,
      format: '',
      indent: 0,
      direction: null,
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        version: 1,
        format: '',
        indent: 0,
        direction: null,
        children: [{ type: 'text', text, version: 1, detail: 0, format: 0, mode: 'normal', style: '' }],
      })),
    },
  }
}

async function main(): Promise<void> {
  const payload = await getPayload({ config })
  const root = findRepoRoot()
  console.log(`Repo root: ${root}`)

  const mediaCache = new Map<string, number>()

  /** Upload a site asset into the media collection (best-effort, cached). */
  async function ensureMedia(asset: string | null, alt: string): Promise<number | null> {
    if (!asset) return null
    const abs = assetPath(root, asset)
    if (!abs || !existsSync(abs)) return null
    const cached = mediaCache.get(abs)
    if (cached != null) return cached
    try {
      const data = readFileSync(abs)
      const doc = (await payload.create({
        collection: 'media',
        data: { alt: alt || mediaName(abs) },
        file: { data, name: mediaName(abs), mimetype: mimeFor(abs), size: data.length },
      })) as { id: number }
      mediaCache.set(abs, doc.id)
      return doc.id
    } catch (err) {
      console.warn(`  ! media upload failed for ${asset}: ${(err as Error).message}`)
      return null
    }
  }

  /**
   * Find by unique field → update, else create.
   * `collection` is widened to any because Payload's local API is overloaded
   * per collection slug and a union type defeats its generics.
   */
  async function upsert(
    collection: 'countries' | 'news' | 'leaders',
    where: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Promise<void> {
    const opts = { collection, where, limit: 1 } as any
    const found = await payload.find(opts)
    if (found.docs.length) {
      await payload.update({ collection: collection as any, id: found.docs[0].id, data: data as any })
    } else {
      await payload.create({ collection: collection as any, data: data as any })
    }
  }

  /* ------------------------------- Countries ------------------------ */
  const countries: CountrySeed[] = loadCountries(root)
  console.log(`\nCountries (${countries.length}):`)
  for (const c of countries) {
    const flagId = await ensureMedia(`assets/images/flags/${c.key}.svg`, `${c.name} flag`)
    await upsert(
      'countries',
      { code: { equals: c.code } },
      {
        name: c.name,
        code: c.code,
        isOperational: true,
        isHeadquarters: c.isHeadquarters,
        flag: flagId ?? undefined,
        lat: c.lat,
        lng: c.lng,
        defaultZoom: c.zoom,
      },
    )
    console.log(`  ✓ ${c.code} — ${c.name}`)
  }

  /* ---------------------------------- News --------------------------- */
  const news: NewsSeed[] = loadNews(root)
  console.log(`\nNews articles (${news.length}):`)
  for (const n of news) {
    const bannerId = await ensureMedia(n.bannerImage, n.title)
    const MAX_GALLERY = 12
    const imageIds: number[] = []
    if (n.images.length > MAX_GALLERY) {
      console.warn(`    (capping gallery for #${n.legacyId} at ${MAX_GALLERY}/${n.images.length} images)`)
    }
    for (const img of n.images.slice(0, MAX_GALLERY)) {
      const id = await ensureMedia(img, `${n.title} photo`)
      if (id != null) imageIds.push(id)
    }
    await upsert(
      'news',
      { legacyId: { equals: n.legacyId } },
      {
        legacyId: n.legacyId,
        title: n.title,
        slug: n.slug,
        status: 'published',
        date: n.date || '2006-01-01',
        category: validCategory(n.category),
        excerpt: n.excerpt,
        bannerImage: bannerId ?? undefined,
        description: n.description.map((p) => ({ paragraph: p })),
        images: imageIds.map((image) => ({ image })),
        videoUrl: n.videoUrl || undefined,
      },
    )
    console.log(`  ✓ #${n.legacyId} — ${n.title.slice(0, 60)}`)
  }

  /* -------------------------------- Leaders -------------------------- */
  const leaders: LeaderSeed[] = loadLeaders(root)
  console.log(`\nLeaders (${leaders.length}):`)
  for (const l of leaders) {
    const photoId = await ensureMedia(l.photo, l.name)
    await upsert(
      'leaders',
      { slug: { equals: l.slug } },
      {
        name: l.name,
        role: l.role,
        unit: l.unit,
        slug: l.slug,
        featured: l.featured,
        sortOrder: l.sortOrder,
        photo: photoId ?? undefined,
        isLogo: l.isLogo,
        lede: l.lede,
        bio: paragraphsToLexical(l.bio),
        quote: l.quote || undefined,
        mandate: l.mandate.map((item) => ({ item })),
        facts: l.facts.map((f) => ({ label: f.label, value: f.value })),
      },
    )
    console.log(`  ✓ ${l.slug} — ${l.name}`)
  }

  console.log(`\nDone — ${countries.length} countries, ${news.length} news, ${leaders.length} leaders.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
