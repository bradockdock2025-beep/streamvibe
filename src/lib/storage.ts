import { randomUUID } from 'crypto'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Supabase Storage bucket names
const AUDIO_BUCKET  = 'audio'
const COVERS_BUCKET = 'covers'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function audioContentType(ext: string): string {
  const map: Record<string, string> = {
    mp3:  'audio/mpeg',
    flac: 'audio/flac',
    wav:  'audio/wav',
    m4a:  'audio/mp4',
    ogg:  'audio/ogg',
    aac:  'audio/aac',
  }
  return map[ext.toLowerCase()] ?? 'audio/mpeg'
}

function imageContentType(ext: string): string {
  const map: Record<string, string> = {
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
    webp: 'image/webp',
    gif:  'image/gif',
  }
  return map[ext.toLowerCase()] ?? 'image/jpeg'
}

/** Extract bucket + storage path from a Supabase public URL */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  // Format: .../storage/v1/object/public/{bucket}/{path}
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (!match) return null
  return { bucket: match[1], path: match[2] }
}

// ─── Audio ────────────────────────────────────────────────────────────────────

export async function saveAudioFile(
  file: File,
): Promise<{ fileUrl: string; fileSize: number; format: string }> {
  const ext      = (file.name.split('.').pop() ?? 'mp3').toLowerCase()
  const filename = `${randomUUID()}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from(AUDIO_BUCKET)
    .upload(filename, buffer, {
      contentType:  audioContentType(ext),
      cacheControl: '31536000', // 1 year
      upsert:       false,
    })

  if (error) throw new Error(`saveAudioFile: ${error.message}`)

  const { data } = supabaseAdmin.storage
    .from(AUDIO_BUCKET)
    .getPublicUrl(filename)

  return {
    fileUrl:  data.publicUrl,
    fileSize: buffer.length,
    format:   ext.toUpperCase(),
  }
}

// ─── Cover art ────────────────────────────────────────────────────────────────

export async function saveCoverFile(file: File): Promise<string> {
  const ext      = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const filename = `${randomUUID()}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from(COVERS_BUCKET)
    .upload(filename, buffer, {
      contentType:  imageContentType(ext),
      cacheControl: '31536000',
      upsert:       false,
    })

  if (error) throw new Error(`saveCoverFile: ${error.message}`)

  const { data } = supabaseAdmin.storage
    .from(COVERS_BUCKET)
    .getPublicUrl(filename)

  return data.publicUrl
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFile(fileUrl: string) {
  if (!fileUrl) return

  if (fileUrl.startsWith('/uploads/')) {
    const localPath = join(process.cwd(), 'public', fileUrl.replace(/^\/+/, ''))
    await unlink(localPath).catch(() => {/* already deleted or missing — ignore */})
    return
  }

  const parsed = parseStorageUrl(fileUrl)
  if (!parsed) return // not a Supabase Storage URL — skip silently

  await supabaseAdmin.storage
    .from(parsed.bucket)
    .remove([parsed.path])
    .catch(() => {/* already deleted — ignore */})
}

// ─── Duration helper ─────────────────────────────────────────────────────────

export function fmtDurFromSec(sec: number): string {
  if (!sec || sec <= 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
