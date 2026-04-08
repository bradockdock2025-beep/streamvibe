/**
 * GET /api/analytics
 * Returns listening analytics for the authenticated user.
 * Calls 4 PostgreSQL functions created in migration 003.
 *
 * Response: { stats, topTracks, topArtists, history }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/guard'
import { rateLimit } from '@/lib/ratelimit'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, 'read')
  if (limited) return limited

  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const uid = auth.userId

  const [statsRes, topTracksRes, topArtistsRes, historyRes] = await Promise.all([
    supabaseAdmin.rpc('get_play_stats',   { p_user_id: uid }),
    supabaseAdmin.rpc('get_top_tracks',   { p_user_id: uid, p_limit: 10 }),
    supabaseAdmin.rpc('get_top_artists',  { p_user_id: uid, p_limit: 6 }),
    supabaseAdmin.rpc('get_play_history', { p_user_id: uid, p_limit: 20 }),
  ])

  if (statsRes.error)      log.warn({ err: statsRes.error.message },      '[analytics] get_play_stats failed')
  if (topTracksRes.error)  log.warn({ err: topTracksRes.error.message },  '[analytics] get_top_tracks failed')
  if (topArtistsRes.error) log.warn({ err: topArtistsRes.error.message }, '[analytics] get_top_artists failed')
  if (historyRes.error)    log.warn({ err: historyRes.error.message },    '[analytics] get_play_history failed')

  const stats       = Array.isArray(statsRes.data)      ? statsRes.data[0]      : null
  const topTracks   = Array.isArray(topTracksRes.data)  ? topTracksRes.data     : []
  const topArtists  = Array.isArray(topArtistsRes.data) ? topArtistsRes.data    : []
  const history     = Array.isArray(historyRes.data)    ? historyRes.data       : []

  return NextResponse.json({ stats, topTracks, topArtists, history })
}
