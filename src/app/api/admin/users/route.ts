/**
 * GET /api/admin/users
 * Lista utilizadores Supabase Auth (apenas admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminRole } from '@/lib/guard'
import { rateLimit } from '@/lib/ratelimit'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, 'read')
  if (limited) return limited

  const auth = await requireAdminRole(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })

    if (error) {
      log.warn({ err: error.message }, '[admin/users] listUsers')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const users = (data?.users ?? []).map((u) => {
      const meta = u.app_metadata as Record<string, unknown> | undefined
      const bannedUntil = (u as { banned_until?: string | null }).banned_until
      return {
        id: u.id,
        email: u.email ?? '',
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        role: meta?.role === 'admin' ? 'admin' : 'listener',
        banned: bannedUntil != null && bannedUntil !== '',
      }
    })

    return NextResponse.json({ users })
  } catch (e) {
    log.error({ err: String(e) }, '[admin/users] failed')
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }
}
