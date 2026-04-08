import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { genId } from '@/lib/db'
import { log } from '@/lib/logger'

// POST /api/push/subscribe  — save or update a push subscription
// DELETE /api/push/subscribe — remove a subscription by endpoint
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const { endpoint, keys } = body ?? {}

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('PushSubscription')
    .upsert(
      { id: genId(), userId: auth.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' }
    )

  if (error) {
    log.error({ err: error }, '[api/push/subscribe]')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const { endpoint } = body ?? {}

  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })

  await supabaseAdmin
    .from('PushSubscription')
    .delete()
    .eq('endpoint', endpoint)
    .eq('userId', auth.userId)

  return NextResponse.json({ ok: true })
}
