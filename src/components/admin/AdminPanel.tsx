'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import type { AdminSection } from '@/types'
import Toast from '@/components/ui/Toast'
import AdminDashboardHome from './sections/AdminDashboardHome'
import AdminContentSection from './sections/AdminContentSection'
import AdminUsersSection from './sections/AdminUsersSection'
import { supabase } from '@/lib/supabase'

const NAV: { id: AdminSection; label: string }[] = [
  { id: 'dashboard', label: 'Painel geral' },
  { id: 'content', label: 'Conteúdo' },
  { id: 'users', label: 'Utilizadores' },
]

export default function AdminPanel() {
  const { userRole, adminSection, setAdminSection, goHub, openMusicApp } = useAppStore(useShallow((s) => ({
    userRole: s.userRole,
    adminSection: s.adminSection,
    setAdminSection: s.setAdminSection,
    goHub: s.goHub,
    openMusicApp: s.openMusicApp,
  })))

  useEffect(() => {
    if (userRole !== 'admin') openMusicApp()
  }, [userRole, openMusicApp])

  if (userRole !== 'admin') return null

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <motion.div
      className="flex h-full w-full overflow-hidden"
      style={{ background: 'var(--bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 200,
          minWidth: 200,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--b2)',
          background: 'var(--bg2)',
          padding: '20px 0',
        }}
      >
        <div style={{ padding: '0 16px 20px', borderBottom: '1px solid var(--b2)' }}>
          <div style={{ fontFamily: 'var(--font-space-mono, monospace)', fontSize: 14, color: 'var(--t1)' }}>
            VIBE<b style={{ color: 'var(--ach)' }}>STREAM</b>
          </div>
          <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6 }}>Admin</div>
        </div>
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map((item) => {
            const active = adminSection === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAdminSection(item.id)}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 'var(--r)',
                  border: active ? '1px solid rgba(108,92,231,0.4)' : '1px solid transparent',
                  background: active ? 'var(--acd)' : 'transparent',
                  color: active ? 'var(--ach)' : 'var(--t2)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {item.label}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--b2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={() => goHub()}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--r)',
              border: '1px solid var(--b2)',
              background: 'var(--bg3)',
              color: 'var(--t2)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Hub de módulos
          </button>
          <button
            type="button"
            onClick={() => openMusicApp()}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--r)',
              border: '1px solid rgba(29,185,84,0.35)',
              background: 'var(--teald)',
              color: 'var(--teal)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Módulo música
          </button>
          <button
            type="button"
            onClick={() => { void handleSignOut() }}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--r)',
              border: '1px solid var(--b2)',
              color: 'var(--t3)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: 'transparent',
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: 'clamp(16px, 3vw, 32px)', position: 'relative' }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
            {adminSection === 'dashboard' && 'Dashboard geral'}
            {adminSection === 'content' && 'Gerir conteúdo'}
            {adminSection === 'users' && 'Gerir utilizadores'}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>
            {adminSection === 'dashboard' && 'Resumo, tendências e tops'}
            {adminSection === 'content' && 'Músicas, artistas, playlists e álbuns'}
            {adminSection === 'users' && 'Contas e políticas (ações sensíveis via Supabase)'}
          </p>
        </header>

        {adminSection === 'dashboard' && <AdminDashboardHome />}
        {adminSection === 'content' && <AdminContentSection />}
        {adminSection === 'users' && <AdminUsersSection />}
      </main>

      <Toast />
    </motion.div>
  )
}
