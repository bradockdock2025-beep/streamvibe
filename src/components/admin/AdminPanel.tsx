'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import type { AdminSection } from '@/types'
import Toast from '@/components/ui/Toast'
import AdminDashboardHome from './sections/AdminDashboardHome'
import AdminStreamAnalytics from './sections/AdminStreamAnalytics'
import AdminContentSection from './sections/AdminContentSection'
import AdminUsersSection from './sections/AdminUsersSection'

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavDef { id: AdminSection; label: string; icon: React.ReactNode }

const NAV_PRINCIPAL: NavDef[] = [
  { id: 'dashboard', label: 'Visão Geral',   icon: <DashboardIcon /> },
  { id: 'streams',   label: 'Streams',       icon: <StreamsIcon />   },
]
const NAV_GESTAO: NavDef[] = [
  { id: 'users',   label: 'Utilizadores', icon: <UsersIcon />   },
  { id: 'content', label: 'Conteúdo',     icon: <ContentIcon /> },
]

const SECTION_TITLES: Record<AdminSection, { title: string; sub: string }> = {
  dashboard: { title: 'Visão Geral',     sub: 'KPIs, tendências e tops da plataforma'          },
  streams:   { title: 'Streams',         sub: 'Distribuição horária, géneros e plays recentes' },
  users:     { title: 'Utilizadores',    sub: 'Contas, papéis e analytics individuais'         },
  content:   { title: 'Gerir Conteúdo',  sub: 'Músicas, artistas, playlists e álbuns'          },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { userRole, adminSection, setAdminSection, goHub, openMusicApp, goLanding, user, signOut } =
    useAppStore(useShallow((s) => ({
      userRole:         s.userRole,
      adminSection:     s.adminSection,
      setAdminSection:  s.setAdminSection,
      goHub:            s.goHub,
      openMusicApp:     s.openMusicApp,
      goLanding:        s.goLanding,
      user:             s.user,
      signOut:          s.signOut,
    })))

  const [collapsed, setCollapsed] = useState(false)
  const W = collapsed ? 56 : 220

  useEffect(() => {
    if (userRole !== 'admin') openMusicApp()
  }, [userRole, openMusicApp])

  if (userRole !== 'admin') return null

  const { title, sub } = SECTION_TITLES[adminSection] ?? SECTION_TITLES.dashboard

  return (
    <motion.div
      className="flex h-full w-full overflow-hidden"
      style={{ background: 'var(--bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* ── Sidebar ── */}
      <aside style={{
        width: W, minWidth: W,
        background: 'var(--bg)',
        borderRight: '1px solid var(--b1)',
        display: 'flex', flexDirection: 'column',
        padding: '22px 0',
        overflowY: 'auto', overflowX: 'hidden',
        flexShrink: 0,
        transition: 'width .2s ease, min-width .2s ease',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '0 0 18px' : '0 20px 18px',
          borderBottom: '1px solid var(--b1)',
          display: 'flex', flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'flex-start',
        }}>
          {!collapsed ? (
            <>
              <div style={{ fontFamily: 'var(--font-space-mono, "Space Mono", monospace)', fontSize: 14, letterSpacing: '0.02em', color: 'var(--t1)' }}>
                podfe<span style={{ color: 'var(--ach)' }}>play</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7, padding: '3px 7px', background: 'var(--acd)', borderRadius: 4, fontSize: 9, fontWeight: 700, color: 'var(--ach)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Admin
              </div>
            </>
          ) : (
            <div title="podfeplay Admin" style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--acd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ach)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
          )}
        </div>

        {/* Nav */}
        <div style={{ flex: 1, paddingTop: 14 }}>
          {!collapsed && (
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.28)', letterSpacing: '1.1px', textTransform: 'uppercase', padding: '0 20px', marginBottom: 4 }}>
              Principal
            </div>
          )}
          {NAV_PRINCIPAL.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={adminSection === item.id}
              collapsed={collapsed}
              onClick={() => setAdminSection(item.id)}
            />
          ))}

          <div style={{ height: 10 }} />

          {!collapsed && (
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.28)', letterSpacing: '1.1px', textTransform: 'uppercase', padding: '0 20px', marginBottom: 4 }}>
              Gestão
            </div>
          )}
          {NAV_GESTAO.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={adminSection === item.id}
              collapsed={collapsed}
              onClick={() => setAdminSection(item.id)}
            />
          ))}
        </div>

        {/* Toggle button */}
        <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', padding: collapsed ? '8px 0' : '8px 12px', borderTop: '1px solid var(--b1)', borderBottom: '1px solid var(--b1)' }}>
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.35)', transition: 'background .15s, color .15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = 'rgba(255,255,255,.8)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = 'rgba(255,255,255,.35)' }}
          >
            {collapsed
              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            }
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding: collapsed ? '14px 0' : '14px 20px', borderTop: '1px solid var(--b1)', display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch', gap: 6 }}>
          {/* Quick actions */}
          {!collapsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              <QuickBtn label="Início / Landing" icon={<LandingIcon />} onClick={goLanding} variant="red" />
              <QuickBtn label="Hub de Módulos"   icon={<HubIcon />}     onClick={goHub}      variant="neutral" />
              <QuickBtn label="Módulo Música"    icon={<MusicNoteIcon />} onClick={openMusicApp} variant="teal" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
              <IconBtn onClick={goLanding} title="Início / Landing" red><LandingIcon /></IconBtn>
              <IconBtn onClick={goHub} title="Hub de Módulos"><HubIcon /></IconBtn>
              <IconBtn onClick={openMusicApp} title="Módulo Música" teal><MusicNoteIcon /></IconBtn>
            </div>
          )}

          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: collapsed ? 0 : 8 }}>
            <div title={collapsed ? `${user.name} · ${user.email}` : undefined} style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--ac), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
              {user.initials}
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
              </div>
            )}
          </div>

          <button
            onClick={signOut}
            title={collapsed ? 'Sair' : undefined}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 7, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)',
              borderRadius: 7, padding: collapsed ? '7px' : '7px 10px', cursor: 'pointer',
              color: 'rgba(255,255,255,.4)', fontSize: 12, fontFamily: 'inherit',
              transition: 'color .15s, background .15s',
              width: collapsed ? 32 : '100%',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'rgba(224,82,82,.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,.4)'; e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {!collapsed && 'Sair'}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{
        flex: 1, minWidth: 0, overflow: 'auto',
        background: 'var(--bg2)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Top bar */}
        <div style={{
          padding: '20px 28px 16px',
          borderBottom: '1px solid var(--b1)',
          background: 'var(--bg)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {title}
              </h1>
              <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>{sub}</p>
            </div>
            {adminSection === 'content' && (
              <button
                onClick={openMusicApp}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 6,
                  border: '1px solid var(--teal)',
                  background: 'var(--teald)',
                  color: 'var(--teal)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'opacity .15s',
                }}
              >
                <MusicNoteIcon /> Abrir Módulo Música
              </button>
            )}
          </div>
        </div>

        {/* Section content */}
        <div style={{ flex: 1, padding: 'clamp(16px, 2.5vw, 28px)', overflowY: 'auto' }}>
          {adminSection === 'dashboard' && <AdminDashboardHome />}
          {adminSection === 'streams'   && <AdminStreamAnalytics />}
          {adminSection === 'users'     && <AdminUsersSection />}
          {adminSection === 'content'   && <AdminContentSection />}
        </div>
      </main>

      <Toast />
    </motion.div>
  )
}

// ─── Sidebar sub-components ───────────────────────────────────────────────────

function NavItem({
  item, active, collapsed, onClick,
}: {
  item: NavDef; active: boolean; collapsed: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      style={{
        width: '100%', display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 11,
        padding: collapsed ? '9px 0' : '8px 20px',
        background: active ? 'var(--acd)' : 'none',
        border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        color: active ? 'var(--ach)' : 'rgba(255,255,255,.52)',
        fontSize: 13, fontWeight: active ? 500 : 400,
        transition: 'color .15s, background .15s',
        borderLeft: !collapsed && active ? '2px solid var(--ac)' : '2px solid transparent',
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.color = 'rgba(255,255,255,.88)')}
      onMouseLeave={(e) => !active && (e.currentTarget.style.color = 'rgba(255,255,255,.52)')}
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.65, display: 'flex' }}>{item.icon}</span>
      {!collapsed && item.label}
    </button>
  )
}

function IconBtn({
  children, onClick, title, teal, red,
}: {
  children: React.ReactNode; onClick: () => void; title: string; teal?: boolean; red?: boolean
}) {
  const bg    = red ? 'rgba(255,59,48,.15)'  : teal ? 'var(--teald)' : 'rgba(255,255,255,.04)'
  const bdr   = red ? '1px solid rgba(255,59,48,.3)' : teal ? '1px solid rgba(29,185,84,.3)' : '1px solid rgba(255,255,255,.07)'
  const color = red ? '#ff3b30' : teal ? 'var(--teal)' : 'rgba(255,255,255,.45)'
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32, borderRadius: 7, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg, border: bdr, color, transition: 'opacity .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
    >
      {children}
    </button>
  )
}

function QuickBtn({
  label, icon, onClick, variant,
}: {
  label: string; icon: React.ReactNode; onClick: () => void; variant: 'teal' | 'neutral' | 'red'
}) {
  const isRed  = variant === 'red'
  const isTeal = variant === 'teal'
  const bg    = isRed ? 'rgba(255,59,48,.12)'  : isTeal ? 'var(--teald)' : 'rgba(255,255,255,.04)'
  const bdr   = isRed ? '1px solid rgba(255,59,48,.28)' : isTeal ? '1px solid rgba(29,185,84,.3)' : '1px solid rgba(255,255,255,.07)'
  const color = isRed ? '#ff3b30' : isTeal ? 'var(--teal)' : 'rgba(255,255,255,.45)'
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
        background: bg, border: bdr, color, fontSize: 12, transition: 'opacity .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function DashboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}
function StreamsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function ContentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  )
}
function HubIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
  )
}
function MusicNoteIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  )
}
function LandingIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
