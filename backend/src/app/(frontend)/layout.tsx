import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lake Group CMS',
  description:
    'Self-hosted content backend for lakeoilgroup.com — news, leadership, companies, countries and media.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
