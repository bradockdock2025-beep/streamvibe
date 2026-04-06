'use client'

import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import MusicSidebar from './MusicSidebar'
import MusicModule from './MusicModule'
import PlayerBar from './PlayerBar'
import FullscreenPlayer from './FullscreenPlayer'
import UploadModal from './UploadModal'
import Toast from '@/components/ui/Toast'

export default function MusicLayout() {
  const {
    mpCurrentAlbumId, mpCurrentArtistName, mpCurrentPlaylistId,
    mpBackToLibrary, mpSetView, mpView, mpFullscreen,
    albums, playlists,
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
    fetchAlbums:         s.fetchAlbums,
    fetchArtists:        s.fetchArtists,
    fetchPlaylists:      s.fetchPlaylists,
    fetchLikes:          s.fetchLikes,
  })))

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ]       = useState('')

  // Bootstrap: load all music data on mount
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
        setSearchQ('')
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

  // Derive breadcrumb label for topbar
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
    return ''
  }

  // Quick search results
  const searchResults = searchQ.length > 1
    ? albums
        .flatMap((al) => al.tracks.map((t) => ({ track: t, album: al })))
        .filter(({ track, album }) =>
          track.name.toLowerCase().includes(searchQ.toLowerCase()) ||
          album.artist.toLowerCase().includes(searchQ.toLowerCase()) ||
          album.name.toLowerCase().includes(searchQ.toLowerCase())
        )
        .slice(0, 6)
    : []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1a1a1f', position: 'relative' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <MusicSidebar />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* ── Topbar ── */}
          <div style={{
            height: 56, display: 'flex', alignItems: 'center',
            padding: '0 24px', flexShrink: 0, position: 'relative',
            background: 'rgba(20,20,24,.96)', backdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(255,255,255,.05)', gap: 12,
          }}>
            {/* Back */}
            <NavCircleBtn onClick={handleBack} disabled={!canGoBack}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </NavCircleBtn>

            {/* Current page label */}
            {getLabel() && !searchOpen && (
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.7)', letterSpacing: '-.2px' }}>
                {getLabel()}
              </span>
            )}

            {/* Centered search */}
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
              {searchOpen ? (
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 20, padding: '7px 14px', width: 280 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      autoFocus
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="Search songs, artists, albums..."
                      style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#fff', width: '100%', fontFamily: 'inherit' }}
                    />
                    {searchQ && (
                      <button onClick={() => setSearchQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', display: 'flex', padding: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                  </div>

                  {/* Search dropdown */}
                  {searchResults.length > 0 && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: '#1e1e26', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,.6)', zIndex: 100 }}>
                      {searchResults.map(({ track, album }) => (
                        <div
                          key={track.id}
                          onClick={() => {
                            const idx = album.tracks.findIndex((t) => t.id === track.id)
                            useAppStore.getState().mpPlayTrack(album.id, idx)
                            setSearchOpen(false)
                            setSearchQ('')
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', transition: 'background .12s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#2a2a32' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={album.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>{album.artist} · {album.name}</div>
                          </div>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" style={{ flexShrink: 0, marginLeft: 'auto', opacity: .35 }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: '50%', transition: 'color .15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.45)')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Avatar (right) */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #5a4f8a, #8877cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', border: '2px solid rgba(255,255,255,.12)' }}>
                US
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <MusicModule />
          </div>
        </div>
      </div>

      {!mpFullscreen && <PlayerBar />}
      <FullscreenPlayer />
      <UploadModal />
      <Toast />
    </div>
  )
}

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
