/**
 * POST /api/plays
 * Records a play event for the authenticated user.
 * Body: { trackId: string }
 * Fire-and-forget from the client — errors are logged, not surfaced.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/guard'
import { genId } from '@/lib/db'
import { rateLimit } from '@/lib/ratelimit'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'write')
  if (limited) return limited

  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  let body: { trackId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const trackId = typeof body.trackId === 'string' ? body.trackId.trim() : ''
  if (!trackId) return NextResponse.json({ error: 'trackId required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('Play').insert({
    id: genId(),
    trackId,
    userId: auth.userId,
  })

  if (error) {
    log.warn({ trackId, userId: auth.userId, err: error.message }, '[plays] Failed to record play')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
