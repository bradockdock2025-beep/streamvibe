import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { genId } from '@/lib/db'

// GET /api/albums?artistId=xxx&search=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const artistId = searchParams.get('artistId')
  const search   = searchParams.get('search')

  let query = supabaseAdmin
    .from('Album')
    .select('*, artist:Artist(*), tracks:Track(*)')
    .order('createdAt', { ascending: false })

  if (artistId) query = query.eq('artistId', artistId)
  if (search)   query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) {
    console.error('[api/albums GET]', error)
    return NextResponse.json({ error: error.message ?? error.code ?? JSON.stringify(error) }, { status: 500 })
  }

  // Sort embedded tracks by trackNumber
  const albums = (data ?? []).map((a) => ({
    ...a,
    tracks: (a.tracks ?? []).sort(
      (x: { trackNumber: number }, y: { trackNumber: number }) => x.trackNumber - y.trackNumber
    ),
  }))

  return NextResponse.json(albums)
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
  return NextResponse.json(data, { status: 201 })
}
