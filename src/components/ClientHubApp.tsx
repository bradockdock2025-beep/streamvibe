'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { setAuthToken, clearAuthToken } from '@/lib/auth-client'
import { useAppStore } from '@/store/useAppStore'
import HubApp from './HubApp'
import type { Album, Artist } from '@/types'

interface Props {
  initialAlbums?:  Album[]
  initialArtists?: Artist[]
}

export default function ClientHubApp({ initialAlbums = [], initialArtists = [] }: Props) {
  // null = still resolving, true = resolved
  const [ready, setReady] = useState(false)

  // Seed store with server-fetched data before auth resolves.
  // openMusicApp() checks `if (!albums.length)` before fetching,
  // so pre-seeding here skips the client-side round-trip entirely.
  useEffect(() => {
    if (initialAlbums.length || initialArtists.length) {
      useAppStore.setState({
        albums:  initialAlbums,
        artists: initialArtists,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    /**
     * onAuthStateChange fires synchronously with the current session
     * on first call (INITIAL_SESSION event), so we don't need getSession().
     * Using both causes a race condition.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const { setUser, openMusicApp, goHub, goAuth } = useAppStore.getState()

      if (session?.user) {
        // Store JWT in memory — used by adminHeaders() for API calls
        setAuthToken(session.access_token)

        const u        = session.user
        const name     = u.user_metadata?.full_name || u.email?.split('@')[0] || 'User'
        const initials = name.slice(0, 2).toUpperCase()
        setUser({ name, email: u.email ?? '', initials })

        // Extract role from app_metadata (set server-side, not user-editable)
        const role = u.app_metadata?.role === 'admin' ? 'admin' : 'listener'
        useAppStore.getState().setUserRole(role)

        // Only navigate to app on initial load or explicit sign-in
        // Avoid re-navigating on TOKEN_REFRESHED (would reset view state)
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          if (role === 'admin') goHub()
          else openMusicApp()
        }
      } else if (event === 'INITIAL_SESSION') {
        // No session on load — show landing page
        clearAuthToken()
        useAppStore.getState().goLanding()
      } else if (event === 'SIGNED_OUT') {
        clearAuthToken()
        useAppStore.getState().goLanding()
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
