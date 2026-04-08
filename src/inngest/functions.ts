/**
 * Inngest background functions (v4 API).
 *
 * Each function is triggered by an event and runs asynchronously.
 *
 * Current jobs:
 *   processTrackUpload  — validates storage URL, updates DB metadata
 *   processAlbumUpload  — logs structured analytics for album creation
 *   processTrackDeleted — cleanup hook for future CDN/index eviction
 *
 * Future jobs:
 *   - Audio waveform extraction
 *   - Transcoding to 128kbps MP3
 *   - Virus scan via ClamAV REST API
 *   - Push notification on completion
 */

import { inngest } from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { log } from '@/lib/logger'
import { sendPushToAll } from '@/lib/webpush'

// ─── 1. Track upload post-processing ─────────────────────────────────────────

export const processTrackUpload = inngest.createFunction(
  { id: 'process-track-upload', name: 'Process Track Upload', retries: 3, triggers: [{ event: 'music/track.uploaded' }] },
  async ({ event, step }) => {
    const { trackId, fileUrl, trackName, artistName, fileSize, format, durationSec } = event.data as {
      trackId: string; fileUrl: string; trackName: string; artistName: string
      fileSize: number; format: string; durationSec: number
    }

    // Step 1 — validate storage URL is accessible
    const storageOk = await step.run('validate-storage-url', async () => {
      try {
        const res = await fetch(fileUrl, { method: 'HEAD' })
        return res.ok
      } catch {
        return false
      }
    })

    if (!storageOk) {
      log.warn({ trackId, fileUrl }, '[inngest] Storage URL not accessible after upload')
    }

    // Step 2 — enrich track record if needed
    await step.run('enrich-track-metadata', async () => {
      const updates: Record<string, unknown> = {}

      if (!durationSec || durationSec === 0) {
        log.info({ trackId, trackName }, '[inngest] Track uploaded with unknown duration')
      }

      if (format && !['MP3', 'FLAC', 'WAV', 'M4A', 'OGG', 'AAC'].includes(format.toUpperCase())) {
        updates.format = 'MP3'
      }

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('Track').update(updates).eq('id', trackId)
      }

      return { enriched: Object.keys(updates) }
    })

    // Step 3 — structured analytics log
    await step.run('log-analytics', async () => {
      log.info({
        event: 'track.uploaded', trackId, trackName, artistName,
        fileSize, format, durationSec, storageOk,
      }, '[inngest] Track upload processed')
      return { logged: true }
    })

    return { trackId, storageOk }
  },
)

// ─── 2. Album upload post-processing ─────────────────────────────────────────

export const processAlbumUpload = inngest.createFunction(
  { id: 'process-album-upload', name: 'Process Album Upload', retries: 2, triggers: [{ event: 'music/album.uploaded' }] },
  async ({ event, step }) => {
    const { albumId, albumName, artistName, trackCount } = event.data as {
      albumId: string; albumName: string; artistName: string; trackCount: number
    }

    await step.run('log-analytics', async () => {
      log.info({ event: 'album.uploaded', albumId, albumName, artistName, trackCount }, '[inngest] Album upload processed')
      return { logged: true }
    })

    // Step 2 — push notification to all subscribed devices
    await step.run('push-notification', async () => {
      const plural = trackCount === 1 ? 'faixa' : 'faixas'
      await sendPushToAll({
        title: '✅ Upload concluído',
        body:  `${albumName} · ${artistName} — ${trackCount} ${plural} adicionada${trackCount === 1 ? '' : 's'}`,
        url:   '/',
      })
      return { notified: true }
    })

    return { albumId }
  },
)

// ─── 3. Track deletion cleanup ────────────────────────────────────────────────

export const processTrackDeleted = inngest.createFunction(
  { id: 'process-track-deleted', name: 'Track Deleted Cleanup', retries: 2, triggers: [{ event: 'music/track.deleted' }] },
  async ({ event, step }) => {
    const { trackId } = event.data as { trackId: string }

    await step.run('log-deletion', async () => {
      log.info({ event: 'track.deleted', trackId }, '[inngest] Track deletion event received')
      return { logged: true }
    })

    // Future: evict from CDN, remove from search index, etc.

    return { trackId }
  },
)
