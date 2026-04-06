import { NextRequest, NextResponse } from 'next/server'
import { deleteTrackCascade } from '@/lib/music-delete'
import { requireAdmin } from '@/lib/guard'

type Ctx = { params: Promise<{ id: string }> }

// DELETE /api/tracks/:id
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const { id } = await params

  try {
    const summary = await deleteTrackCascade(id)
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message = String(error)
    const status = message.toLowerCase().includes('not found') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
