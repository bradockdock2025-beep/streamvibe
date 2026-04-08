import ClientHubApp from '@/components/ClientHubApp'
import { fetchInitialAlbums, fetchInitialArtists } from '@/lib/server-data'

/**
 * Server Component — runs on the server before any JS reaches the browser.
 *
 * Fetches public library data (albums + artists) directly from Supabase,
 * avoiding an extra client-side round-trip on first load.
 *
 * User-specific data (likes, playlists) is still fetched client-side after
 * Supabase Auth resolves the session.
 */
export default async function Home() {
  const [initialAlbums, initialArtists] = await Promise.all([
    fetchInitialAlbums(),
    fetchInitialArtists(),
  ])

  return (
    <ClientHubApp
      initialAlbums={initialAlbums}
      initialArtists={initialArtists}
    />
  )
}
