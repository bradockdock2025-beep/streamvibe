import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { deleteArtistCascade } from '@/lib/music-delete'
import { requireAdmin } from '@/lib/guard'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/artists/:id — returns artist with all albums + tracks
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params

  const { data: artist, error } = await supabaseAdmin
    .from('Artist')
    .select('*, albums:Album(*, tracks:Track(*))')
    .eq('id', id)
    .single()

  if (error || !artist) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Sort albums by year desc, tracks by trackNumber asc
  const result = {
    ...artist,
    albums: (artist.albums ?? [])
      .sort((a: { year: string }, b: { year: string }) => b.year.localeCompare(a.year))
      .map((album: { tracks?: Array<{ trackNumber: number }> }) => ({
        ...album,
        tracks: (album.tracks ?? []).sort(
          (a: { trackNumber: number }, b: { trackNumber: number }) => a.trackNumber - b.trackNumber
        ),
      })),
  }

  return NextResponse.json(result)
}

// PATCH /api/artists/:id
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body   = await req.json()

  const allowed = ['name', 'image', 'bio'] as const
  const data: Record<string, string> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const { data: updated, error } = await supabaseAdmin
    .from('Artist')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}

// DELETE /api/artists/:id
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const { id } = await params

  try {
    const summary = await deleteArtistCascade(id)
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message = String(error)
    const status = message.toLowerCase().includes('not found') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
