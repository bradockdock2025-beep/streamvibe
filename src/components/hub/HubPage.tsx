'use client'

import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'

export default function HubPage() {
  const { user, userRole, openMusicApp, openAdminModule, goAuth } = useAppStore(useShallow((s) => ({
    user: s.user,
    userRole: s.userRole,
    openMusicApp: s.openMusicApp,
    openAdminModule: s.openAdminModule,
    goAuth: s.goAuth,
  })))

  const isAdmin = userRole === 'admin'

  async function handleSignOut() {
    await supabase.auth.signOut()
    goAuth()
  }

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
        podfe<b style={{ color: 'var(--ach)' }}>play</b>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 28 }}
      >
        {isAdmin ? 'Escolha um módulo' : 'Abra o módulo de música'}
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
        style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: isAdmin ? 12 : 0 }}
      >
        <HubCard
          title="Music Player"
          description="Faz upload de músicas e álbuns, organiza a tua biblioteca pessoal"
          icon={<MusicIcon />}
          badge="Novo"
          accent="teal"
          onClick={openMusicApp}
        />
        {isAdmin && (
          <HubCard
            title="Administrativo"
            description="Dashboard, conteúdo e utilizadores"
            icon={<AdminIcon />}
            badge="Admin"
            accent="violet"
            onClick={openAdminModule}
          />
        )}
      </motion.div>

      {/* Bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ marginTop: 28 }}
      >
        <button
          onClick={handleSignOut}
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
  accent?: 'teal' | 'violet'
  onClick: () => void
}

function HubCard({ title, description, icon, badge, accent = 'teal', onClick }: HubCardProps) {
  const hoverBorder = accent === 'violet' ? 'var(--ac)' : 'var(--teal)'
  const iconBg = accent === 'violet' ? 'var(--acd)' : 'var(--teald)'
  const iconColor = accent === 'violet' ? 'var(--ach)' : 'var(--teal)'
  const badgeBg = accent === 'violet' ? 'var(--acd)' : 'var(--teald)'
  const badgeColor = accent === 'violet' ? 'var(--ach)' : 'var(--teal)'

  return (
    <motion.div
      whileHover={{ y: -2, borderColor: hoverBorder }}
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
      <div style={{ width: 40, height: 40, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <div style={{ color: iconColor }}>{icon}</div>
      </div>

      {/* Badge */}
      {badge && (
        <span style={{ position: 'absolute', top: 14, right: 14, fontSize: 9, fontWeight: 500, padding: '2px 7px', borderRadius: 99, letterSpacing: '.4px', background: badgeBg, color: badgeColor }}>
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

function AdminIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  )
}
