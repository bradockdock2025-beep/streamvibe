import { NextRequest, NextResponse } from 'next/server'

/**
 * Protects write/destructive API routes with a static secret.
 *
 * Clients must send one of:
 *   Authorization: Bearer <ADMIN_SECRET>
 *   x-api-key: <ADMIN_SECRET>
 *
 * Set ADMIN_SECRET in your .env file.
 * Returns a 401 NextResponse if the secret is missing or wrong, null if OK.
 *
 * Usage:
 *   const denied = requireAdmin(req)
 *   if (denied) return denied
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET

  if (!secret) {
    console.error('[guard] ADMIN_SECRET is not set — all write routes are unprotected')
    return null // Fail open during development if not configured yet
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const apiKey     = req.headers.get('x-api-key')     ?? ''

  const provided =
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader) ||
    apiKey

  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
