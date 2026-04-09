/**
 * GET /api/admin/dashboard
 * Métricas agregadas para o painel administrativo (apenas role admin).
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

  const weekAgo = isoDaysAgo(7)
  const thirtyAgo = isoDaysAgo(30)

  try {
    const [
      trackCountRes,
      playlistCountRes,
      albumCountRes,
      artistCountRes,
      play30Res,
      playsSampleRes,
      usersListRes,
    ] = await Promise.all([
      supabaseAdmin.from('Track').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('Playlist').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('Album').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('Artist').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('Play').select('*', { count: 'exact', head: true }).gte('playedAt', thirtyAgo),
      supabaseAdmin
        .from('Play')
        .select('trackId, userId, playedAt')
        .gte('playedAt', thirtyAgo)
        .limit(40000),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])

    const tracksTotal = trackCountRes.count ?? 0
    const playlistsTotal = playlistCountRes.count ?? 0
    const albumsTotal = albumCountRes.count ?? 0
    const artistsTotal = artistCountRes.count ?? 0
    const playsLast30Days = play30Res.count ?? 0

    const users = usersListRes.data?.users ?? []
    let usersTotal = users.length
    if (usersListRes.error) {
      log.warn({ err: usersListRes.error.message }, '[admin/dashboard] listUsers partial')
    }
    if (!usersListRes.error && users.length === 1000) {
      usersTotal = 1000
    }

    const newSignupsWeek = users.filter((u) => {
      const c = u.created_at
      return c && new Date(c) >= new Date(weekAgo)
    }).length

    const playsRows = playsSampleRes.data ?? []
    if (playsSampleRes.error) {
      log.warn({ err: playsSampleRes.error.message }, '[admin/dashboard] plays sample')
    }

    const activeUserIds = new Set<string>()
    const trackPlayCounts = new Map<string, number>()
    const playsByDay = new Map<string, number>()

    for (const row of playsRows) {
      const uid = row.userId as string
      const tid = row.trackId as string
      const playedAt = row.playedAt as string
      if (uid) activeUserIds.add(uid)
      if (tid) trackPlayCounts.set(tid, (trackPlayCounts.get(tid) ?? 0) + 1)
      if (playedAt) {
        const day = playedAt.slice(0, 10)
        playsByDay.set(day, (playsByDay.get(day) ?? 0) + 1)
      }
    }

    const timeline: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      timeline.push({ date: key, count: playsByDay.get(key) ?? 0 })
    }

    const topTrackIds = [...trackPlayCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    let topTracks: { id: string; name: string; plays: number; artistName: string; albumName: string }[] = []
    if (topTrackIds.length) {
      const ids = topTrackIds.map(([id]) => id)
      const { data: trkRows } = await supabaseAdmin
        .from('Track')
        .select('id, name, albumId, artistId')
        .in('id', ids)

      const albumIds = [...new Set((trkRows ?? []).map((t: { albumId: string }) => t.albumId).filter(Boolean))]
      const artistIds = [...new Set((trkRows ?? []).map((t: { artistId: string }) => t.artistId).filter(Boolean))]

      const [{ data: albums }, { data: artists }] = await Promise.all([
        albumIds.length
          ? supabaseAdmin.from('Album').select('id, name').in('id', albumIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        artistIds.length
          ? supabaseAdmin.from('Artist').select('id, name').in('id', artistIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ])

      const albumName = new Map((albums ?? []).map((a: { id: string; name: string }) => [a.id, a.name]))
      const artistName = new Map((artists ?? []).map((a: { id: string; name: string }) => [a.id, a.name]))
      const byId = new Map((trkRows ?? []).map((t: { id: string; name: string; albumId: string; artistId: string }) => [t.id, t]))

      topTracks = topTrackIds.map(([id, plays]) => {
        const t = byId.get(id)
        return {
          id,
          name: t?.name ?? '—',
          plays,
          artistName: t?.artistId ? (artistName.get(t.artistId) ?? '—') : '—',
          albumName: t?.albumId ? (albumName.get(t.albumId) ?? '—') : '—',
        }
      })
    }

    const uniqueTrackIds = [...new Set(playsRows.map((r) => r.trackId as string).filter(Boolean))]
    const trackToArtist = new Map<string, string>()
    const trackToAlbum = new Map<string, string>()
    const chunk = 500
    for (let i = 0; i < uniqueTrackIds.length; i += chunk) {
      const slice = uniqueTrackIds.slice(i, i + chunk)
      const { data: trs } = await supabaseAdmin.from('Track').select('id, artistId, albumId').in('id', slice)
      for (const t of trs ?? []) {
        const row = t as { id: string; artistId: string; albumId: string }
        trackToArtist.set(row.id, row.artistId)
        trackToAlbum.set(row.id, row.albumId)
      }
    }

    const artistPlayCounts = new Map<string, number>()
    const albumPlayCounts = new Map<string, number>()
    for (const [tid, n] of trackPlayCounts) {
      const aid = trackToArtist.get(tid)
      const alb = trackToAlbum.get(tid)
      if (aid) artistPlayCounts.set(aid, (artistPlayCounts.get(aid) ?? 0) + n)
      if (alb) albumPlayCounts.set(alb, (albumPlayCounts.get(alb) ?? 0) + n)
    }

    const topArtistEntries = [...artistPlayCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    let topArtists: { id: string; name: string; plays: number }[] = []
    if (topArtistEntries.length) {
      const { data: arts } = await supabaseAdmin
        .from('Artist')
        .select('id, name')
        .in('id', topArtistEntries.map(([id]) => id))
      const nameBy = new Map((arts ?? []).map((a: { id: string; name: string }) => [a.id, a.name]))
      topArtists = topArtistEntries.map(([id, plays]) => ({
        id,
        name: nameBy.get(id) ?? '—',
        plays,
      }))
    }

    const topAlbumEntries = [...albumPlayCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    let topAlbums: { id: string; name: string; plays: number }[] = []
    if (topAlbumEntries.length) {
      const { data: albs } = await supabaseAdmin
        .from('Album')
        .select('id, name')
        .in('id', topAlbumEntries.map(([id]) => id))
      const nameBy = new Map((albs ?? []).map((a: { id: string; name: string }) => [a.id, a.name]))
      topAlbums = topAlbumEntries.map(([id, plays]) => ({
        id,
        name: nameBy.get(id) ?? '—',
        plays,
      }))
    }

    return NextResponse.json({
      usersTotal,
      usersActive30d: activeUserIds.size,
      newSignupsWeek,
      tracksTotal,
      playlistsTotal,
      albumsTotal,
      artistsTotal,
      playsLast30Days,
      playsTimeline: timeline,
      topTracks,
      topArtists,
      topAlbums,
      revenue: null as null,
      sharesAvailable: false,
      truncatedPlays: playsRows.length >= 40000,
    })
  } catch (e) {
    log.error({ err: String(e) }, '[admin/dashboard] failed')
    return NextResponse.json({ error: 'Dashboard failed' }, { status: 500 })
  }
}
