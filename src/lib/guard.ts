import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { User } from '@supabase/supabase-js'

// ─── Auth result ──────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'listener'

export interface AuthResult {
  userId: string
  role:   UserRole
}

// ─── Internal helper ──────────────────────────────────────────────────────────

async function resolveUser(req: NextRequest): Promise<{ user: User } | NextResponse> {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized — no token' }, { status: 401 })
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized — invalid token' }, { status: 401 })
  }

  return { user }
}

function extractRole(user: User): UserRole {
  const role = user.app_metadata?.role
  return role === 'admin' ? 'admin' : 'listener'
}

// ─── requireAuth ──────────────────────────────────────────────────────────────
/**
 * Validates a Supabase JWT from the Authorization: Bearer <token> header.
 * Returns { userId, role } on success, or a 401 NextResponse on failure.
 *
 * Use this for user-facing routes accessible to all authenticated users
 * (likes, playlists, stream).
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult | NextResponse> {
  const result = await resolveUser(req)
  if (result instanceof NextResponse) return result
  return { userId: result.user.id, role: extractRole(result.user) }
}

// ─── requireAdminRole ─────────────────────────────────────────────────────────
/**
 * Like requireAuth, but additionally enforces that the user has
 * app_metadata.role === 'admin' (set server-side via supabaseAdmin).
 *
 * Returns 401 if unauthenticated, 403 if authenticated but not admin.
 *
 * Use this for: uploads, deletes, library mutations.
 */
export async function requireAdminRole(req: NextRequest): Promise<AuthResult | NextResponse> {
  const result = await resolveUser(req)
  if (result instanceof NextResponse) return result

  const role = extractRole(result.user)
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 })
  }

  return { userId: result.user.id, role }
}

// ─── requireAdmin ─────────────────────────────────────────────────────────────
/**
 * Protects admin-only routes with a static server-side secret.
 * Never use NEXT_PUBLIC_ADMIN_SECRET — only ADMIN_SECRET (server-side only).
 *
 * Use this for: /api/seed, /api/test-connection, album/artist CRUD.
 *
 * Returns null if authorised, or a 401 NextResponse if not.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET

  if (!secret) {
    console.error('[guard] ADMIN_SECRET is not set — all admin routes are unprotected')
    return null // fail open in dev if not configured
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
