/**
 * Server-side Web Push helper.
 *
 * Requires env vars:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT  (e.g. mailto:admin@soneker.com)
 */

import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { log } from '@/lib/logger'

const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const privateKey = process.env.VAPID_PRIVATE_KEY           ?? ''
const subject    = process.env.VAPID_SUBJECT                ?? 'mailto:admin@soneker.com'

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export interface PushPayload {
  title: string
  body:  string
  icon?: string
  url?:  string
}

interface SubscriptionRow {
  endpoint: string
  p256dh:   string
  auth:     string
}

/** Send a push notification to every subscription in the DB. */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!publicKey || !privateKey) {
    log.warn('[webpush] VAPID keys not configured — skipping push')
    return
  }

  const { data: subs, error } = await supabaseAdmin
    .from('PushSubscription')
    .select('endpoint, p256dh, auth')

  if (error) { log.error({ err: error }, '[webpush] Failed to fetch subscriptions'); return }
  if (!subs?.length) return

  const results = await Promise.allSettled(
    subs.map((sub: SubscriptionRow) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 } // 1 hour
      )
    )
  )

  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length) {
    log.warn({ failed: failed.length, total: subs.length }, '[webpush] Some pushes failed')
  }

  log.info({ sent: results.length - failed.length, total: subs.length }, '[webpush] Push sent')
}

/** Send a push notification to a specific user. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!publicKey || !privateKey) {
    log.warn('[webpush] VAPID keys not configured — skipping push')
    return
  }

  const { data: subs, error } = await supabaseAdmin
    .from('PushSubscription')
    .select('endpoint, p256dh, auth')
    .eq('userId', userId)

  if (error) { log.error({ err: error }, '[webpush] Failed to fetch subscriptions'); return }
  if (!subs?.length) return

  await Promise.allSettled(
    subs.map((sub: SubscriptionRow) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 }
      )
    )
  )
}
