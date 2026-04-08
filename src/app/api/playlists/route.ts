import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/guard'
import { genId } from '@/lib/db'
import { rateLimit } from '@/lib/ratelimit'

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const items: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    items.push(trimmed)
  }
  return items
}

async function playlistExists(playlistId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('Playlist')
    .select('id')
    .eq('id', playlistId)
    .eq('userId', userId)
    .maybeSingle()

  if (error) return { exists: false, error: error.message }
  return { exists: !!data, error: null }
}

async function validateTrackIds(trackIds: string[]) {
  if (!trackIds.length) return { ok: true, error: null as string | null }
  const { data, error } = await supabaseAdmin.from('Track').select('id').in('id', trackIds)
  if (error) return { ok: false, error: error.message }
  const foundIds = new Set((data ?? []).map((t) => t.id))
  const missing = trackIds.some((id) => !foundIds.has(id))
  return { ok: !missing, error: missing ? 'one or more tracks do not exist' : null }
}

async function resequencePlaylistTracks(playlistId: string) {
  const { data, error } = await supabaseAdmin
    .from('PlaylistTrack')
    .select('id')
    .eq('playlistId', playlistId)
    .order('order', { ascending: true })

  if (error) return error.message
  for (const [index, row] of (data ?? []).entries()) {
    const { error: e } = await supabaseAdmin
      .from('PlaylistTrack').update({ order: index }).eq('id', row.id)
    if (e) return e.message
  }
  return null
}

// GET /api/playlists — only playlists owned by the authenticated user
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, 'read')
  if (limited) return limited

  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabaseAdmin
    .from('Playlist')
    .select(`
      *,
      tracks:PlaylistTrack(
        id,
        order,
        track:Track(
          *,
          album:Album(id, name, cover),
          artist:Artist(id, name)
        )
      )
    `)
    .eq('userId', auth.userId)
    .order('createdAt', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const playlists = (data ?? []).map((playlist) => ({
    ...playlist,
    tracks: (playlist.tracks ?? []).sort(
      (a: { order: number }, b: { order: number }) => a.order - b.order,
    ),
  }))

  return NextResponse.json(playlists)
}

// POST /api/playlists  body: { name, description?, trackIds? }
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'write')
  if (limited) return limited

  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const name = String(body?.name ?? '').trim()
  const description = String(body?.description ?? '').trim()
  const trackIds = normalizeStringArray(body?.trackIds)

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (name.length > 120) return NextResponse.json({ error: 'name too long' }, { status: 400 })
  if (description.length > 500) return NextResponse.json({ error: 'description too long' }, { status: 400 })

  const tracksValidation = await validateTrackIds(trackIds)
  if (!tracksValidation.ok) {
    return NextResponse.json({ error: tracksValidation.error },
      { status: tracksValidation.error === 'one or more tracks do not exist' ? 400 : 500 })
  }

  const { data, error } = await supabaseAdmin
    .from('Playlist')
    .insert({ id: genId(), name, description, userId: auth.userId })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'failed to create playlist' }, { status: 500 })
  }

  if (trackIds.length) {
    const { error: linkError } = await supabaseAdmin
      .from('PlaylistTrack')
      .insert(trackIds.map((trackId, index) => ({ id: genId(), playlistId: data.id, trackId, order: index })))

    if (linkError) {
      await supabaseAdmin.from('Playlist').delete().eq('id', data.id)
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/playlists — add / remove / reorder tracks
export async function PATCH(req: NextRequest) {
  const limited = await rateLimit(req, 'write')
  if (limited) return limited

  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const playlistId = String(body?.playlistId ?? '').trim()
  const action = String(body?.action ?? '').trim()

  if (!playlistId) return NextResponse.json({ error: 'playlistId required' }, { status: 400 })

  const playlistCheck = await playlistExists(playlistId, auth.userId)
  if (playlistCheck.error) return NextResponse.json({ error: playlistCheck.error }, { status: 500 })
  if (!playlistCheck.exists) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })

  if (action === 'add') {
    const singleTrackId = String(body?.trackId ?? '').trim()
    const trackIds = normalizeStringArray(body?.trackIds)
    if (singleTrackId) trackIds.unshift(singleTrackId)
    const normalizedTrackIds = normalizeStringArray(trackIds)

    if (!normalizedTrackIds.length) return NextResponse.json({ error: 'trackId required' }, { status: 400 })

    const tracksValidation = await validateTrackIds(normalizedTrackIds)
    if (!tracksValidation.ok) {
      return NextResponse.json({ error: tracksValidation.error },
        { status: tracksValidation.error === 'one or more tracks do not exist' ? 400 : 500 })
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('PlaylistTrack').select('trackId, order').eq('playlistId', playlistId).order('order', { ascending: true })

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

    const existingTrackIds = new Set((existing ?? []).map((r) => r.trackId))
    const nextTrackIds = normalizedTrackIds.filter((id) => !existingTrackIds.has(id))
    if (!nextTrackIds.length) return NextResponse.json({ ok: true, action: 'noop' })

    const maxOrder = (existing ?? []).reduce((acc, r) => Math.max(acc, r.order ?? -1), -1)
    const { error: insertError } = await supabaseAdmin
      .from('PlaylistTrack')
      .insert(nextTrackIds.map((trackId, i) => ({ id: genId(), playlistId, trackId, order: maxOrder + i + 1 })))

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: 'added' })
  }

  if (action === 'remove') {
    const trackId = String(body?.trackId ?? '').trim()
    if (!trackId) return NextResponse.json({ error: 'trackId required' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('PlaylistTrack').delete().eq('playlistId', playlistId).eq('trackId', trackId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const resequenceError = await resequencePlaylistTracks(playlistId)
    if (resequenceError) return NextResponse.json({ error: resequenceError }, { status: 500 })
    return NextResponse.json({ ok: true, action: 'removed' })
  }

  if (action === 'reorder') {
    const orderedTrackIds = normalizeStringArray(body?.orderedTrackIds)
    if (!orderedTrackIds.length) return NextResponse.json({ error: 'orderedTrackIds required' }, { status: 400 })

    const { data: existing, error } = await supabaseAdmin
      .from('PlaylistTrack').select('trackId').eq('playlistId', playlistId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const existingTrackIds = (existing ?? []).map((r) => r.trackId)
    if (existingTrackIds.length !== orderedTrackIds.length) {
      return NextResponse.json({ error: 'orderedTrackIds must include every playlist track exactly once' }, { status: 400 })
    }
    const orderedSet = new Set(orderedTrackIds)
    if (!existingTrackIds.every((id) => orderedSet.has(id))) {
      return NextResponse.json({ error: 'orderedTrackIds must include every playlist track exactly once' }, { status: 400 })
    }

    for (const [index, trackId] of orderedTrackIds.entries()) {
      const { error: e } = await supabaseAdmin
        .from('PlaylistTrack').update({ order: index }).eq('playlistId', playlistId).eq('trackId', trackId)
      if (e) return NextResponse.json({ error: e.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, action: 'reordered' })
  }

  return NextResponse.json({ error: 'action must be add, remove or reorder' }, { status: 400 })
}
