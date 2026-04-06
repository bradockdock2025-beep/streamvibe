'use client'

import { AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import AuthPage from './auth/AuthPage'
import HubPage from './hub/HubPage'
import AppShell from './shell/AppShell'

export default function HubApp() {
  const page = useAppStore((s) => s.page)

  return (
    <div style={{ height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {page === 'auth' && <AuthPage key="auth" />}
        {page === 'hub' && <HubPage key="hub" />}
        {page === 'app' && <AppShell key="app" />}
      </AnimatePresence>
    </div>
  )
}
