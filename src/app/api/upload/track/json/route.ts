import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { genId, upsertArtist, upsertAlbum } from '@/lib/db'
import { fmtDurFromSec } from '@/lib/storage'
import { requireAdminRole } from '@/lib/guard'
import { invalidateAlbums, invalidateArtists } from '@/lib/cache'
import { rateLimit } from '@/lib/ratelimit'
import { log } from '@/lib/logger'

/**
 * POST /api/upload/track/json
 *
 * Registers a single track that was already uploaded directly to Supabase Storage
 * via a signed URL. Accepts JSON metadata — no file handling needed.
 *
 * Body: {
 *   name, artist, albumName, genre, durationSec,
 *   fileUrl, fileSize, format,
 *   coverUrl?, artistImageUrl?
 * }
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'upload')
  if (limited) return limited

  const auth = await requireAdminRole(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const artistName   = String(body.artist    || 'Unknown Artist').trim()
  const trackName    = String(body.name      || 'Untitled').trim()
  const albumName    = String(body.albumName || 'Singles').trim()
  const genre        = String(body.genre     || '').trim()
  const year         = String(body.year      || new Date().getFullYear())
  const durationSec  = Number(body.durationSec) || 0
  const fileUrl      = String(body.fileUrl   || '').trim()
  const fileSize     = Number(body.fileSize)  || 0
  const format       = String(body.format    || 'MP3').toUpperCase()
  const coverUrl     = String(body.coverUrl  || '').trim()
  const artistImageUrl = String(body.artistImageUrl || '').trim()

  if (!fileUrl) return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 })

  try {
    const [artist] = await Promise.all([
      upsertArtist(artistName, artistImageUrl),
    ])

    const album = await upsertAlbum(albumName, artist.id, year, genre, coverUrl)

    const { data: track, error } = await supabaseAdmin
      .from('Track')
      .insert({
        id: genId(),
        name: trackName,
        trackNumber: 1,
        durationSec,
        dur: fmtDurFromSec(durationSec),
        fileUrl,
        fileSize,
        format,
        genre,
        albumId: artist.id ? album.id : album.id,
        artistId: artist.id,
      })
      .select('*, album:Album(id, name, cover), artist:Artist(id, name)')
      .single()

    if (error) throw new Error(error.message)

    await Promise.all([invalidateAlbums(), invalidateArtists()])
    return NextResponse.json({ ok: true, tracks: [track] }, { status: 201 })
  } catch (err) {
    log.error({ err }, '[upload/track/json]')
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
