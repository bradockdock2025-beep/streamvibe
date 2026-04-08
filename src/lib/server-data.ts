/**
 * Server-only data fetchers — imported ONLY from Server Components / Server Actions.
 * These hit Supabase directly (no HTTP round-trip) using the service-role client.
 *
 * Public data (albums, artists) can be fetched without user auth.
 * User-specific data (likes, playlists) is fetched client-side after auth resolves.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Album, Artist } from '@/types'

function sortTracks<T extends { trackNumber: number }>(tracks: T[]): T[] {
  return [...tracks].sort((a, b) => a.trackNumber - b.trackNumber)
}

export async function fetchInitialAlbums(): Promise<Album[]> {
  const { data, error } = await supabaseAdmin
    .from('Album')
    .select('*, artist:Artist(id, name, image, bio), tracks:Track(*)')
    .order('createdAt', { ascending: false })
    .limit(100)

  if (error || !data) return []

  return data.map((a) => ({
    id:       a.id,
    name:     a.name,
    artistId: a.artistId,
    artist:   a.artist?.name ?? '',
    cover:    a.cover ?? '',
    year:     a.year  ?? '',
    genre:    a.genre ?? '',
    tracks:   sortTracks(
      (a.tracks ?? []).map((t: Record<string, unknown>) => ({
        id:          t.id          as string,
        name:        t.name        as string,
        dur:         (t.dur        as string) || '0:00',
        durationSec: (t.durationSec as number) ?? 0,
        trackNumber: (t.trackNumber as number) ?? 0,
        fileUrl:     (t.fileUrl    as string) ?? '',
        fileSize:    (t.fileSize   as number) ?? 0,
        format:      (t.format     as string) ?? '',
        genre:       (t.genre      as string) ?? '',
        albumId:     t.albumId     as string,
        artistId:    t.artistId    as string,
      })),
    ),
  }))
}

export async function fetchInitialArtists(): Promise<Artist[]> {
  const [artistsRes, albumsRes, tracksRes] = await Promise.all([
    supabaseAdmin
      .from('Artist')
      .select('id, name, image, bio, createdAt')
      .order('name', { ascending: true })
      .limit(100),
    supabaseAdmin.from('Album').select('artistId'),
    supabaseAdmin.from('Track').select('artistId'),
  ])

  if (artistsRes.error || !artistsRes.data) return []

  const albumCount = new Map<string, number>()
  const trackCount = new Map<string, number>()
  for (const row of albumsRes.data ?? []) albumCount.set(row.artistId, (albumCount.get(row.artistId) ?? 0) + 1)
  for (const row of tracksRes.data ?? []) trackCount.set(row.artistId, (trackCount.get(row.artistId) ?? 0) + 1)

  return artistsRes.data.map((a) => ({
    id:         a.id,
    name:       a.name,
    image:      a.image ?? '',
    bio:        a.bio   ?? '',
    albumCount: albumCount.get(a.id) ?? 0,
    trackCount: trackCount.get(a.id) ?? 0,
  }))
}
