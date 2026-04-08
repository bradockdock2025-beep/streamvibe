/**
 * Short-lived HMAC tokens for audio stream URLs.
 *
 * Why: HTMLAudioElement can't send custom headers (no Authorization: Bearer).
 * Solution: embed a time-limited signed token in the URL query string.
 *   /api/stream/[trackId]?t=TOKEN
 *
 * The token encodes trackId + userId + expiry, signed with HMAC-SHA256.
 * Default TTL: 4 hours — enough for a long listening session.
 * Token never leaves the server as a Supabase storage URL; the actual
 * bytes are proxied through our API with Range request support.
 *
 * STREAM_SIGNING_SECRET must be set in production. Falls back to
 * a dev-only constant in local environments.
 */

import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.STREAM_SIGNING_SECRET ?? 'dev-stream-secret-change-in-prod'
const TTL_SEC = 4 * 60 * 60 // 4 hours

/**
 * Signs a stream token for the given track + user.
 * Returns a base64url string safe to embed in a URL query param.
 */
export function signStreamToken(trackId: string, userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC
  const payload = `${trackId}:${userId}:${exp}`
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

/**
 * Verifies a token for the given trackId.
 * Returns { userId } on success, null if invalid/expired.
 */
export function verifyStreamToken(token: string, trackId: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    // Format: trackId:userId:exp:sig
    const colonIdx = decoded.lastIndexOf(':')
    if (colonIdx < 0) return null
    const sig = decoded.slice(colonIdx + 1)
    const rest = decoded.slice(0, colonIdx)

    // rest = trackId:userId:exp
    const parts = rest.split(':')
    if (parts.length !== 3) return null
    const [tid, userId, expStr] = parts

    if (tid !== trackId) return null

    const exp = parseInt(expStr, 10)
    if (isNaN(exp) || Math.floor(Date.now() / 1000) > exp) return null

    // Constant-time HMAC comparison
    const expected = createHmac('sha256', SECRET).update(rest).digest('hex')
    const expBuf = Buffer.from(expected, 'utf8')
    const sigBuf = Buffer.from(sig,      'utf8')
    if (expBuf.length !== sigBuf.length) return null
    if (!timingSafeEqual(expBuf, sigBuf)) return null

    return { userId }
  } catch {
    return null
  }
}
