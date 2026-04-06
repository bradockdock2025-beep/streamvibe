import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { upsertArtist } from '@/lib/db'

// GET /api/artists
export async function GET() {
  // Three parallel queries — no N+1, no fetching full rows just to count
  const [artistsRes, albumsRes, tracksRes] = await Promise.all([
    supabaseAdmin
      .from('Artist')
      .select('id, name, image, bio, createdAt')
      .order('name', { ascending: true }),

    supabaseAdmin
      .from('Album')
      .select('artistId'),

    supabaseAdmin
      .from('Track')
      .select('artistId'),
  ])

  if (artistsRes.error) return NextResponse.json({ error: artistsRes.error.message }, { status: 500 })

  // Build count maps in O(N) — no nested loops
  const albumCount = new Map<string, number>()
  const trackCount = new Map<string, number>()

  for (const row of albumsRes.data ?? []) {
    albumCount.set(row.artistId, (albumCount.get(row.artistId) ?? 0) + 1)
  }
  for (const row of tracksRes.data ?? []) {
    trackCount.set(row.artistId, (trackCount.get(row.artistId) ?? 0) + 1)
  }

  const artists = (artistsRes.data ?? []).map((a) => ({
    id:         a.id,
    name:       a.name,
    image:      a.image,
    bio:        a.bio,
    createdAt:  a.createdAt,
    albumCount: albumCount.get(a.id) ?? 0,
    trackCount: trackCount.get(a.id) ?? 0,
  }))

  return NextResponse.json(artists)
}

// POST /api/artists — upsert by name
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  try {
    const artist = await upsertArtist(body.name.trim(), body.image ?? '', body.bio ?? '')
    return NextResponse.json(artist, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
