'use client'

import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import { useMobile } from '@/hooks/useMobile'
import MusicSidebar from './MusicSidebar'
import MusicModule from './MusicModule'
import PlayerBar from './PlayerBar'
import FullscreenPlayer from './FullscreenPlayer'
import UploadModal from './UploadModal'
import GlobalSearch from './GlobalSearch'
import Toast from '@/components/ui/Toast'
import type { MpView } from '@/types'

export default function MusicLayout() {
  const {
    mpCurrentAlbumId, mpCurrentArtistName, mpCurrentPlaylistId,
    mpBackToLibrary, mpSetView, mpView, mpFullscreen,
    albums, playlists, user, userRole,
    fetchAlbums, fetchArtists, fetchPlaylists, fetchLikes,
  } = useAppStore(useShallow((s) => ({
    mpCurrentAlbumId:    s.mpCurrentAlbumId,
    mpCurrentArtistName: s.mpCurrentArtistName,
    mpCurrentPlaylistId: s.mpCurrentPlaylistId,
    mpBackToLibrary:     s.mpBackToLibrary,
    mpSetView:           s.mpSetView,
    mpView:              s.mpView,
    mpFullscreen:        s.mpFullscreen,
    albums:              s.albums,
    playlists:           s.playlists,
    user:                s.user,
    userRole:            s.userRole,
    fetchAlbums:         s.fetchAlbums,
    fetchArtists:        s.fetchArtists,
    fetchPlaylists:      s.fetchPlaylists,
    fetchLikes:          s.fetchLikes,
  })))

  const isMobile = useMobile()
  const [searchOpen, setSearchOpen]         = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    fetchAlbums()
    fetchArtists()
    fetchPlaylists()
    fetchLikes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useAppStore.getState().closeUploadModal()
        setSearchOpen(false)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const canGoBack = !!mpCurrentAlbumId || !!mpCurrentArtistName || !!mpCurrentPlaylistId || mpView !== 'library'
  function handleBack() {
    if (mpCurrentArtistName || mpCurrentAlbumId || mpCurrentPlaylistId) mpBackToLibrary()
    else if (mpView !== 'library') mpSetView('library')
  }

  function getLabel() {
    if (mpCurrentArtistName) return mpCurrentArtistName
    if (mpCurrentPlaylistId) {
      const playlist = playlists.find((item) => item.id === mpCurrentPlaylistId)
      return playlist?.name ?? ''
    }
    if (mpCurrentAlbumId) {
      const album = albums.find((a) => a.id === mpCurrentAlbumId)
      return album?.name ?? ''
    }
    if (mpView === 'playlists') return 'Playlists'
    if (mpView === 'artists')   return 'Artists'
    if (mpView === 'songs')     return 'Songs'
    if (mpView === 'upload')    return 'Upload'
    if (mpView === 'analytics') return 'Stats'
    return ''
  }

  // Active bottom-nav key
  function getActiveKey() {
    if (mpCurrentArtistName) return 'artists'
    if (mpCurrentPlaylistId) return 'playlists'
    if (mpCurrentAlbumId)    return 'library'
    if (mpView === 'popular' || mpView === 'radio') return 'library'
    return mpView
  }
  const activeKey = getActiveKey()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1a1a1f', position: 'relative' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — desktop only */}
        {!isMobile && (
          <MusicSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((c) => !c)}
          />
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* ── Topbar ── */}
          <div style={{
            height: isMobile ? 52 : 56,
            display: 'flex', alignItems: 'center',
            padding: isMobile ? '0 14px' : '0 24px',
            flexShrink: 0, position: 'relative',
            background: 'rgba(20,20,24,.96)', backdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(255,255,255,.05)', gap: 10,
          }}>
            {/* Back */}
            <NavCircleBtn onClick={handleBack} disabled={!canGoBack}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </NavCircleBtn>

            {/* Page label */}
            {getLabel() && !searchOpen && (
              <span style={{ fontSize: isMobile ? 15 : 14, fontWeight: 600, color: 'rgba(255,255,255,.75)', letterSpacing: '-.2px', flex: isMobile ? 1 : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getLabel()}
              </span>
            )}

            {/* Search — desktop: centered pill | mobile: icon button on right */}
            {!isMobile ? (
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                <button
                  onClick={() => setSearchOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
                    borderRadius: 20, padding: '6px 14px 6px 12px',
                    cursor: 'pointer', color: 'rgba(255,255,255,.45)',
                    fontSize: 13, fontFamily: 'inherit',
                    transition: 'background .15s, border-color .15s, color .15s',
                    width: 220,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.11)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)'; e.currentTarget.style.color = 'rgba(255,255,255,.75)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = 'rgba(255,255,255,.45)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
                  <kbd style={{ fontSize: 10, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 3, padding: '1px 5px', fontFamily: 'inherit', color: 'rgba(255,255,255,.3)' }}>⌘K</kbd>
                </button>
              </div>
            ) : null}

            {/* Right side */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => useAppStore.getState().openAdminModule()}
                  title="Painel administrativo"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 11px',
                    borderRadius: 999,
                    border: '1px solid rgba(108, 92, 231, 0.35)',
                    background: 'rgba(108, 92, 231, 0.12)',
                    color: 'var(--ach)',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Admin
                </button>
              )}
              {/* Mobile search icon */}
              {isMobile && (
                <button
                  onClick={() => setSearchOpen(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 8 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </button>
              )}

              {/* Avatar */}
              <div style={{ width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: '50%', background: 'linear-gradient(135deg, #5a4f8a, #8877cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#fff', cursor: 'pointer', border: '2px solid rgba(255,255,255,.12)', flexShrink: 0 }}>
                {user.initials}
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <MusicModule />
          </div>
        </div>
      </div>

      {/* Player */}
      {!mpFullscreen && <PlayerBar />}
      <FullscreenPlayer />

      {/* ── Bottom nav — mobile only ── */}
      {isMobile && (
        <BottomNav
          activeKey={activeKey}
          isAdmin={userRole === 'admin'}
          onSelect={(view) => {
            mpBackToLibrary()
            mpSetView(view)
          }}
        />
      )}

      <UploadModal />
      <Toast />
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  )
}

// ─── Bottom navigation (mobile) ───────────────────────────────────────────────

interface BottomNavItem {
  key: string
  view: MpView
  label: string
  icon: React.ReactNode
}

function BottomNav({ activeKey, isAdmin, onSelect }: {
  activeKey: string
  isAdmin: boolean
  onSelect: (view: MpView) => void
}) {
  const items: BottomNavItem[] = [
    { key: 'library',   view: 'library',   label: 'Albums',   icon: <AlbumIcon /> },
    { key: 'artists',   view: 'artists',   label: 'Artists',  icon: <ArtistIcon /> },
    { key: 'songs',     view: 'songs',     label: 'Songs',    icon: <SongIcon /> },
    { key: 'analytics', view: 'analytics', label: 'Stats',    icon: <AnalyticsIcon /> },
  ]
  if (isAdmin) {
    items.push({ key: 'upload', view: 'upload', label: 'Upload', icon: <UploadIcon /> })
  }

  return (
    <div style={{
      display: 'flex',
      background: '#141418',
      borderTop: '1px solid rgba(255,255,255,.06)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      flexShrink: 0,
      zIndex: 50,
    }}>
      {items.map((item) => {
        const active = activeKey === item.key
        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.view)}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '10px 4px 8px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: active ? '#1db954' : 'rgba(255,255,255,.38)',
              fontFamily: 'inherit',
              transition: 'color .15s',
              position: 'relative',
            }}
          >
            <span style={{ display: 'flex', opacity: active ? 1 : 0.7 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: '.1px' }}>
              {item.label}
            </span>
            {active && (
              <span style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 2, background: '#1db954', borderRadius: '0 0 2px 2px',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NavCircleBtn({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.08)',
        border: 'none', cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', opacity: disabled ? 0.25 : 1, transition: 'background .12s, opacity .15s',
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = 'rgba(255,255,255,.16)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}
    >
      {children}
    </button>
  )
}

function AlbumIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
}
function ArtistIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function SongIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
}
function PlaylistIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
}
function UploadIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
}
function AnalyticsIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
