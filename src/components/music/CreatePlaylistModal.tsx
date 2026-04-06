'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface PlaylistTrackOption {
  id: string
  name: string
  dur: string
  albumName: string
  albumCover: string
  artistName: string
}

interface CreatePlaylistModalProps {
  open: boolean
  busy: boolean
  tracks: PlaylistTrackOption[]
  initialTrackIds?: string[]
  onClose: () => void
  onCreate: (name: string, description: string, trackIds: string[]) => Promise<void>
}

export default function CreatePlaylistModal({
  open,
  busy,
  tracks,
  initialTrackIds = [],
  onClose,
  onCreate,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>(() => [...new Set(initialTrackIds)])
  const nameRef = useRef<HTMLInputElement>(null)

  const q = search.trim().toLowerCase()
  const filteredTracks = !q
    ? tracks
    : tracks.filter((track) =>
        track.name.toLowerCase().includes(q) ||
        track.artistName.toLowerCase().includes(q) ||
        track.albumName.toLowerCase().includes(q),
      )

  useEffect(() => {
    if (!open) return

    const timer = window.setTimeout(() => nameRef.current?.focus(), 120)

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, busy, onClose])

  function toggleTrack(trackId: string) {
    setSelectedTrackIds((current) =>
      current.includes(trackId)
        ? current.filter((id) => id !== trackId)
        : [...current, trackId],
    )
  }

  async function submit() {
    if (busy) return
    await onCreate(name, description, selectedTrackIds)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => {
            if (!busy) onClose()
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.82)',
            zIndex: 130,
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
              maxWidth: 760,
              background: 'linear-gradient(180deg, #1f2028 0%, #17181f 100%)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 0,
              overflow: 'hidden',
              boxShadow: '0 28px 80px rgba(0,0,0,.55)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(29,185,84,.82)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                  Playlist
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-.4px', margin: 0 }}>
                  Create New Playlist
                </h3>
              </div>
              <button
                onClick={onClose}
                disabled={busy}
                style={{
                  width: 28,
                  height: 28,
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 8,
                  cursor: busy ? 'default' : 'pointer',
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

            <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)', gap: 18, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.42)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                    Name
                  </label>
                  <input
                    ref={nameRef}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void submit()
                      }
                    }}
                    maxLength={120}
                    placeholder="Late Night Drive"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,.05)',
                      border: '1px solid rgba(255,255,255,.1)',
                      borderRadius: 10,
                      padding: '11px 12px',
                      color: '#fff',
                      fontSize: 13,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.42)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={500}
                    placeholder="Optional description for this playlist"
                    rows={4}
                    style={{
                      width: '100%',
                      resize: 'vertical',
                      minHeight: 96,
                      background: 'rgba(255,255,255,.05)',
                      border: '1px solid rgba(255,255,255,.1)',
                      borderRadius: 10,
                      padding: '11px 12px',
                      color: '#fff',
                      fontSize: 13,
                      outline: 'none',
                      fontFamily: 'inherit',
                      lineHeight: 1.6,
                    }}
                  />
                </div>

                <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                    {selectedTrackIds.length} track{selectedTrackIds.length === 1 ? '' : 's'} selected
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.42)', lineHeight: 1.6 }}>
                    The playlist stores ordered links to existing tracks in your library. No audio file is duplicated.
                  </div>
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.42)', letterSpacing: '.5px', textTransform: 'uppercase' }}>
                    Initial Tracks
                  </label>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search tracks, artists, albums"
                    style={{
                      width: 230,
                      background: 'rgba(255,255,255,.05)',
                      border: '1px solid rgba(255,255,255,.1)',
                      borderRadius: 999,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 12,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                  {filteredTracks.map((track) => {
                    const selected = selectedTrackIds.includes(track.id)

                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => toggleTrack(track.id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 10,
                          borderRadius: 12,
                          border: selected ? '1px solid rgba(29,185,84,.42)' : '1px solid rgba(255,255,255,.06)',
                          background: selected ? 'rgba(29,185,84,.08)' : 'rgba(255,255,255,.04)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div style={{ width: 42, height: 42, borderRadius: 8, overflow: 'hidden', background: '#292b35', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {track.albumCover
                            ? /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={track.albumCover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                            : <span style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,.18)' }}>{track.albumName.charAt(0).toUpperCase()}</span>
                          }
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {track.name}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,.44)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {track.artistName} · {track.albumName}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.34)' }}>
                            {track.dur}
                          </span>
                          <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            border: selected ? 'none' : '1px solid rgba(255,255,255,.18)',
                            background: selected ? '#1db954' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                          }}>
                            {selected && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}

                  {filteredTracks.length === 0 && (
                    <div style={{ padding: '18px 14px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', fontSize: 12, color: 'rgba(255,255,255,.42)' }}>
                      No tracks match the current search.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={onClose}
                disabled={busy}
                style={{
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(255,255,255,.1)',
                  color: 'rgba(255,255,255,.78)',
                  borderRadius: 10,
                  padding: '9px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: busy ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: busy ? 0.7 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => void submit()}
                disabled={busy || !name.trim()}
                style={{
                  background: busy || !name.trim() ? 'rgba(29,185,84,.28)' : '#1db954',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: busy || !name.trim() ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  minWidth: 136,
                  opacity: busy || !name.trim() ? 0.7 : 1,
                }}
              >
                {busy ? 'Creating…' : 'Create Playlist'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
