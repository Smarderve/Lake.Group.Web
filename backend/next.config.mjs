import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output keeps the production bundle self-contained so the
  // multi-stage Dockerfile only ships what the runtime needs.
  output: 'standalone',
}

export default withPayload(nextConfig)
