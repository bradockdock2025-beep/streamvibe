import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit } from '@/lib/ratelimit'

export interface SearchTrack {
  id: string; name: string; dur: string; albumId: string
  albumName: string; albumCover: string; artistName: string
}
export interface SearchAlbum {
  id: string; name: string; cover: string; artistName: string; year: string; trackCount: number
}
export interface SearchArtist {
  id: string; name: string; image: string; albumCount: number; trackCount: number
}
export interface SearchResults {
  tracks: SearchTrack[]; albums: SearchAlbum[]; artists: SearchArtist[]
  query: string; total: number
}

// GET /api/search?q=xxx&limit=5
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, 'read')
  if (limited) return limited

  const { searchParams } = req.nextUrl
  const q     = searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(10, Math.max(1, parseInt(searchParams.get('limit') ?? '5', 10)))

  if (q.length < 2) {
    return NextResponse.json({ tracks: [], albums: [], artists: [], query: q, total: 0 })
  }

  const pattern = `%${q}%`

  const [tracksRes, albumsRes, artistsRes] = await Promise.all([
    supabaseAdmin
      .from('Track')
      .select('id, name, dur, albumId, album:Album(id, name, cover, artist:Artist(name))')
      .ilike('name', pattern)
      .limit(limit),

    supabaseAdmin
      .from('Album')
      .select('id, name, cover, year, artist:Artist(name), tracks:Track(id)')
      .ilike('name', pattern)
      .limit(limit),

    supabaseAdmin
      .from('Artist')
      .select('id, name, image')
      .ilike('name', pattern)
      .limit(limit),
  ])

  // Build album/track counts for artists
  const artistIds = (artistsRes.data ?? []).map((a) => a.id)
  const [albumCounts, trackCounts] = artistIds.length
    ? await Promise.all([
        supabaseAdmin.from('Album').select('artistId').in('artistId', artistIds),
        supabaseAdmin.from('Track').select('artistId').in('artistId', artistIds),
      ])
    : [{ data: [] }, { data: [] }]

  const albumCountMap = new Map<string, number>()
  const trackCountMap = new Map<string, number>()
  for (const r of albumCounts.data ?? []) albumCountMap.set(r.artistId, (albumCountMap.get(r.artistId) ?? 0) + 1)
  for (const r of trackCounts.data ?? []) trackCountMap.set(r.artistId, (trackCountMap.get(r.artistId) ?? 0) + 1)

  const tracks: SearchTrack[] = (tracksRes.data ?? []).map((t) => {
    const album = Array.isArray(t.album) ? t.album[0] : t.album
    const artist = Array.isArray(album?.artist) ? album.artist[0] : album?.artist
    return {
      id: t.id, name: t.name, dur: t.dur ?? '0:00',
      albumId: t.albumId,
      albumName: album?.name ?? '',
      albumCover: album?.cover ?? '',
      artistName: artist?.name ?? '',
    }
  })

  const albums: SearchAlbum[] = (albumsRes.data ?? []).map((a) => {
    const artist = Array.isArray(a.artist) ? a.artist[0] : a.artist
    return {
      id: a.id, name: a.name, cover: a.cover ?? '',
      artistName: artist?.name ?? '',
      year: a.year ?? '',
      trackCount: Array.isArray(a.tracks) ? a.tracks.length : 0,
    }
  })

  const artists: SearchArtist[] = (artistsRes.data ?? []).map((a) => ({
    id: a.id, name: a.name, image: a.image ?? '',
    albumCount: albumCountMap.get(a.id) ?? 0,
    trackCount: trackCountMap.get(a.id) ?? 0,
  }))

  const total = tracks.length + albums.length + artists.length
  return NextResponse.json({ tracks, albums, artists, query: q, total } satisfies SearchResults)
}
