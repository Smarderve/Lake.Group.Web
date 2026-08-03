import Link from 'next/link'

const endpoints = [
  { href: '/api/news', label: 'News API' },
  { href: '/api/leaders', label: 'Leaders API' },
  { href: '/api/companies', label: 'Companies API' },
  { href: '/api/countries', label: 'Countries API' },
  { href: '/api/media', label: 'Media API' },
]

export default function Home() {
  return (
    <main className="page">
      <span className="brand">Lake Group</span>
      <h1>Content CMS &amp; API</h1>
      <p className="lede">
        Self-hosted Payload backend for lakeoilgroup.com. Manage news,
        leadership, companies and countries, then consume them from the static
        website over REST.
      </p>
      <div className="links">
        <Link className="primary" href="/admin">
          Open admin dashboard →
        </Link>
        {endpoints.map((e) => (
          <Link key={e.href} href={e.href}>
            {e.label}
          </Link>
        ))}
      </div>
    </main>
  )
}
