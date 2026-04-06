'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Playlist } from '@/types'

interface TrackPlaylistModalProps {
  open: boolean
  busyPlaylistId: string | null
  track: { id: string; name: string; artistName: string } | null
  playlists: Playlist[]
  onClose: () => void
  onCreateNew: () => void
  onTogglePlaylist: (playlistId: string, shouldAdd: boolean) => Promise<void>
}

export default function TrackPlaylistModal({
  open,
  busyPlaylistId,
  track,
  playlists,
  onClose,
  onCreateNew,
  onTogglePlaylist,
}: TrackPlaylistModalProps) {
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busyPlaylistId) onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busyPlaylistId, onClose])

  return (
    <AnimatePresence>
      {open && track && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => {
            if (!busyPlaylistId) onClose()
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.82)',
            zIndex: 135,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <motion.div
            initial={{ scale: 0.97, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 460,
              background: 'linear-gradient(180deg, #20212a 0%, #16171d 100%)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 0,
              overflow: 'hidden',
              boxShadow: '0 28px 80px rgba(0,0,0,.55)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(29,185,84,.82)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                  Add To Playlist
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: '#fff', letterSpacing: '-.4px', margin: 0 }}>
                  {track.name}
                </h3>
                <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,.42)' }}>
                  {track.artistName}
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={!!busyPlaylistId}
                style={{
                  width: 28,
                  height: 28,
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 8,
                  cursor: busyPlaylistId ? 'default' : 'pointer',
                  color: 'rgba(255,255,255,.72)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontFamily: 'inherit',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
              {playlists.length === 0 && (
                <div style={{ padding: '18px 14px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                    No playlists yet
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', lineHeight: 1.6 }}>
                    Create the first playlist and this song can be linked to it immediately.
                  </div>
                </div>
              )}

              {playlists.map((playlist) => {
                const containsTrack = playlist.tracks.some((entry) => entry.track.id === track.id)
                const busy = busyPlaylistId === playlist.id

                return (
                  <div
                    key={playlist.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 14,
                      background: 'rgba(255,255,255,.04)',
                      border: '1px solid rgba(255,255,255,.06)',
                    }}
                  >
                    <div style={{ width: 50, height: 50, borderRadius: 10, overflow: 'hidden', background: '#2a2c36', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {playlist.covers[0]
                        ? /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={playlist.covers[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        : <span style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,.24)' }}>{playlist.name.charAt(0).toUpperCase()}</span>
                      }
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {playlist.name}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,.42)' }}>
                        {playlist.trackCount} song{playlist.trackCount === 1 ? '' : 's'} · {playlist.totalDur}
                      </div>
                    </div>

                    <button
                      onClick={() => void onTogglePlaylist(playlist.id, !containsTrack)}
                      disabled={busy}
                      style={{
                        minWidth: 92,
                        borderRadius: 10,
                        border: containsTrack ? '1px solid rgba(255,255,255,.12)' : 'none',
                        background: containsTrack ? 'rgba(255,255,255,.06)' : '#1db954',
                        color: '#fff',
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: busy ? 'default' : 'pointer',
                        fontFamily: 'inherit',
                        opacity: busy ? 0.7 : 1,
                      }}
                    >
                      {busy ? 'Saving…' : containsTrack ? 'Remove' : 'Add'}
                    </button>
                  </div>
                )
              })}
            </div>

            <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <button
                onClick={onCreateNew}
                disabled={!!busyPlaylistId}
                style={{
                  background: 'rgba(29,185,84,.12)',
                  border: '1px solid rgba(29,185,84,.24)',
                  color: '#7ef0a9',
                  borderRadius: 10,
                  padding: '9px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: busyPlaylistId ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: busyPlaylistId ? 0.7 : 1,
                }}
              >
                New Playlist
              </button>
              <button
                onClick={onClose}
                disabled={!!busyPlaylistId}
                style={{
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(255,255,255,.1)',
                  color: 'rgba(255,255,255,.78)',
                  borderRadius: 10,
                  padding: '9px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: busyPlaylistId ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: busyPlaylistId ? 0.7 : 1,
                }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
