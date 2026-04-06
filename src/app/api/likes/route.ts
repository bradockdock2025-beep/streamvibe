import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { genId } from '@/lib/db'

// GET /api/likes — list all liked track IDs
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('Like')
    .select('trackId')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map((l: { trackId: string }) => l.trackId))
}

// POST /api/likes  body: { trackId }  — toggle like
export async function POST(req: NextRequest) {
  const { trackId } = await req.json()
  if (!trackId) return NextResponse.json({ error: 'trackId required' }, { status: 400 })

  const { data: existing } = await supabaseAdmin
    .from('Like')
    .select('id')
    .eq('trackId', trackId)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin.from('Like').delete().eq('trackId', trackId)
    return NextResponse.json({ liked: false })
  } else {
    await supabaseAdmin.from('Like').insert({ id: genId(), trackId })
    return NextResponse.json({ liked: true })
  }
}
