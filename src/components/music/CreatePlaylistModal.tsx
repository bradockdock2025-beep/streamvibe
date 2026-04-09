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
  const [name, setName]             = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch]         = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>(() => [...new Set(initialTrackIds)])
  const [nameFocused, setNameFocused] = useState(false)
  const [descFocused, setDescFocused] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const q = search.trim().toLowerCase()
  const filtered = !q
    ? tracks
    : tracks.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.artistName.toLowerCase().includes(q) ||
        t.albumName.toLowerCase().includes(q),
      )

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => nameRef.current?.focus(), 140)
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, busy, onClose])

  function toggle(id: string) {
    setSelectedIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    )
  }

  async function submit() {
    if (busy || !name.trim()) return
    await onCreate(name.trim(), description.trim(), selectedIds)
  }

  const canCreate = name.trim().length > 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => { if (!busy) onClose() }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 130,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px',
          }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 16, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 780,
              background: '#282828',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 32px 96px rgba(0,0,0,.8)',
              display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100vh - 48px)',
            }}
          >
            {/* ── Header ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px 0',
              flexShrink: 0,
            }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-.4px', margin: 0 }}>
                Create playlist
              </h2>
              <button
                onClick={() => { if (!busy) onClose() }}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255,255,255,.07)', border: 'none',
                  cursor: 'pointer', color: 'rgba(255,255,255,.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, lineHeight: 1, fontFamily: 'inherit',
                  transition: 'background .15s, color .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.14)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.07)'; e.currentTarget.style.color = 'rgba(255,255,255,.7)' }}
              >
                ×
              </button>
            </div>

            {/* ── Body ── */}
            <div style={{
              display: 'flex', gap: 24, padding: '20px 24px',
              overflow: 'hidden', flex: 1, minHeight: 0,
            }}>

              {/* ── Left: cover + fields ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0, width: 220 }}>

                {/* Cover placeholder */}
                <div style={{
                  width: 200, height: 200,
                  background: 'linear-gradient(135deg, #3a3a4a 0%, #252535 100%)',
                  borderRadius: 4,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 10, cursor: 'default',
                  boxShadow: '0 8px 32px rgba(0,0,0,.5)',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {/* Mosaic preview when tracks selected */}
                  {selectedIds.length > 0 ? (
                    <CoverMosaic tracks={tracks} selectedIds={selectedIds} />
                  ) : (
                    <>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13"/>
                        <circle cx="6" cy="18" r="3"/>
                        <circle cx="18" cy="16" r="3"/>
                      </svg>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', letterSpacing: '.2px' }}>
                        Add tracks to preview
                      </span>
                    </>
                  )}
                </div>

                {/* Name */}
                <div style={{ position: 'relative' }}>
                  <input
                    ref={nameRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit() } }}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    maxLength={120}
                    placeholder="My playlist #1"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: nameFocused ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.07)',
                      border: `1px solid ${nameFocused ? 'rgba(255,255,255,.4)' : 'transparent'}`,
                      borderRadius: 6,
                      padding: '9px 12px',
                      color: '#fff', fontSize: 14, fontWeight: 600,
                      outline: 'none', fontFamily: 'inherit',
                      transition: 'background .15s, border-color .15s',
                    }}
                  />
                  {name.length > 80 && (
                    <span style={{ position: 'absolute', right: 10, bottom: 10, fontSize: 10, color: 'rgba(255,255,255,.3)' }}>
                      {120 - name.length}
                    </span>
                  )}
                </div>

                {/* Description */}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onFocus={() => setDescFocused(true)}
                  onBlur={() => setDescFocused(false)}
                  maxLength={300}
                  placeholder="Add an optional description"
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    resize: 'none',
                    background: descFocused ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.07)',
                    border: `1px solid ${descFocused ? 'rgba(255,255,255,.4)' : 'transparent'}`,
                    borderRadius: 6,
                    padding: '9px 12px',
                    color: 'rgba(255,255,255,.85)', fontSize: 13,
                    outline: 'none', fontFamily: 'inherit',
                    lineHeight: 1.55,
                    transition: 'background .15s, border-color .15s',
                  }}
                />

                {/* Track count */}
                {selectedIds.length > 0 && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', lineHeight: 1.5 }}>
                    <span style={{ color: '#1db954', fontWeight: 700 }}>{selectedIds.length}</span>
                    {' '}track{selectedIds.length !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>

              {/* ── Right: track browser ── */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round"
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  >
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tracks, artists, albums…"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,.1)',
                      border: '1px solid transparent',
                      borderRadius: 6, padding: '9px 12px 9px 36px',
                      color: '#fff', fontSize: 13,
                      outline: 'none', fontFamily: 'inherit',
                      transition: 'background .15s, border-color .15s',
                    }}
                    onFocus={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.14)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.3)' }}
                    onBlur={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.borderColor = 'transparent' }}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', fontSize: 16, display: 'flex', alignItems: 'center', padding: 2 }}
                    >×</button>
                  )}
                </div>

                {/* Track list */}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: '32px 0', textAlign: 'center', color: 'rgba(255,255,255,.28)', fontSize: 13 }}>
                      {search ? `No results for "${search}"` : 'No tracks in library'}
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                          <th style={{ width: 16, padding: '6px 8px 6px 4px', textAlign: 'left' }} />
                          <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>#</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Title</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Album</th>
                          <th style={{ padding: '6px 16px 6px 8px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((t, i) => {
                          const sel = selectedIds.includes(t.id)
                          return (
                            <TrackRow
                              key={t.id}
                              track={t}
                              index={i + 1}
                              selected={sel}
                              onToggle={() => toggle(t.id)}
                            />
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div style={{
              padding: '14px 24px 20px',
              display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
              gap: 10, flexShrink: 0,
              borderTop: '1px solid rgba(255,255,255,.06)',
            }}>
              <button
                onClick={() => { if (!busy) onClose() }}
                disabled={busy}
                style={{
                  background: 'none', border: 'none',
                  color: 'rgba(255,255,255,.65)', fontSize: 14, fontWeight: 700,
                  cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
                  padding: '10px 16px', borderRadius: 999,
                  transition: 'color .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,.65)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => void submit()}
                disabled={busy || !canCreate}
                style={{
                  background: canCreate && !busy ? '#1db954' : 'rgba(255,255,255,.15)',
                  border: 'none', color: canCreate && !busy ? '#000' : 'rgba(255,255,255,.4)',
                  borderRadius: 999, padding: '10px 28px',
                  fontSize: 14, fontWeight: 700,
                  cursor: busy || !canCreate ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background .15s, color .15s, transform .1s',
                  minWidth: 130,
                }}
                onMouseEnter={(e) => { if (canCreate && !busy) e.currentTarget.style.transform = 'scale(1.03)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                {busy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Track Row ────────────────────────────────────────────────────────────────

function TrackRow({ track, index, selected, onToggle }: {
  track: PlaylistTrackOption
  index: number
  selected: boolean
  onToggle: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <tr
      onClick={onToggle}
      style={{
        cursor: 'pointer',
        background: selected ? 'rgba(29,185,84,.06)' : hovered ? 'rgba(255,255,255,.05)' : 'transparent',
        transition: 'background .1s',
        borderRadius: 4,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Add / Check indicator */}
      <td style={{ padding: '7px 6px 7px 4px', width: 16 }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: selected ? '#1db954' : 'transparent',
          border: selected ? 'none' : `1px solid ${hovered ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.18)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'background .12s, border-color .12s',
        }}>
          {selected ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : hovered ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          ) : null}
        </div>
      </td>

      {/* Index */}
      <td style={{ padding: '7px 8px', width: 28, textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: selected ? '#1db954' : 'rgba(255,255,255,.35)', fontVariantNumeric: 'tabular-nums' }}>
          {index}
        </span>
      </td>

      {/* Cover + title + artist */}
      <td style={{ padding: '7px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 4, overflow: 'hidden', background: '#333', flexShrink: 0 }}>
            {track.albumCover
              ? /* eslint-disable-next-line @next/next/no-img-element */
                <img src={track.albumCover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              : <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.2)' }}>
                  {track.name.charAt(0)}
                </span>
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: selected ? '#1db954' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
              {track.name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
              {track.artistName}
            </div>
          </div>
        </div>
      </td>

      {/* Album */}
      <td style={{ padding: '7px 8px' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.38)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140, display: 'block' }}>
          {track.albumName}
        </span>
      </td>

      {/* Duration */}
      <td style={{ padding: '7px 16px 7px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', fontVariantNumeric: 'tabular-nums' }}>
          {track.dur}
        </span>
      </td>
    </tr>
  )
}

// ─── Cover Mosaic ─────────────────────────────────────────────────────────────

function CoverMosaic({ tracks, selectedIds }: { tracks: PlaylistTrackOption[]; selectedIds: string[] }) {
  const selected = tracks.filter((t) => selectedIds.includes(t.id))
  const covers = [...new Set(selected.map((t) => t.albumCover).filter(Boolean))].slice(0, 4)

  if (covers.length === 0) return null

  if (covers.length === 1) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={covers[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', height: '100%' }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ overflow: 'hidden', background: '#252535' }}>
          {covers[i]
            ? /* eslint-disable-next-line @next/next/no-img-element */
              <img src={covers[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: `hsl(${250 + i * 30}, 25%, 22%)` }} />
          }
        </div>
      ))}
    </div>
  )
}
