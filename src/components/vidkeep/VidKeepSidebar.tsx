'use client'

import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'

export default function VidKeepSidebar() {
  const { vkFolders, vkLinks, vkFolder, vkSelect, openNewFolderModal, sidebarCollapsed } = useAppStore(useShallow((s) => ({
    vkFolders: s.vkFolders,
    vkLinks: s.vkLinks,
    vkFolder: s.vkFolder,
    vkSelect: s.vkSelect,
    openNewFolderModal: s.openNewFolderModal,
    sidebarCollapsed: s.sidebarCollapsed,
  })))

  if (sidebarCollapsed) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      {/* Library label */}
      <div style={{ fontSize: 9, fontWeight: 500, color: 'var(--t3)', letterSpacing: '.8px', textTransform: 'uppercase', padding: '8px 15px 4px', whiteSpace: 'nowrap' }}>
        Library
      </div>

      {/* All */}
      <NavItem
        active={vkFolder === 'all'}
        onClick={() => vkSelect('all')}
        icon={<GridIcon />}
        label="Todos"
        count={vkLinks.length}
        activeColor="var(--ach)"
        activeBg="var(--acd)"
      />

      {/* Folders label */}
      <div style={{ fontSize: 9, fontWeight: 500, color: 'var(--t3)', letterSpacing: '.8px', textTransform: 'uppercase', padding: '8px 15px 4px', whiteSpace: 'nowrap' }}>
        Pastas
      </div>

      {/* Folder items */}
      {vkFolders.map((f) => {
        const cnt = vkLinks.filter((l) => l.fid === f.id).length
        return (
          <NavItem
            key={f.id}
            active={vkFolder === f.id}
            onClick={() => vkSelect(f.id)}
            icon={<FolderIcon />}
            label={f.name}
            count={cnt}
            activeColor="var(--ach)"
            activeBg="var(--acd)"
          />
        )
      })}

      {/* New folder button */}
      <button
        onClick={openNewFolderModal}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          margin: '5px 9px 0', padding: '7px 10px',
          background: 'transparent', border: '.5px dashed var(--b2)',
          borderRadius: 'var(--r)', cursor: 'pointer',
          fontSize: 11, color: 'var(--t3)',
          transition: 'all .15s', width: 'calc(100% - 18px)',
          whiteSpace: 'nowrap', overflow: 'hidden',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ac)'; e.currentTarget.style.color = 'var(--ach)'; e.currentTarget.style.background = 'var(--acd)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>Nova pasta</span>
      </button>
    </motion.div>
  )
}

// ─── Shared NavItem ──────────────────────────────────────────────────────────
interface NavItemProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
  activeColor: string
  activeBg: string
}

function NavItem({ active, onClick, icon, label, count, activeColor, activeBg }: NavItemProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 11px 7px 13px', cursor: 'pointer',
        transition: 'background .12s', whiteSpace: 'nowrap', overflow: 'hidden',
        background: active ? activeBg : 'transparent',
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.background = 'var(--bg3)')}
      onMouseLeave={(e) => !active && (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ width: 18, minWidth: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: active ? activeColor : 'var(--t2)' }}>
        {icon}
      </div>
      <span style={{ fontSize: 12, color: active ? activeColor : 'var(--t2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 10, color: 'var(--t3)', background: 'var(--bg4)', padding: '1px 5px', borderRadius: 99 }}>
          {count}
        </span>
      )}
    </div>
  )
}

export function MusicNavItem({ active, onClick, icon, label }: Omit<NavItemProps, 'count' | 'activeColor' | 'activeBg'>) {
  return (
    <NavItem
      active={active}
      onClick={onClick}
      icon={icon}
      label={label}
      activeColor="var(--teal)"
      activeBg="var(--teald)"
    />
  )
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
