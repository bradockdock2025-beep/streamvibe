/**
 * POST /api/admin/set-role
 *
 * Promotes or demotes a Supabase user by setting app_metadata.role.
 * Protected by the static ADMIN_SECRET — never by JWT (bootstrap problem:
 * you need to promote the first admin before anyone has the admin role).
 *
 * Body: { userId: string, role: 'admin' | 'listener' }
 *
 * curl example:
 *   curl -X POST http://localhost:3000/api/admin/set-role \
 *     -H "Authorization: Bearer $ADMIN_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"userId":"<supabase-user-id>","role":"admin"}'
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/guard'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'

const VALID_ROLES = ['admin', 'listener'] as const
type Role = typeof VALID_ROLES[number]

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  let body: { userId?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { userId, role } = body

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  if (!role || !VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  })

  if (error) {
    log.error({ userId, role, err: error }, '[admin/set-role] Failed to update user role')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  log.info({ userId, role }, '[admin/set-role] Role updated')

  return NextResponse.json({
    ok:     true,
    userId: data.user.id,
    role,
  })
}
