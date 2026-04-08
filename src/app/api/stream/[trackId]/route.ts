/**
 * GET /api/stream/[trackId]
 *   — With Bearer auth: validates JWT, issues a short-lived HMAC stream token.
 *     Returns: { streamUrl: '/api/stream/[trackId]?t=TOKEN', expiresIn: 14400 }
 *
 * GET /api/stream/[trackId]?t=TOKEN
 *   — Validates the HMAC token, then proxies the audio bytes from Supabase
 *     Storage with full HTTP Range request support (206 Partial Content).
 *     The browser's <audio> element uses this for efficient large-file streaming
 *     and instant seeking — no full download required.
 *
 * Why proxy instead of redirect to a signed URL?
 *   • Auth is enforced on every byte range request, not just the first one.
 *   • Signed URLs are shareable; HMAC tokens are bound to the track.
 *   • Supabase storage URLs are never exposed to the client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/guard'
import { signStreamToken, verifyStreamToken } from '@/lib/stream-token'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ trackId: string }> }

// ─── Token issuance ───────────────────────────────────────────────────────────

async function handleTokenRequest(req: NextRequest, trackId: string): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { data: track, error } = await supabaseAdmin
    .from('Track')
    .select('id, fileUrl')
    .eq('id', trackId)
    .maybeSingle()

  if (error)  return NextResponse.json({ error: error.message }, { status: 500 })
  if (!track) return NextResponse.json({ error: 'Track not found' }, { status: 404 })
  if (!track.fileUrl) return NextResponse.json({ error: 'Track has no file' }, { status: 404 })

  const token = signStreamToken(trackId, auth.userId)
  const streamUrl = `/api/stream/${trackId}?t=${token}`

  return NextResponse.json({ streamUrl, expiresIn: 4 * 60 * 60 })
}

// ─── Byte-range proxy ─────────────────────────────────────────────────────────

async function handleStreamProxy(req: NextRequest, trackId: string, token: string): Promise<Response> {
  const verified = verifyStreamToken(token, trackId)
  if (!verified) {
    return new Response('Unauthorized — invalid or expired stream token', { status: 401 })
  }

  // Fetch track file URL
  const { data: track, error } = await supabaseAdmin
    .from('Track')
    .select('id, fileUrl')
    .eq('id', trackId)
    .maybeSingle()

  if (error || !track?.fileUrl) {
    return new Response('Track not found', { status: 404 })
  }

  // Extract Supabase bucket/path from the stored URL
  const match = track.fileUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)

  let fileAccessUrl: string

  if (match) {
    // Supabase Storage URL — get a short-lived signed URL for the proxy fetch
    const [, bucket, path] = match
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, 600) // 10-min TTL, only used for this proxy request

    if (signErr || !signed?.signedUrl) {
      log.error({ trackId, signErr }, '[stream] Failed to create signed URL for proxy')
      return new Response('Failed to access audio file', { status: 500 })
    }
    fileAccessUrl = signed.signedUrl
  } else {
    // External or legacy URL — proxy as-is
    fileAccessUrl = track.fileUrl
  }

  // Forward the Range header if present (browser sends this for seeking)
  const rangeHeader = req.headers.get('range')
  const upstreamHeaders: Record<string, string> = {
    'User-Agent': 'hubapp-stream-proxy/1.0',
  }
  if (rangeHeader) {
    upstreamHeaders['Range'] = rangeHeader
  }

  let upstream: Response
  try {
    upstream = await fetch(fileAccessUrl, {
      headers: upstreamHeaders,
      // signal: AbortSignal.timeout(30_000),  // 30s timeout for header response
    })
  } catch (err) {
    log.error({ trackId, err }, '[stream] Upstream fetch failed')
    return new Response('Failed to fetch audio', { status: 502 })
  }

  if (!upstream.ok && upstream.status !== 206) {
    log.warn({ trackId, status: upstream.status }, '[stream] Upstream returned non-OK status')
    return new Response('Upstream error', { status: upstream.status })
  }

  // Build response headers — pass through audio-relevant ones
  const responseHeaders = new Headers()
  const passThrough = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'last-modified',
    'etag',
  ]
  for (const header of passThrough) {
    const value = upstream.headers.get(header)
    if (value) responseHeaders.set(header, value)
  }

  // Always declare range support so the audio element can seek
  if (!responseHeaders.has('accept-ranges')) {
    responseHeaders.set('accept-ranges', 'bytes')
  }

  // Prevent browser caching of stream URLs (token is time-limited)
  responseHeaders.set('cache-control', 'private, no-store')

  return new Response(upstream.body, {
    status:  upstream.status, // 200 or 206
    headers: responseHeaders,
  })
}

// ─── Router ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Ctx) {
  const { trackId } = await params
  const token = req.nextUrl.searchParams.get('t')

  if (token) {
    return handleStreamProxy(req, trackId, token)
  }

  return handleTokenRequest(req, trackId)
}
