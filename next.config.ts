import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const SUPABASE_HOSTNAME = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (audio covers, artist images)
      {
        protocol: 'https',
        hostname:  SUPABASE_HOSTNAME,
        pathname:  '/storage/v1/object/public/**',
      },
      // Placeholder images used by seed data
      {
        protocol: 'https',
        hostname:  'picsum.photos',
      },
    ],
  },
}

export default withSentryConfig(nextConfig, {
  // Sentry org/project from dashboard
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress the Sentry CLI output during builds
  silent: true,

  // Automatically instrument Next.js data fetching methods
  autoInstrumentServerFunctions: true,

  // Disable source map upload during local dev
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },
})
