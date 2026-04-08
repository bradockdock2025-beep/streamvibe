import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { genId, upsertArtist, upsertAlbum } from '@/lib/db'
import { saveAudioFile, saveCoverFile, fmtDurFromSec } from '@/lib/storage'
import { requireAdminRole } from '@/lib/guard'
import { invalidateAlbums, invalidateArtists } from '@/lib/cache'
import { rateLimit } from '@/lib/ratelimit'
import { log } from '@/lib/logger'
import { validateAudioMagicBytes } from '@/lib/magic-bytes'

// POST /api/upload/track
// FormData fields:
//   files[]   — audio files (multiple)
//   meta[]    — JSON string per file: { name, artist, genre, trackNumber?, albumName?, year? }
//   cover?    — optional cover image file
//   artistImage? — optional artist photo
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'upload')
  if (limited) return limited

  const auth = await requireAdminRole(req)
  if (auth instanceof NextResponse) return auth

  const form = await req.formData()

  const files           = form.getAll('files[]')  as File[]
  const metaRaw         = form.getAll('meta[]')   as string[]
  const coverFile       = form.get('cover')        as File | null
  const artistImageFile = form.get('artistImage')  as File | null

  if (!files.length) {
    return NextResponse.json({ error: 'No audio files provided' }, { status: 400 })
  }

  // Validate magic bytes for all audio files before processing
  for (let i = 0; i < files.length; i++) {
    const valid = await validateAudioMagicBytes(files[i])
    if (!valid) {
      return NextResponse.json(
        { error: `File ${i + 1} ("${files[i].name}") is not a recognised audio format` },
        { status: 415 },
      )
    }
  }

  // Upload cover and artist image once (shared across all tracks in this batch)
  const [sharedCoverUrl, sharedArtistImage] = await Promise.all([
    coverFile?.size       ? saveCoverFile(coverFile)       : Promise.resolve(''),
    artistImageFile?.size ? saveCoverFile(artistImageFile) : Promise.resolve(''),
  ])

  const created = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const meta = metaRaw[i] ? JSON.parse(metaRaw[i]) : {}

    const artistName  = (meta.artist     || 'Unknown Artist').trim()
    const trackName   = (meta.name       || file.name.replace(/\.[^.]+$/, '')).trim()
    const albumName   = (meta.albumName  || 'Singles').trim()
    const genre       = meta.genre       || ''
    const year        = meta.year        || String(new Date().getFullYear())
    const trackNumber = meta.trackNumber ?? (i + 1)
    const durationSec = Number(meta.durationSec) || 0

    try {
      // upsertArtist and saveAudioFile are independent — run in parallel
      const [artist, { fileUrl, fileSize, format }] = await Promise.all([
        upsertArtist(artistName, sharedArtistImage),
        saveAudioFile(file),
      ])

      const album = await upsertAlbum(albumName, artist.id, year, genre, sharedCoverUrl)

      const { data: track, error } = await supabaseAdmin
        .from('Track')
        .insert({
          id:          genId(),
          name:        trackName,
          trackNumber,
          durationSec,
          dur:         fmtDurFromSec(durationSec),
          fileUrl,
          fileSize,
          format,
          genre,
          albumId:     album.id,
          artistId:    artist.id,
        })
        .select('*, album:Album(id, name, cover), artist:Artist(id, name)')
        .single()

      if (error) throw new Error(error.message)
      created.push(track)
    } catch (err) {
      log.error({ err, trackIndex: i }, '[upload/track] track failed')
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  await Promise.all([invalidateAlbums(), invalidateArtists()])
  return NextResponse.json({ ok: true, tracks: created }, { status: 201 })
}
