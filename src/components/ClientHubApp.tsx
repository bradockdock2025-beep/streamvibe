'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import HubApp from './HubApp'

export default function ClientHubApp() {
  // null = still resolving, true/false = resolved
  const [ready, setReady] = useState(false)

  useEffect(() => {
    /**
     * onAuthStateChange fires synchronously with the current session
     * on first call (INITIAL_SESSION event), so we don't need getSession().
     * Using both causes a race condition.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const { setUser, openMusicApp, goAuth } = useAppStore.getState()

      if (session?.user) {
        const u        = session.user
        const name     = u.user_metadata?.full_name || u.email?.split('@')[0] || 'User'
        const initials = name.slice(0, 2).toUpperCase()
        setUser({ name, email: u.email ?? '', initials })

        // Only navigate to app on initial load or explicit sign-in
        // Avoid re-navigating on TOKEN_REFRESHED (would reset view state)
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          openMusicApp()
        }
      } else if (event === 'INITIAL_SESSION') {
        // No session on load — stay on auth page, mark ready
        // (goAuth not needed, page defaults to 'auth')
      } else if (event === 'SIGNED_OUT') {
        goAuth()
      }

      // Mark ready after first event fires (INITIAL_SESSION always fires first)
      if (event === 'INITIAL_SESSION') {
        setReady(true)
      }
    })

    return () => { subscription.unsubscribe() }
  }, [])

  // Block render until Supabase resolves the initial session
  // This prevents the auth page flashing before redirect
  if (!ready) return null

  return <HubApp />
}
