/**
 * Upload utilities with real progress tracking.
 *
 * Uses XMLHttpRequest so `upload.onprogress` gives us actual bytes-transferred.
 * The Fetch API does not expose upload progress natively.
 */

export interface UploadProgress {
  /** 0–100 */
  pct: number
  label: string
}

export interface StorageUploadResult {
  publicUrl: string
  fileSize:  number
  format:    string
}

interface SignedUploadPayload {
  signedUrl: string
  path:      string
  token:     string
  publicUrl: string
}

/**
 * Get a short-lived signed upload URL from our backend.
 */
async function getSignedUpload(
  filename: string,
  bucket: 'audio' | 'covers',
  authHeaders: HeadersInit,
): Promise<SignedUploadPayload> {
  const res = await fetch('/api/upload/sign', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body:    JSON.stringify({ filename, bucket }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? 'Failed to get signed upload URL')
  return data as SignedUploadPayload
}

/**
 * Upload a file to Supabase Storage via a signed URL using XHR,
 * reporting real byte-level progress via `onProgress`.
 *
 * @param file         The file to upload
 * @param bucket       'audio' | 'covers'
 * @param authHeaders  Authorization headers from adminHeaders()
 * @param onProgress   Called with 0–100 percentage as bytes are transferred
 */
export async function uploadWithProgress(
  file: File,
  bucket: 'audio' | 'covers',
  authHeaders: HeadersInit,
  onProgress: (p: UploadProgress) => void,
): Promise<StorageUploadResult> {
  onProgress({ pct: 2, label: 'Preparing upload…' })

  const signed = await getSignedUpload(file.name, bucket, authHeaders)

  onProgress({ pct: 5, label: 'Uploading…' })

  const contentType = file.type || guessContentType(file.name, bucket)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? (bucket === 'audio' ? 'mp3' : 'jpg')

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signed.signedUrl)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.setRequestHeader('x-upsert', 'false')

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        // Reserve 5–80% for the actual storage upload
        const raw = (e.loaded / e.total) * 100
        onProgress({ pct: Math.round(5 + raw * 0.75), label: 'Uploading…' })
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Storage upload failed (HTTP ${xhr.status})`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

    xhr.send(file)
  })

  return {
    publicUrl: signed.publicUrl,
    fileSize:  file.size,
    format:    ext.toUpperCase(),
  }
}

/**
 * Register a track via the SSE streaming endpoint.
 * Calls onProgress with server-side step events (20 → 92%),
 * then returns the created track object on completion.
 */
export async function registerTrackSSE(
  payload: {
    name: string; artist: string; albumName: string; genre: string
    durationSec: number; fileUrl: string; fileSize: number; format: string
    coverUrl: string; artistImageUrl: string; year?: string
  },
  authHeaders: HeadersInit,
  onProgress: (p: UploadProgress) => void,
): Promise<unknown> {
  const res = await fetch('/api/upload/track/stream', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body:    JSON.stringify(payload),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`Stream request failed: ${res.status} ${text}`)
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let   buf     = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw) continue

      const event = JSON.parse(raw) as { type: string; pct?: number; label?: string; track?: unknown; message?: string }

      if (event.type === 'progress') {
        onProgress({ pct: event.pct ?? 50, label: event.label ?? 'Processing…' })
      } else if (event.type === 'done') {
        return event.track
      } else if (event.type === 'error') {
        throw new Error(event.message ?? 'Server processing error')
      }
    }
  }

  throw new Error('Stream ended without a done event')
}

// ─── Internal ─────────────────────────────────────────────────────────────────

const AUDIO_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg', flac: 'audio/flac', wav: 'audio/wav',
  m4a: 'audio/mp4', ogg: 'audio/ogg',   aac: 'audio/aac',
}
const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp', gif: 'image/gif',
}

function guessContentType(filename: string, bucket: 'audio' | 'covers'): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map = bucket === 'audio' ? AUDIO_TYPES : IMAGE_TYPES
  return map[ext] ?? (bucket === 'audio' ? 'audio/mpeg' : 'image/jpeg')
}
