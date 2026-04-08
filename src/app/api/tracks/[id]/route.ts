import { NextRequest, NextResponse } from 'next/server'
import { deleteTrackCascade } from '@/lib/music-delete'
import { requireAdminRole } from '@/lib/guard'

type Ctx = { params: Promise<{ id: string }> }

// DELETE /api/tracks/:id
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdminRole(req)
  if (auth instanceof NextResponse) return auth

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
