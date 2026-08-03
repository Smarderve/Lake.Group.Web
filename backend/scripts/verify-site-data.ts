/**
 * verify-site-data.ts — dry-run: validates the extraction module against the
 * real site files WITHOUT a database. Run from backend/:
 *   npx tsx scripts/verify-site-data.ts
 */
import { existsSync } from 'fs'
import {
  findRepoRoot,
  loadNews,
  loadCountries,
  loadLeaders,
  exists,
  assetPath,
} from './site-data'

let failures = 0

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ✓ ${name}`)
  } else {
    failures++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function main(): void {
  const root = findRepoRoot()
  console.log(`Repo root: ${root}`)
  check('repo root found', existsSync(assetPath(root, 'assets/news-data.js')))

  /* ------------------------------ News ------------------------------ */
  console.log('\nNews:')
  const news = loadNews(root)
  check('loaded ≥ 30 articles', news.length >= 30, `got ${news.length}`)
  const noDate = news.filter((n) => !n.date)
  check('every article has a parseable date', noDate.length === 0, noDate.map((n) => n.legacyId).join(','))
  const dupSlugs = news.filter((n, i) => news.findIndex((x) => x.slug === n.slug) !== i)
  check('slugs are unique', dupSlugs.length === 0, dupSlugs.map((n) => n.slug).join(','))
  const missingBanners = news.filter((n) => n.bannerImage && !exists(root, n.bannerImage))
  console.log(`  (${missingBanners.length} banner images reference missing files — will be skipped gracefully)`)
  const sample = news[0]
  console.log(`  sample: #${sample.legacyId} "${sample.title}" → ${sample.date} [${sample.category}]`)

  /* --------------------------- Countries ---------------------------- */
  console.log('\nCountries:')
  const countries = loadCountries(root)
  check('loaded ≥ 9 countries', countries.length >= 9, `got ${countries.length}`)
  check('includes Tanzania as HQ', countries.some((c) => c.isHeadquarters && c.code === 'TZ'))
  const missingFlags = countries.filter((c) => !exists(root, `assets/images/flags/${c.key}.svg`))
  check('all flag SVGs exist', missingFlags.length === 0, missingFlags.map((c) => c.key).join(','))
  console.log(`  ${countries.map((c) => `${c.code}:${c.name}`).join(', ')}`)

  /* ---------------------------- Leaders ----------------------------- */
  console.log('\nLeaders:')
  const leaders = loadLeaders(root)
  check('loaded ≥ 7 leaders', leaders.length >= 7, `got ${leaders.length}`)
  check('exactly one featured leader', leaders.filter((l) => l.featured).length === 1)
  const named = leaders.filter((l) => l.name && l.role)
  check('all leaders have name + role', named.length === leaders.length)
  const missingPhotos = leaders.filter((l) => l.photo && !l.isLogo && !exists(root, l.photo))
  check('leader photos exist', missingPhotos.length === 0, missingPhotos.map((l) => l.slug).join(','))
  leaders.forEach((l) => {
    console.log(
      `  ${l.sortOrder}. ${l.name} — ${l.role}${l.featured ? ' [FEATURED]' : ''} (${l.bio.length} bio paras, ${l.facts.length} facts)`,
    )
  })

  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll extraction checks PASSED')
  process.exit(failures ? 1 : 0)
}

main()
