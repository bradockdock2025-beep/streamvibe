/**
 * Magic-byte validation for uploaded files.
 *
 * Validates the actual binary signature of a file, not just its MIME type or
 * extension, which can be trivially spoofed by renaming.
 *
 * Supported audio formats: MP3, FLAC, OGG, WAV, M4A/AAC, AIFF, OPUS
 * Supported image formats: JPEG, PNG, WebP, GIF
 */

interface MagicEntry {
  bytes: (number | null)[] // null = wildcard byte
  offset?: number          // default 0
}

const AUDIO_SIGNATURES: MagicEntry[] = [
  // MP3 — ID3 tag header
  { bytes: [0x49, 0x44, 0x33] },
  // MP3 — MPEG sync word (no ID3)
  { bytes: [0xff, 0xfb] },
  { bytes: [0xff, 0xf3] },
  { bytes: [0xff, 0xf2] },
  // FLAC
  { bytes: [0x66, 0x4c, 0x61, 0x43] }, // fLaC
  // OGG (covers OGG Vorbis, Opus)
  { bytes: [0x4f, 0x67, 0x67, 0x53] }, // OggS
  // WAV — RIFF....WAVE
  { bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x41, 0x56, 0x45] }, // RIFF....WAVE
  // AIFF — FORM....AIFF
  { bytes: [0x46, 0x4f, 0x52, 0x4d, null, null, null, null, 0x41, 0x49, 0x46, 0x46] }, // FORM....AIFF
  // M4A / AAC — ftyp box  (bytes 4-7 = "ftyp")
  { bytes: [null, null, null, null, 0x66, 0x74, 0x79, 0x70] }, // ????ftyp
]

const IMAGE_SIGNATURES: MagicEntry[] = [
  { bytes: [0xff, 0xd8, 0xff] },                         // JPEG
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }, // PNG
  { bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50] }, // WebP
  { bytes: [0x47, 0x49, 0x46, 0x38] },                   // GIF
]

function matchSignature(buf: Uint8Array, entry: MagicEntry): boolean {
  const offset = entry.offset ?? 0
  if (buf.length < offset + entry.bytes.length) return false
  return entry.bytes.every((b, i) => b === null || buf[offset + i] === b)
}

function check(buf: Uint8Array, signatures: MagicEntry[]): boolean {
  return signatures.some((sig) => matchSignature(buf, sig))
}

/** Read the first N bytes of a File into a Uint8Array. */
async function readHeader(file: File, bytes = 12): Promise<Uint8Array> {
  const slice = file.slice(0, bytes)
  const ab = await slice.arrayBuffer()
  return new Uint8Array(ab)
}

export async function validateAudioMagicBytes(file: File): Promise<boolean> {
  const header = await readHeader(file, 12)
  return check(header, AUDIO_SIGNATURES)
}

export async function validateImageMagicBytes(file: File): Promise<boolean> {
  const header = await readHeader(file, 12)
  return check(header, IMAGE_SIGNATURES)
}

/**
 * Server-side variant: validate a Buffer (Node.js).
 * Accepts the first bytes of the file as a Buffer or Uint8Array.
 */
export function validateAudioBuffer(header: Buffer | Uint8Array): boolean {
  const buf = header instanceof Buffer ? new Uint8Array(header) : header
  return check(buf, AUDIO_SIGNATURES)
}

export function validateImageBuffer(header: Buffer | Uint8Array): boolean {
  const buf = header instanceof Buffer ? new Uint8Array(header) : header
  return check(buf, IMAGE_SIGNATURES)
}
