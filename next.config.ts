import type { NextConfig } from 'next'

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

export default nextConfig
