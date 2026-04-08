import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { upsertArtist } from '@/lib/db'
import { cache, TTL } from '@/lib/cache'
import { rateLimit } from '@/lib/ratelimit'

// GET /api/artists?page=1&limit=48&search=xxx
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, 'read')
  if (limited) return limited

  const { searchParams } = req.nextUrl
  const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10))
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '48', 10)))
  const search = searchParams.get('search')?.trim()
  const from   = (page - 1) * limit
  const to     = from + limit - 1

  const cacheKey = `artists:p${page}:l${limit}:s${search ?? ''}`
  const cached = await cache.get(cacheKey)
  if (cached) return NextResponse.json(cached)

  // Three parallel queries — no N+1, no fetching full rows just to count
  const [artistsRes, albumsRes, tracksRes] = await Promise.all([
    (() => {
      let q = supabaseAdmin
        .from('Artist')
        .select('id, name, image, bio, createdAt', { count: 'exact' })
        .order('name', { ascending: true })
        .range(from, to)
      if (search) q = q.ilike('name', `%${search}%`)
      return q
    })(),

    supabaseAdmin
      .from('Album')
      .select('artistId'),

    supabaseAdmin
      .from('Track')
      .select('artistId'),
  ])

  if (artistsRes.error) return NextResponse.json({ error: artistsRes.error.message }, { status: 500 })
  const total = artistsRes.count ?? 0

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

  const result = { artists, total, page, limit }
  await cache.set(cacheKey, result, TTL.artists)
  return NextResponse.json(result)
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
