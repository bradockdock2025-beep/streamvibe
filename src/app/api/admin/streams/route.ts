/**
 * GET /api/admin/streams
 * Detailed streaming analytics: hourly heatmap, genre breakdown, recent plays.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminRole } from '@/lib/guard'
import { rateLimit } from '@/lib/ratelimit'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, 'read')
  if (limited) return limited

  const auth = await requireAdminRole(req)
  if (auth instanceof NextResponse) return auth

  const thirtyAgo = isoDaysAgo(30)

  try {
    const [playsSampleRes, recentPlaysRes] = await Promise.all([
      supabaseAdmin
        .from('Play')
        .select('trackId, userId, playedAt')
        .gte('playedAt', thirtyAgo)
        .limit(40000),
      supabaseAdmin
        .from('Play')
        .select('playedAt, trackId')
        .order('playedAt', { ascending: false })
        .limit(25),
    ])

    const plays = playsSampleRes.data ?? []
    if (playsSampleRes.error) {
      log.warn({ err: playsSampleRes.error.message }, '[admin/streams] plays sample error')
    }

    // ── Aggregation ─────────────────────────────────────────────────────────
    const playsByDay   = new Map<string, number>()
    const playsByHour  = new Map<number, number>()
    const trackCounts  = new Map<string, number>()
    const userIds      = new Set<string>()

    for (const row of plays) {
      const day  = (row.playedAt as string)?.slice(0, 10)
      const hour = row.playedAt ? new Date(row.playedAt as string).getUTCHours() : null
      const tid  = row.trackId as string
      const uid  = row.userId  as string

      if (day)   playsByDay.set(day, (playsByDay.get(day) ?? 0) + 1)
      if (hour != null) playsByHour.set(hour, (playsByHour.get(hour) ?? 0) + 1)
      if (tid)   trackCounts.set(tid, (trackCounts.get(tid) ?? 0) + 1)
      if (uid)   userIds.add(uid)
    }

    // ── 30-day timeline ──────────────────────────────────────────────────────
    const playsTimeline: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      playsTimeline.push({ date: key, count: playsByDay.get(key) ?? 0 })
    }

    // ── Hourly distribution (0–23 UTC) ───────────────────────────────────────
    const hourlyDistribution = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: playsByHour.get(h) ?? 0,
    }))

    // ── Genre distribution ───────────────────────────────────────────────────
    const uniqueTrackIds = [...trackCounts.keys()]
    const genreCounts    = new Map<string, number>()
    const CHUNK = 500
    for (let i = 0; i < uniqueTrackIds.length; i += CHUNK) {
      const slice = uniqueTrackIds.slice(i, i + CHUNK)
      const { data: trs } = await supabaseAdmin
        .from('Track')
        .select('id, genre')
        .in('id', slice)
      for (const t of trs ?? []) {
        const g = ((t.genre as string) || 'Unknown').trim() || 'Unknown'
        const n = trackCounts.get(t.id as string) ?? 0
        genreCounts.set(g, (genreCounts.get(g) ?? 0) + n)
      }
    }
    const genreDistribution = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([genre, count]) => ({ genre, count }))

    // ── Recent plays with track names ────────────────────────────────────────
    const recentRows = recentPlaysRes.data ?? []
    const recentIds  = [...new Set(recentRows.map((r) => r.trackId as string).filter(Boolean))]
    const trackNameMap = new Map<string, { name: string; artistName: string }>()

    if (recentIds.length) {
      const { data: trkData } = await supabaseAdmin
        .from('Track')
        .select('id, name, artistId')
        .in('id', recentIds)
      const artistIds = [...new Set((trkData ?? []).map((t: { artistId: string }) => t.artistId).filter(Boolean))]
      const artistMap = new Map<string, string>()
      if (artistIds.length) {
        const { data: artData } = await supabaseAdmin
          .from('Artist')
          .select('id, name')
          .in('id', artistIds)
        for (const a of artData ?? []) artistMap.set(a.id as string, a.name as string)
      }
      for (const t of trkData ?? []) {
        trackNameMap.set(t.id as string, {
          name: t.name as string,
          artistName: artistMap.get(t.artistId as string) ?? '—',
        })
      }
    }

    const recentPlays = recentRows.map((r) => ({
      playedAt: r.playedAt as string,
      trackName: trackNameMap.get(r.trackId as string)?.name ?? '—',
      artistName: trackNameMap.get(r.trackId as string)?.artistName ?? '—',
    }))

    const totalStreams30d = plays.length
    const peakDay = playsTimeline.reduce(
      (best, d) => (d.count > best.count ? d : best),
      { date: '—', count: 0 },
    )

    return NextResponse.json({
      totalStreams30d,
      avgStreamsPerDay: Math.round(totalStreams30d / 30),
      uniqueListeners30d: userIds.size,
      peakDay,
      playsTimeline,
      hourlyDistribution,
      genreDistribution,
      recentPlays,
      truncated: plays.length >= 40000,
    })
  } catch (e) {
    log.error({ err: String(e) }, '[admin/streams] failed')
    return NextResponse.json({ error: 'Streams analytics failed' }, { status: 500 })
  }
}
