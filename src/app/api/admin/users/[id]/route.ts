/**
 * GET /api/admin/users/:id
 * Per-user analytics: plays, timeline, top tracks.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminRole } from '@/lib/guard'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRole(req)
  if (auth instanceof NextResponse) return auth

  const { id: userId } = await params
  if (!userId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 })

  const thirtyAgo = isoDaysAgo(30)

  try {
    const [userRes, plays30Res, totalCountRes] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(userId),
      supabaseAdmin
        .from('Play')
        .select('trackId, playedAt')
        .eq('userId', userId)
        .gte('playedAt', thirtyAgo)
        .limit(5000),
      supabaseAdmin
        .from('Play')
        .select('*', { count: 'exact', head: true })
        .eq('userId', userId),
    ])

    if (userRes.error || !userRes.data.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user  = userRes.data.user
    const plays = plays30Res.data ?? []

    // ── Timeline & track counts ──────────────────────────────────────────────
    const playsByDay  = new Map<string, number>()
    const trackCounts = new Map<string, number>()

    for (const row of plays) {
      const day = (row.playedAt as string)?.slice(0, 10)
      if (day) playsByDay.set(day, (playsByDay.get(day) ?? 0) + 1)
      const tid = row.trackId as string
      if (tid) trackCounts.set(tid, (trackCounts.get(tid) ?? 0) + 1)
    }

    const playsTimeline: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      playsTimeline.push({ date: key, count: playsByDay.get(key) ?? 0 })
    }

    // ── Top tracks ───────────────────────────────────────────────────────────
    const topTrackEntries = [...trackCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    let topTracks: { id: string; name: string; plays: number; artistName: string }[] = []

    if (topTrackEntries.length) {
      const { data: trkData } = await supabaseAdmin
        .from('Track')
        .select('id, name, artistId')
        .in('id', topTrackEntries.map(([id]) => id))

      const artistIds = [...new Set((trkData ?? []).map((t: { artistId: string }) => t.artistId).filter(Boolean))]
      const artistMap = new Map<string, string>()

      if (artistIds.length) {
        const { data: artData } = await supabaseAdmin
          .from('Artist')
          .select('id, name')
          .in('id', artistIds)
        for (const a of artData ?? []) artistMap.set(a.id as string, a.name as string)
      }

      const byId = new Map((trkData ?? []).map((t: { id: string; name: string; artistId: string }) => [t.id, t]))
      topTracks = topTrackEntries.map(([id, playCount]) => {
        const t = byId.get(id)
        return {
          id,
          name: (t?.name as string) ?? '—',
          plays: playCount,
          artistName: t?.artistId ? (artistMap.get(t.artistId as string) ?? '—') : '—',
        }
      })
    }

    const meta = user.app_metadata as Record<string, unknown> | undefined
    const bannedUntil = (user as { banned_until?: string | null }).banned_until

    return NextResponse.json({
      id:               user.id,
      email:            user.email ?? '—',
      createdAt:        user.created_at,
      lastSignInAt:     user.last_sign_in_at ?? null,
      role:             meta?.role === 'admin' ? 'admin' : 'listener',
      banned:           bannedUntil != null && bannedUntil !== '',
      totalPlaysAllTime: totalCountRes.count ?? 0,
      playsLast30d:     plays.length,
      uniqueTracks30d:  trackCounts.size,
      daysActive30d:    playsByDay.size,
      playsTimeline,
      topTracks,
    })
  } catch (e) {
    log.error({ err: String(e), userId }, '[admin/users/id] failed')
    return NextResponse.json({ error: 'Failed to load user analytics' }, { status: 500 })
  }
}
