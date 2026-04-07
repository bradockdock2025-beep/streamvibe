'use client'

import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'

export default function HubPage() {
  const { user, openMusicApp, goAuth } = useAppStore(useShallow((s) => ({
    user: s.user,
    openMusicApp: s.openMusicApp,
    goAuth: s.goAuth,
  })))

  return (
    <motion.div
      className="h-full flex flex-col items-center justify-center"
      style={{ background: 'var(--bg)', padding: 24 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{ fontFamily: 'var(--font-space-mono, monospace)', fontSize: 22, letterSpacing: -1, marginBottom: 6 }}
      >
        VIBE<b style={{ color: 'var(--ach)' }}>STREAM</b>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 28 }}
      >
        Abra o módulo de música
      </motion.p>

      {/* User row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12 }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}
      >
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ac)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: '#fff' }}>
          {user.initials}
        </div>
        <span style={{ fontSize: 13, color: 'var(--t2)' }}>{user.name} · {user.email}</span>
      </motion.div>

      {/* Module grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{ width: '100%', maxWidth: 320 }}
      >
        <HubCard
          title="Music Player"
          description="Faz upload de músicas e álbuns, organiza a tua biblioteca pessoal"
          icon={<MusicIcon />}
          badge="Novo"
          onClick={openMusicApp}
        />
      </motion.div>

      {/* Bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ marginTop: 28 }}
      >
        <button
          onClick={goAuth}
          style={{ background: 'none', border: '.5px solid var(--b2)', borderRadius: 'var(--r)', padding: '6px 14px', fontSize: 12, color: 'var(--t3)', cursor: 'pointer', transition: 'all .15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.color = 'var(--t3)' }}
        >
          Sair
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── Hub Card ────────────────────────────────────────────────────────────────
interface HubCardProps {
  title: string
  description: string
  icon: React.ReactNode
  badge?: string
  onClick: () => void
}

function HubCard({ title, description, icon, badge, onClick }: HubCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, borderColor: 'var(--teal)' }}
      onClick={onClick}
      style={{
        background: 'var(--bg2)',
        border: '.5px solid var(--b2)',
        borderRadius: 'var(--r2)',
        padding: '24px 22px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color .2s',
      }}
    >
      {/* Icon */}
      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--teald)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <div style={{ color: 'var(--teal)' }}>{icon}</div>
      </div>

      {/* Badge */}
      {badge && (
        <span style={{ position: 'absolute', top: 14, right: 14, fontSize: 9, fontWeight: 500, padding: '2px 7px', borderRadius: 99, letterSpacing: '.4px', background: 'var(--teald)', color: 'var(--teal)' }}>
          {badge}
        </span>
      )}

      <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}>{title}</h3>
      <p style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>{description}</p>
    </motion.div>
  )
}

function MusicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}
