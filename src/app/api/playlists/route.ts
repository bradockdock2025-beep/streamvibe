import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { genId } from '@/lib/db'
import { requireAdmin } from '@/lib/guard'

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

async function playlistExists(playlistId: string) {
  const { data, error } = await supabaseAdmin
    .from('Playlist')
    .select('id')
    .eq('id', playlistId)
    .maybeSingle()

  if (error) return { exists: false, error: error.message }
  return { exists: !!data, error: null }
}

async function validateTrackIds(trackIds: string[]) {
  if (!trackIds.length) return { ok: true, error: null as string | null }

  const { data, error } = await supabaseAdmin
    .from('Track')
    .select('id')
    .in('id', trackIds)

  if (error) return { ok: false, error: error.message }

  const foundIds = new Set((data ?? []).map((track) => track.id))
  const missing = trackIds.some((trackId) => !foundIds.has(trackId))
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
    const { error: updateError } = await supabaseAdmin
      .from('PlaylistTrack')
      .update({ order: index })
      .eq('id', row.id)

    if (updateError) return updateError.message
  }

  return null
}

// GET /api/playlists
export async function GET() {
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
  const denied = requireAdmin(req)
  if (denied) return denied

  const body = await req.json().catch(() => null)
  const name = String(body?.name ?? '').trim()
  const description = String(body?.description ?? '').trim()
  const trackIds = normalizeStringArray(body?.trackIds)

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  if (name.length > 120) {
    return NextResponse.json({ error: 'name too long' }, { status: 400 })
  }

  if (description.length > 500) {
    return NextResponse.json({ error: 'description too long' }, { status: 400 })
  }

  const tracksValidation = await validateTrackIds(trackIds)
  if (!tracksValidation.ok) {
    const status = tracksValidation.error === 'one or more tracks do not exist' ? 400 : 500
    return NextResponse.json({ error: tracksValidation.error }, { status })
  }

  const { data, error } = await supabaseAdmin
    .from('Playlist')
    .insert({ id: genId(), name, description })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'failed to create playlist' }, { status: 500 })
  }

  if (trackIds.length) {
    const { error: linkError } = await supabaseAdmin
      .from('PlaylistTrack')
      .insert(trackIds.map((trackId, index) => ({
        id: genId(),
        playlistId: data.id,
        trackId,
        order: index,
      })))

    if (linkError) {
      await supabaseAdmin.from('Playlist').delete().eq('id', data.id)
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/playlists
// body:
//   { playlistId, action: 'add', trackId? | trackIds? }
//   { playlistId, action: 'remove', trackId }
//   { playlistId, action: 'reorder', orderedTrackIds }
export async function PATCH(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const body = await req.json().catch(() => null)
  const playlistId = String(body?.playlistId ?? '').trim()
  const action = String(body?.action ?? '').trim()

  if (!playlistId) {
    return NextResponse.json({ error: 'playlistId required' }, { status: 400 })
  }

  const playlistCheck = await playlistExists(playlistId)
  if (playlistCheck.error) {
    return NextResponse.json({ error: playlistCheck.error }, { status: 500 })
  }
  if (!playlistCheck.exists) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
  }

  if (action === 'add') {
    const singleTrackId = String(body?.trackId ?? '').trim()
    const trackIds = normalizeStringArray(body?.trackIds)
    if (singleTrackId) trackIds.unshift(singleTrackId)
    const normalizedTrackIds = normalizeStringArray(trackIds)

    if (!normalizedTrackIds.length) {
      return NextResponse.json({ error: 'trackId required' }, { status: 400 })
    }

    const tracksValidation = await validateTrackIds(normalizedTrackIds)
    if (!tracksValidation.ok) {
      const status = tracksValidation.error === 'one or more tracks do not exist' ? 400 : 500
      return NextResponse.json({ error: tracksValidation.error }, { status })
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('PlaylistTrack')
      .select('trackId, order')
      .eq('playlistId', playlistId)
      .order('order', { ascending: true })

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    const existingTrackIds = new Set((existing ?? []).map((row) => row.trackId))
    const nextTrackIds = normalizedTrackIds.filter((trackId) => !existingTrackIds.has(trackId))

    if (!nextTrackIds.length) {
      return NextResponse.json({ ok: true, action: 'noop' })
    }

    const maxOrder = (existing ?? []).reduce((acc, row) => Math.max(acc, row.order ?? -1), -1)
    const { error: insertError } = await supabaseAdmin
      .from('PlaylistTrack')
      .insert(nextTrackIds.map((trackId, index) => ({
        id: genId(),
        playlistId,
        trackId,
        order: maxOrder + index + 1,
      })))

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, action: 'added' })
  }

  if (action === 'remove') {
    const trackId = String(body?.trackId ?? '').trim()
    if (!trackId) {
      return NextResponse.json({ error: 'trackId required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('PlaylistTrack')
      .delete()
      .eq('playlistId', playlistId)
      .eq('trackId', trackId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const resequenceError = await resequencePlaylistTracks(playlistId)
    if (resequenceError) {
      return NextResponse.json({ error: resequenceError }, { status: 500 })
    }

    return NextResponse.json({ ok: true, action: 'removed' })
  }

  if (action === 'reorder') {
    const orderedTrackIds = normalizeStringArray(body?.orderedTrackIds)
    if (!orderedTrackIds.length) {
      return NextResponse.json({ error: 'orderedTrackIds required' }, { status: 400 })
    }

    const { data: existing, error } = await supabaseAdmin
      .from('PlaylistTrack')
      .select('trackId')
      .eq('playlistId', playlistId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const existingTrackIds = (existing ?? []).map((row) => row.trackId)
    if (existingTrackIds.length !== orderedTrackIds.length) {
      return NextResponse.json({ error: 'orderedTrackIds must include every playlist track exactly once' }, { status: 400 })
    }

    const orderedSet = new Set(orderedTrackIds)
    const matches = existingTrackIds.every((trackId) => orderedSet.has(trackId))
    if (!matches) {
      return NextResponse.json({ error: 'orderedTrackIds must include every playlist track exactly once' }, { status: 400 })
    }

    for (const [index, trackId] of orderedTrackIds.entries()) {
      const { error: updateError } = await supabaseAdmin
        .from('PlaylistTrack')
        .update({ order: index })
        .eq('playlistId', playlistId)
        .eq('trackId', trackId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, action: 'reordered' })
  }

  return NextResponse.json({ error: 'action must be add, remove or reorder' }, { status: 400 })
}
