import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/guard'
import { genId } from '@/lib/db'
import { rateLimit } from '@/lib/ratelimit'

// GET /api/likes — list liked track IDs for the authenticated user
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, 'read')
  if (limited) return limited

  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabaseAdmin
    .from('Like')
    .select('trackId')
    .eq('userId', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map((l: { trackId: string }) => l.trackId))
}

// POST /api/likes  body: { trackId }  — toggle like for authenticated user
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'write')
  if (limited) return limited

  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { trackId } = await req.json()
  if (!trackId) return NextResponse.json({ error: 'trackId required' }, { status: 400 })

  const { data: existing } = await supabaseAdmin
    .from('Like')
    .select('id')
    .eq('trackId', trackId)
    .eq('userId', auth.userId)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin.from('Like').delete().eq('id', existing.id)
    return NextResponse.json({ liked: false })
  } else {
    await supabaseAdmin.from('Like').insert({ id: genId(), trackId, userId: auth.userId })
    return NextResponse.json({ liked: true })
  }
}
