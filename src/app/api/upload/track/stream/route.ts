import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { genId, upsertArtist, upsertAlbum } from '@/lib/db'
import { fmtDurFromSec } from '@/lib/storage'
import { requireAdminRole } from '@/lib/guard'
import { invalidateAlbums, invalidateArtists } from '@/lib/cache'
import { rateLimit } from '@/lib/ratelimit'
import { log } from '@/lib/logger'
import { inngest } from '@/lib/inngest'

/**
 * POST /api/upload/track/stream
 *
 * SSE (Server-Sent Events) version of /api/upload/track/json.
 * Streams progress events as each DB step completes, then emits a final
 * "done" event with the created track.
 *
 * Response: text/event-stream
 * Events:
 *   data: {"type":"progress","step":"artist","pct":25}
 *   data: {"type":"progress","step":"album","pct":55}
 *   data: {"type":"progress","step":"track","pct":85}
 *   data: {"type":"progress","step":"cache","pct":95}
 *   data: {"type":"done","track":{...}}
 *   data: {"type":"error","message":"..."}
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'upload')
  if (limited) return limited

  const auth = await requireAdminRole(req)
  if (auth instanceof Response) return auth

  const body = await req.json().catch(() => null)
  if (!body) return new Response('{"type":"error","message":"Invalid JSON"}', { status: 400 })

  const artistName    = String(body.artist    || 'Unknown Artist').trim()
  const trackName     = String(body.name      || 'Untitled').trim()
  const albumName     = String(body.albumName || 'Singles').trim()
  const genre         = String(body.genre     || '').trim()
  const year          = String(body.year      || new Date().getFullYear())
  const durationSec   = Number(body.durationSec) || 0
  const fileUrl       = String(body.fileUrl   || '').trim()
  const fileSize      = Number(body.fileSize) || 0
  const format        = String(body.format    || 'MP3').toUpperCase()
  const coverUrl      = String(body.coverUrl  || '').trim()
  const artistImageUrl = String(body.artistImageUrl || '').trim()

  if (!fileUrl) {
    return new Response('data: {"type":"error","message":"fileUrl is required"}\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  // Build the SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      function emit(obj: Record<string, unknown>) {
        controller.enqueue(`data: ${JSON.stringify(obj)}\n\n`)
      }

      try {
        // Step 1 — upsert artist
        emit({ type: 'progress', step: 'artist', label: 'Saving artist…', pct: 20 })
        const artist = await upsertArtist(artistName, artistImageUrl)

        // Step 2 — upsert album
        emit({ type: 'progress', step: 'album', label: 'Saving album…', pct: 50 })
        const album = await upsertAlbum(albumName, artist.id, year, genre, coverUrl)

        // Step 3 — insert track
        emit({ type: 'progress', step: 'track', label: 'Registering track…', pct: 78 })
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
            albumId: album.id,
            artistId: artist.id,
          })
          .select('*, album:Album(id, name, cover), artist:Artist(id, name)')
          .single()

        if (error) throw new Error(error.message)

        // Step 4 — invalidate cache
        emit({ type: 'progress', step: 'cache', label: 'Updating library…', pct: 92 })
        await Promise.all([invalidateAlbums(), invalidateArtists()])

        // Step 5 — fire async post-processing job (non-blocking)
        inngest.send({
          name: 'music/track.uploaded',
          data: {
            trackId:     track!.id,
            trackName,
            artistName,
            albumName,
            fileUrl,
            fileSize,
            format,
            durationSec,
            userId:      auth.userId,
          },
        }).catch((err) => log.warn({ err }, '[inngest] Failed to send track.uploaded event'))

        emit({ type: 'done', track })
      } catch (err) {
        log.error({ err }, '[upload/track/stream]')
        emit({ type: 'error', message: err instanceof Error ? err.message : String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // disable Nginx buffering
    },
  })
}
