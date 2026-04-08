'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminHeaders } from '@/lib/utils'

type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw      = atob(base64)
  const bytes    = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i)
  }
  return bytes
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading')

  // Detect current state on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') { setState('denied'); return }

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? 'subscribed' : 'unsubscribed'))
      .catch(() => setState('unsubscribed'))
  }, [])

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) { console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set'); return }
    setState('loading')

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState('denied'); return }

      // Register SW if not already registered
      await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      const reg = await navigator.serviceWorker.ready

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body:    JSON.stringify(sub.toJSON()),
      })

      setState('subscribed')
    } catch (err) {
      console.error('[push] subscribe error', err)
      setState('unsubscribed')
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setState('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) { setState('unsubscribed'); return }

      await fetch('/api/push/subscribe', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body:    JSON.stringify({ endpoint: sub.endpoint }),
      })

      await sub.unsubscribe()
      setState('unsubscribed')
    } catch (err) {
      console.error('[push] unsubscribe error', err)
      setState('subscribed')
    }
  }, [])

  return { state, subscribe, unsubscribe }
}
