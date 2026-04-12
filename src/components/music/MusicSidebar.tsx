'use client'

import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import type { MpView } from '@/types'

interface NavItemDef {
  view: MpView
  label: string
  icon: React.ReactNode
  activeKey: string
}

const LIBRARY_ITEMS: NavItemDef[] = [
  { view: 'playlists',  label: 'Playlists', icon: <PlaylistIcon />,  activeKey: 'playlists'  },
  { view: 'artists',    label: 'Artists',   icon: <ArtistIcon />,    activeKey: 'artists'    },
  { view: 'library',    label: 'Albums',    icon: <AlbumIcon />,     activeKey: 'library'    },
  { view: 'songs',      label: 'Songs',     icon: <SongIcon />,      activeKey: 'songs'      },
  { view: 'genres',     label: 'Genres',    icon: <GenreIcon />,     activeKey: 'genres'     },
  { view: 'analytics',  label: 'Stats',     icon: <AnalyticsIcon />, activeKey: 'analytics'  },
]

const ADMIN_ITEMS: NavItemDef[] = [
  { view: 'upload', label: 'Upload', icon: <UploadIcon />, activeKey: 'upload' },
]

function getActiveKey(
  mpView: MpView,
  artistName: string | null,
  albumId: string | null,
  playlistId: string | null,
): string {
  if (artistName)  return 'artists'
  if (playlistId)  return 'playlists'
  if (albumId)     return 'library'
  if (mpView === 'popular' || mpView === 'radio') return 'library'
  return mpView
}

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export default function MusicSidebar({ collapsed, onToggle }: Props) {
  const {
    mpView, mpCurrentArtistName, mpCurrentAlbumId, mpCurrentPlaylistId,
    mpSetView, user, userRole, signOut, goLanding,
  } = useAppStore(useShallow((s) => ({
    mpView:               s.mpView,
    mpCurrentArtistName:  s.mpCurrentArtistName,
    mpCurrentAlbumId:     s.mpCurrentAlbumId,
    mpCurrentPlaylistId:  s.mpCurrentPlaylistId,
    mpSetView:            s.mpSetView,
    user:                 s.user,
    userRole:             s.userRole,
    signOut:              s.signOut,
    goLanding:            s.goLanding,
  })))

  const activeKey = getActiveKey(mpView, mpCurrentArtistName, mpCurrentAlbumId, mpCurrentPlaylistId)
  const W = collapsed ? 56 : 180

  return (
    <aside style={{
      width: W, minWidth: W,
      background: '#141418',
      borderRight: '1px solid rgba(255,255,255,.05)',
      display: 'flex', flexDirection: 'column',
      padding: collapsed ? '22px 0' : '22px 0',
      overflowY: 'auto', overflowX: 'hidden',
      transition: 'width .2s ease, min-width .2s ease',
      position: 'relative',
    }}>

      {/* ── Logo / Voltar à landing ── */}
      <div
        onClick={goLanding}
        title="Voltar ao início"
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 8,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0 0 20px' : '0 20px 20px',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: '#ff3b30', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12c.5-4.5 2.5-7 4-7s3.5 2.5 4 7-.5 9-2 9-3.5-4.5-4-7M14 12c.5-4.5 2.5-7 4-7s3 2.5 3 7-1.5 9-3 9" />
          </svg>
        </div>
        {!collapsed && (
          <span style={{
            fontSize: 15, fontWeight: 800, color: '#fff',
            letterSpacing: -0.4, fontFamily: 'inherit',
          }}>PodFé</span>
        )}
      </div>

      {/* ── Nav group ── */}
      <div style={{ flex: 1 }}>
        {!collapsed && (
          <div style={{
            fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.28)',
            letterSpacing: '1.1px', textTransform: 'uppercase',
            padding: '0 20px', marginBottom: 4,
          }}>
            Library
          </div>
        )}

        {LIBRARY_ITEMS.map((item) => (
          <NavItem
            key={item.activeKey}
            item={item}
            active={activeKey === item.activeKey}
            collapsed={collapsed}
            onClick={() => mpSetView(item.view)}
          />
        ))}

        {userRole === 'admin' && ADMIN_ITEMS.map((item) => (
          <NavItem
            key={item.activeKey}
            item={item}
            active={activeKey === item.activeKey}
            collapsed={collapsed}
            onClick={() => mpSetView(item.view)}
          />
        ))}
      </div>

      {/* ── Toggle button ── */}
      <div style={{
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'flex-end',
        padding: collapsed ? '8px 0' : '8px 12px',
        borderTop: '1px solid rgba(255,255,255,.05)',
        borderBottom: '1px solid rgba(255,255,255,.05)',
      }}>
        <button
          onClick={onToggle}
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.07)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,.35)', transition: 'background .15s, color .15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,.1)'
            e.currentTarget.style.color = 'rgba(255,255,255,.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,.05)'
            e.currentTarget.style.color = 'rgba(255,255,255,.35)'
          }}
        >
          {collapsed
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          }
        </button>
      </div>

      {/* ── User + Sign Out ── */}
      <div style={{
        padding: collapsed ? '14px 0' : '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: collapsed ? 'center' : 'stretch',
        gap: collapsed ? 10 : 12,
      }}>
        {/* Avatar */}
        <div
          title={collapsed ? `${user.name} · ${user.email}` : undefined}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6c5ce7, #1db954)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
            cursor: collapsed ? 'default' : 'auto',
          }}
        >
          {user.initials}
        </div>

        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={() => signOut()}
          title={collapsed ? 'Sair' : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 7,
            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)',
            borderRadius: 7,
            padding: collapsed ? '7px' : '7px 10px',
            cursor: 'pointer',
            color: 'rgba(255,255,255,.4)', fontSize: 12, fontFamily: 'inherit',
            transition: 'color .15s, background .15s',
            width: collapsed ? 32 : '100%',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#e05252'
            e.currentTarget.style.background = 'rgba(224,82,82,.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,.4)'
            e.currentTarget.style.background = 'rgba(255,255,255,.04)'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  )
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────

function NavItem({
  item, active, collapsed, onClick,
}: {
  item: NavItemDef; active: boolean; collapsed: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 11,
        padding: collapsed ? '9px 0' : '8px 20px',
        background: active ? 'rgba(255,255,255,.05)' : 'none',
        border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        color: active ? '#1db954' : 'rgba(255,255,255,.52)',
        fontSize: 13, fontWeight: active ? 500 : 400,
        transition: 'color .15s, background .15s',
        borderLeft: !collapsed && active ? '2px solid #1db954' : '2px solid transparent',
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.color = 'rgba(255,255,255,.88)')}
      onMouseLeave={(e) => !active && (e.currentTarget.style.color = 'rgba(255,255,255,.52)')}
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7, display: 'flex' }}>{item.icon}</span>
      {!collapsed && item.label}
    </button>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlaylistIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
}
function ArtistIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function AlbumIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
}
function SongIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
}
function UploadIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
}
function AnalyticsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
function GenreIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
}
