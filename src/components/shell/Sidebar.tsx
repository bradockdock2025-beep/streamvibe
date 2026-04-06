'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, toggleSidebar, module, switchModule, user, goAuth, goHub } = useAppStore(useShallow((s) => ({
    sidebarCollapsed: s.sidebarCollapsed,
    toggleSidebar: s.toggleSidebar,
    module: s.module,
    switchModule: s.switchModule,
    user: s.user,
    goAuth: s.goAuth,
    goHub: s.goHub,
  })))

  const collapsed = sidebarCollapsed

  return (
    <motion.aside
      animate={{ width: collapsed ? 48 : 210, minWidth: collapsed ? 48 : 210 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      style={{
        background: 'var(--bg2)',
        borderRight: '.5px solid var(--b1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Top */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 13px 13px 15px', borderBottom: '.5px solid var(--b1)', height: 44, flexShrink: 0 }}>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              style={{ fontFamily: 'var(--font-space-mono, monospace)', fontSize: 13, letterSpacing: -1, whiteSpace: 'nowrap', overflow: 'hidden' }}
            >
              Hub<b style={{ color: 'var(--ach)' }}>App</b>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={toggleSidebar}
          style={{ width: 24, height: 24, minWidth: 24, background: 'var(--bg3)', border: '.5px solid var(--b2)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginLeft: 'auto' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg4)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
        >
          <motion.svg
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.22 }}
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="1.8" strokeLinecap="round"
          >
            <polyline points="15 18 9 12 15 6"/>
          </motion.svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
        {/* Module Switcher */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '8px 9px 6px', padding: 5, background: 'var(--bg3)', borderRadius: 'var(--r)' }}
            >
              <button
                onClick={() => switchModule('vk')}
                style={{
                  flex: 1, padding: '4px 6px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                  textAlign: 'center', cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                  background: module === 'vk' ? 'var(--acd)' : 'none',
                  color: module === 'vk' ? 'var(--ach)' : 'var(--t3)',
                  transition: 'background .15s, color .15s',
                }}
              >
                VidKeep
              </button>
              <button
                onClick={() => switchModule('mp')}
                style={{
                  flex: 1, padding: '4px 6px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                  textAlign: 'center', cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                  background: module === 'mp' ? 'var(--teald)' : 'none',
                  color: module === 'mp' ? 'var(--teal)' : 'var(--t3)',
                  transition: 'background .15s, color .15s',
                }}
              >
                Music
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic content */}
        {children}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 13px', borderTop: '.5px solid var(--b1)', flexShrink: 0 }}>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              style={{ marginBottom: 8 }}
            >
              <button
                onClick={goHub}
                style={{ width: '100%', background: 'none', border: '.5px solid var(--b2)', borderRadius: 'var(--r)', padding: '5px 0', fontSize: 10, color: 'var(--t3)', cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ac)'; e.currentTarget.style.color = 'var(--ach)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.color = 'var(--t3)' }}
              >
                ← Hub
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
          <div style={{ width: 26, minWidth: 26, height: 26, borderRadius: '50%', background: 'var(--ac)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#fff', flexShrink: 0 }}>
            {user.initials}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                style={{ flex: 1, overflow: 'hidden' }}
              >
                <div style={{ fontSize: 11, color: 'var(--t2)' }}>{user.name}</div>
                <button
                  onClick={goAuth}
                  style={{ fontSize: 10, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color .12s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                >
                  Sair
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
