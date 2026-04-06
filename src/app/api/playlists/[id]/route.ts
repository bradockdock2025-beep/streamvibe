import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/guard'

type Ctx = { params: Promise<{ id: string }> }

// DELETE /api/playlists/:id
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const { id } = await params

  const { data: existing, error: findError } = await supabaseAdmin
    .from('Playlist')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 })
  }

  if (!existing) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('Playlist')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, deletedPlaylistId: id })
}
