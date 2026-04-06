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
  { view: 'playlists', label: 'Playlists', icon: <PlaylistIcon />, activeKey: 'playlists' },
  { view: 'artists',   label: 'Artists',   icon: <ArtistIcon />,   activeKey: 'artists'   },
  { view: 'library',   label: 'Albums',    icon: <AlbumIcon />,    activeKey: 'library'   },
  { view: 'songs',     label: 'Songs',     icon: <SongIcon />,     activeKey: 'songs'     },
  { view: 'upload',    label: 'Upload',    icon: <UploadIcon />,   activeKey: 'upload'    },
]

function getActiveKey(mpView: MpView, artistName: string | null, albumId: string | null, playlistId: string | null): string {
  if (artistName) return 'artists'
  if (playlistId) return 'playlists'
  if (albumId)    return 'library'
  if (mpView === 'popular' || mpView === 'radio') return 'library'
  return mpView
}

export default function MusicSidebar() {
  const { mpView, mpCurrentArtistName, mpCurrentAlbumId, mpCurrentPlaylistId, mpSetView } = useAppStore(useShallow((s) => ({
    mpView: s.mpView,
    mpCurrentArtistName: s.mpCurrentArtistName,
    mpCurrentAlbumId: s.mpCurrentAlbumId,
    mpCurrentPlaylistId: s.mpCurrentPlaylistId,
    mpSetView: s.mpSetView,
  })))

  const activeKey = getActiveKey(mpView, mpCurrentArtistName, mpCurrentAlbumId, mpCurrentPlaylistId)

  return (
    <aside style={{
      width: 180, minWidth: 180,
      background: '#141418',
      borderRight: '1px solid rgba(255,255,255,.05)',
      display: 'flex', flexDirection: 'column',
      padding: '22px 0',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      <NavGroup label="Library">
        {LIBRARY_ITEMS.map((item) => (
          <NavItem
            key={item.activeKey}
            item={item}
            active={activeKey === item.activeKey}
            onClick={() => mpSetView(item.view)}
          />
        ))}
      </NavGroup>
    </aside>
  )
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.28)',
        letterSpacing: '1.1px', textTransform: 'uppercase',
        padding: '0 20px', marginBottom: 4,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function NavItem({ item, active, onClick }: { item: NavItemDef; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 11,
        padding: '8px 20px', background: active ? 'rgba(255,255,255,.05)' : 'none',
        border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        color: active ? '#1db954' : 'rgba(255,255,255,.52)',
        fontSize: 13, fontWeight: active ? 500 : 400,
        transition: 'color .15s, background .15s',
        borderLeft: active ? '2px solid #1db954' : '2px solid transparent',
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.color = 'rgba(255,255,255,.88)')}
      onMouseLeave={(e) => !active && (e.currentTarget.style.color = 'rgba(255,255,255,.52)')}
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7, display: 'flex' }}>{item.icon}</span>
      {item.label}
    </button>
  )
}

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
