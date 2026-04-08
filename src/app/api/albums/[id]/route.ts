import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { deleteAlbumCascade } from '@/lib/music-delete'
import { requireAdminRole } from '@/lib/guard'
import { invalidateAlbums, invalidateArtists } from '@/lib/cache'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/albums/:id
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('Album')
    .select('*, artist:Artist(*), tracks:Track(*)')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const album = {
    ...data,
    tracks: (data.tracks ?? []).sort(
      (a: { trackNumber: number }, b: { trackNumber: number }) => a.trackNumber - b.trackNumber
    ),
  }

  return NextResponse.json(album)
}

// PATCH /api/albums/:id
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body   = await req.json()

  const allowed = ['name', 'year', 'genre', 'cover'] as const
  const data: Record<string, string> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const { data: updated, error } = await supabaseAdmin
    .from('Album')
    .update(data)
    .eq('id', id)
    .select('*, artist:Artist(*), tracks:Track(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await invalidateAlbums()
  return NextResponse.json(updated)
}

// DELETE /api/albums/:id
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdminRole(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  try {
    const summary = await deleteAlbumCascade(id)
    await Promise.all([invalidateAlbums(), invalidateArtists()])
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message = String(error)
    const status = message.toLowerCase().includes('not found') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
