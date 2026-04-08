import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { genId, upsertArtist } from '@/lib/db'
import { saveAudioFile, saveCoverFile, fmtDurFromSec } from '@/lib/storage'
import { requireAdminRole } from '@/lib/guard'
import { rateLimit } from '@/lib/ratelimit'
import { log } from '@/lib/logger'
import { validateAudioMagicBytes } from '@/lib/magic-bytes'
import { inngest } from '@/lib/inngest'

export const runtime = 'nodejs'
export const maxDuration = 300

interface AlbumTrackInput {
  name?: string
  trackNumber?: number
  genre?: string
  durationSec?: number
  fileUrl?: string
  fileSize?: number
  format?: string
}

interface AlbumUploadInput {
  albumName?: string
  artistName?: string
  year?: string
  genre?: string
  coverUrl?: string
  artistImageUrl?: string
  tracks?: AlbumTrackInput[]
}

class UploadRequestError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'UploadRequestError'
    this.status = status
  }
}

function normalizeFormat(value: unknown, fallback = 'MP3'): string {
  const format = String(value || '').trim()
  return (format || fallback).toUpperCase()
}

function normalizeTrack(
  track: AlbumTrackInput,
  index: number,
  defaultGenre: string,
): Required<Pick<AlbumTrackInput, 'name' | 'trackNumber' | 'genre' | 'durationSec' | 'fileUrl' | 'fileSize' | 'format'>> {
  const fileUrl = String(track.fileUrl || '').trim()
  if (!fileUrl) {
    throw new UploadRequestError(`Track ${index + 1} is missing fileUrl`)
  }

  const name = String(track.name || '').trim()
  if (!name) {
    throw new UploadRequestError(`Track ${index + 1} is missing name`)
  }

  return {
    name,
    trackNumber: Number(track.trackNumber) || (index + 1),
    genre: String(track.genre || defaultGenre || '').trim(),
    durationSec: Number(track.durationSec) || 0,
    fileUrl,
    fileSize: Number(track.fileSize) || 0,
    format: normalizeFormat(track.format),
  }
}

async function persistAlbumUpload(input: AlbumUploadInput) {
  const albumName = String(input.albumName || '').trim()
  const artistName = String(input.artistName || 'Unknown Artist').trim()
  const year = String(input.year || String(new Date().getFullYear())).trim()
  const genre = String(input.genre || '').trim()
  const coverUrl = String(input.coverUrl || '').trim()
  const artistImageUrl = String(input.artistImageUrl || '').trim()
  const tracks = Array.isArray(input.tracks) ? input.tracks : []

  if (!albumName) throw new UploadRequestError('albumName is required')
  if (!tracks.length) throw new UploadRequestError('No audio tracks provided')

  const normalizedTracks = tracks.map((track, index) => normalizeTrack(track, index, genre))

  const artist = await upsertArtist(artistName)

  if (artistImageUrl && artist.image !== artistImageUrl) {
    await supabaseAdmin.from('Artist').update({ image: artistImageUrl }).eq('id', artist.id)
  }

  const { data: album, error: albumErr } = await supabaseAdmin
    .from('Album')
    .insert({ id: genId(), name: albumName, artistId: artist.id, year, genre, cover: coverUrl })
    .select()
    .single()

  if (albumErr || !album) {
    throw new Error(albumErr?.message ?? 'Failed to create album')
  }

  const trackInserts = normalizedTracks.map((track) => ({
    id: genId(),
    name: track.name,
    trackNumber: track.trackNumber,
    durationSec: track.durationSec,
    dur: fmtDurFromSec(track.durationSec),
    fileUrl: track.fileUrl,
    fileSize: track.fileSize,
    format: track.format,
    genre: track.genre,
    albumId: album.id,
    artistId: artist.id,
  }))

  const { error: tracksErr } = await supabaseAdmin.from('Track').insert(trackInserts)
  if (tracksErr) throw new Error(tracksErr.message)

  const { data: full, error: fullErr } = await supabaseAdmin
    .from('Album')
    .select('*, artist:Artist(*), tracks:Track(*)')
    .eq('id', album.id)
    .single()

  if (fullErr) throw new Error(fullErr.message)
  return full
}

async function parseMultipartPayload(req: NextRequest): Promise<AlbumUploadInput> {
  const form = await req.formData()

  const albumName = (form.get('albumName') as string || '').trim()
  const artistName = (form.get('artistName') as string || 'Unknown Artist').trim()
  const year = (form.get('year') as string || String(new Date().getFullYear())).trim()
  const genre = (form.get('genre') as string || '').trim()
  const coverFile = form.get('cover') as File | null
  const artistImageFile = form.get('artistImage') as File | null
  const audioFiles = form.getAll('tracks[]') as File[]
  const metaRaw = form.getAll('trackMeta[]') as string[]

  if (!albumName) throw new UploadRequestError('albumName is required')
  if (!audioFiles.length) throw new UploadRequestError('No audio tracks provided')

  // Validate magic bytes before any storage I/O
  for (let i = 0; i < audioFiles.length; i++) {
    const valid = await validateAudioMagicBytes(audioFiles[i])
    if (!valid) {
      throw new UploadRequestError(
        `Track ${i + 1} ("${audioFiles[i].name}") is not a recognised audio format`,
        415,
      )
    }
  }

  const [coverUrl, artistImageUrl] = await Promise.all([
    coverFile?.size ? saveCoverFile(coverFile) : Promise.resolve(''),
    artistImageFile?.size ? saveCoverFile(artistImageFile) : Promise.resolve(''),
  ])

  const tracks: AlbumTrackInput[] = []

  // Keep server-side fallback conservative to avoid buffering multiple large files at once.
  for (let index = 0; index < audioFiles.length; index++) {
    const file = audioFiles[index]
    const meta = metaRaw[index] ? JSON.parse(metaRaw[index]) : {}
    const uploaded = await saveAudioFile(file)

    tracks.push({
      name: String(meta.name || file.name.replace(/\.[^.]+$/, '')).trim(),
      trackNumber: meta.trackNumber ?? (index + 1),
      genre: meta.genre || genre,
      durationSec: Number(meta.durationSec) || 0,
      fileUrl: uploaded.fileUrl,
      fileSize: uploaded.fileSize,
      format: uploaded.format,
    })
  }

  return {
    albumName,
    artistName,
    year,
    genre,
    coverUrl,
    artistImageUrl,
    tracks,
  }
}

async function parseJsonPayload(req: NextRequest): Promise<AlbumUploadInput> {
  const body = await req.json() as AlbumUploadInput
  return body
}

// POST /api/upload/album
// Supports:
//   multipart/form-data with album metadata + files
//   application/json with pre-uploaded storage URLs
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'upload')
  if (limited) return limited

  const auth = await requireAdminRole(req)
  if (auth instanceof NextResponse) return auth

  try {
    const contentType = req.headers.get('content-type') ?? ''
    const payload = contentType.includes('application/json')
      ? await parseJsonPayload(req)
      : await parseMultipartPayload(req)

    const album = await persistAlbumUpload(payload)

    // Fire async post-processing job — non-blocking
    inngest.send({
      name: 'music/album.uploaded',
      data: {
        albumId:    album.id,
        albumName:  album.name,
        artistName: album.artist?.name ?? '',
        trackCount: (album.tracks ?? []).length,
        userId:     auth.userId,
      },
    }).catch((err) => log.warn({ err }, '[inngest] Failed to send album.uploaded event'))

    return NextResponse.json({ ok: true, album }, { status: 201 })
  } catch (err) {
    log.error({ err }, '[upload/album]')

    if (err instanceof UploadRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }

    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
