import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { genId } from '@/lib/db'
import { cache, TTL, albumsCacheKey, invalidateAlbums } from '@/lib/cache'
import { rateLimit } from '@/lib/ratelimit'
import { log } from '@/lib/logger'

// GET /api/albums?artistId=xxx&search=xxx&page=1&limit=24
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, 'read')
  if (limited) return limited

  const { searchParams } = req.nextUrl
  const artistId = searchParams.get('artistId')
  const search   = searchParams.get('search')
  const page     = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10))
  const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '48', 10)))
  const from     = (page - 1) * limit
  const to       = from + limit - 1

  const cacheKey = await albumsCacheKey(`p${page}:l${limit}:a${artistId ?? ''}:s${search ?? ''}`)
  const cached = await cache.get(cacheKey)
  if (cached) return NextResponse.json(cached)

  let query = supabaseAdmin
    .from('Album')
    .select('*, artist:Artist(*), tracks:Track(*)', { count: 'exact' })
    .order('createdAt', { ascending: false })
    .range(from, to)

  if (artistId) query = query.eq('artistId', artistId)
  if (search)   query = query.ilike('name', `%${search}%`)

  const { data, error, count } = await query
  if (error) {
    log.error({ err: error }, '[api/albums GET]')
    return NextResponse.json({ error: error.message ?? error.code ?? JSON.stringify(error) }, { status: 500 })
  }

  const albums = (data ?? []).map((a) => ({
    ...a,
    tracks: (a.tracks ?? []).sort(
      (x: { trackNumber: number }, y: { trackNumber: number }) => x.trackNumber - y.trackNumber
    ),
  }))

  const result = { albums, total: count ?? 0, page, limit }
  await cache.set(cacheKey, result, TTL.albums)
  return NextResponse.json(result)
}

// POST /api/albums — create empty album (used internally)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, artistId, year, genre, cover } = body

  if (!name || !artistId) {
    return NextResponse.json({ error: 'name and artistId are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('Album')
    .insert({
      id:      genId(),
      name,
      artistId,
      year:    year  ?? '',
      genre:   genre ?? '',
      cover:   cover ?? '',
    })
    .select('*, artist:Artist(*), tracks:Track(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await invalidateAlbums()
  return NextResponse.json(data, { status: 201 })
}
