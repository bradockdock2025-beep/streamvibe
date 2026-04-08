'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import type { SearchResults, SearchTrack, SearchAlbum, SearchArtist } from '@/app/api/search/route'

interface Props {
  onClose: () => void
}

type ResultItem =
  | { kind: 'track';  data: SearchTrack  }
  | { kind: 'album';  data: SearchAlbum  }
  | { kind: 'artist'; data: SearchArtist }

function flattenResults(results: SearchResults | null): ResultItem[] {
  if (!results) return []
  return [
    ...results.tracks.map((d): ResultItem  => ({ kind: 'track',  data: d })),
    ...results.albums.map((d): ResultItem  => ({ kind: 'album',  data: d })),
    ...results.artists.map((d): ResultItem => ({ kind: 'artist', data: d })),
  ]
}

export default function GlobalSearch({ onClose }: Props) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor]   = useState(-1)

  const inputRef   = useRef<HTMLInputElement>(null)
  const debounceId = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { mpPlayTrack, mpOpenAlbum, mpOpenArtist, albums } = useAppStore(useShallow((s) => ({
    mpPlayTrack:  s.mpPlayTrack,
    mpOpenAlbum:  s.mpOpenAlbum,
    mpOpenArtist: s.mpOpenArtist,
    albums:       s.albums,
  })))

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setLoading(false); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`)
      const data = await res.json() as SearchResults
      setResults(data)
      setCursor(-1)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(q: string) {
    setQuery(q)
    if (debounceId.current) clearTimeout(debounceId.current)
    debounceId.current = setTimeout(() => search(q), 200)
  }

  const flat = flattenResults(results)

  function selectItem(item: ResultItem) {
    if (item.kind === 'track') {
      const album = albums.find((a) => a.id === item.data.albumId)
      if (album) {
        const idx = album.tracks.findIndex((t) => t.id === item.data.id)
        if (idx >= 0) mpPlayTrack(album.id, idx)
      }
    } else if (item.kind === 'album') {
      mpOpenAlbum(item.data.id)
    } else {
      mpOpenArtist(item.data.name)
    }
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, -1))
    } else if (e.key === 'Enter' && cursor >= 0 && flat[cursor]) {
      selectItem(flat[cursor])
    }
  }

  const hasResults = results && results.total > 0
  const isEmpty    = results && results.total === 0 && query.length >= 2

  // Global flat index helper
  let globalIdx = -1
  function nextIdx() { globalIdx++; return globalIdx }

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 80,
      }}
    >
      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%', maxWidth: 580,
          background: '#1e1e28',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 14,
          boxShadow: '0 32px 80px rgba(0,0,0,.8)',
          overflow: 'hidden',
        }}
      >
        {/* Input row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px',
          borderBottom: (hasResults || loading || isEmpty) ? '1px solid rgba(255,255,255,.07)' : 'none',
        }}>
          {loading
            ? <Spinner />
            : <SearchIcon />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search tracks, albums, artists…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 15, color: '#fff', fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.35)', display: 'flex', padding: 2 }}
            >
              <XIcon />
            </button>
          )}
          <kbd style={{
            fontSize: 10, color: 'rgba(255,255,255,.25)',
            background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 4, padding: '2px 6px', fontFamily: 'inherit',
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        {hasResults && (
          <div style={{ maxHeight: 440, overflowY: 'auto', padding: '8px 0' }}>

            {results.tracks.length > 0 && (
              <Section label="Tracks">
                {results.tracks.map((t) => {
                  const idx = nextIdx()
                  return (
                    <ResultRow
                      key={`t-${t.id}`}
                      active={cursor === idx}
                      onClick={() => selectItem({ kind: 'track', data: t })}
                      onMouseEnter={() => setCursor(idx)}
                      cover={t.albumCover}
                      coverRadius={3}
                      primary={t.name}
                      secondary={`${t.artistName} · ${t.albumName}`}
                      meta={t.dur}
                      icon={<TrackPlayIcon />}
                    />
                  )
                })}
              </Section>
            )}

            {results.albums.length > 0 && (
              <Section label="Albums">
                {results.albums.map((a) => {
                  const idx = nextIdx()
                  return (
                    <ResultRow
                      key={`a-${a.id}`}
                      active={cursor === idx}
                      onClick={() => selectItem({ kind: 'album', data: a })}
                      onMouseEnter={() => setCursor(idx)}
                      cover={a.cover}
                      coverRadius={4}
                      primary={a.name}
                      secondary={`${a.artistName}${a.year ? ` · ${a.year}` : ''}`}
                      meta={`${a.trackCount} tracks`}
                      icon={<AlbumIcon />}
                    />
                  )
                })}
              </Section>
            )}

            {results.artists.length > 0 && (
              <Section label="Artists">
                {results.artists.map((a) => {
                  const idx = nextIdx()
                  return (
                    <ResultRow
                      key={`ar-${a.id}`}
                      active={cursor === idx}
                      onClick={() => selectItem({ kind: 'artist', data: a })}
                      onMouseEnter={() => setCursor(idx)}
                      cover={a.image}
                      coverRadius={50}
                      primary={a.name}
                      secondary={`${a.albumCount} albums · ${a.trackCount} tracks`}
                      icon={<ArtistIcon />}
                    />
                  )
                })}
              </Section>
            )}
          </div>
        )}

        {isEmpty && (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 14 }}>
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {/* Keyboard hint */}
        <div style={{
          display: 'flex', gap: 16, padding: '10px 18px',
          borderTop: (hasResults || isEmpty) ? '1px solid rgba(255,255,255,.06)' : 'none',
          color: 'rgba(255,255,255,.2)', fontSize: 11,
        }}>
          <span><Kbd>↑↓</Kbd> navigate</span>
          <span><Kbd>↵</Kbd> select</span>
          <span><Kbd>Esc</Kbd> close</span>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.3)', letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 18px 4px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

interface ResultRowProps {
  active: boolean
  onClick: () => void
  onMouseEnter: () => void
  cover: string
  coverRadius: number
  primary: string
  secondary: string
  meta?: string
  icon: React.ReactNode
}

function ResultRow({ active, onClick, onMouseEnter, cover, coverRadius, primary, secondary, meta, icon }: ResultRowProps) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 18px', cursor: 'pointer',
        background: active ? 'rgba(29,185,84,.1)' : 'transparent',
        transition: 'background .1s',
      }}
    >
      {/* Cover / avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: coverRadius,
        overflow: 'hidden', flexShrink: 0,
        background: '#2a2a36',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {cover
          /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          : <span style={{ color: 'rgba(255,255,255,.2)', display: 'flex' }}>{icon}</span>
        }
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: active ? '#1db954' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {primary}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {secondary}
        </div>
      </div>

      {/* Meta */}
      {meta && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', flexShrink: 0 }}>{meta}</span>}

      {/* Action icon */}
      <span style={{ color: active ? 'rgba(29,185,84,.7)' : 'rgba(255,255,255,.2)', flexShrink: 0, display: 'flex' }}>
        {icon}
      </span>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 3, padding: '1px 5px', fontSize: 10, fontFamily: 'inherit' }}>
      {children}
    </kbd>
  )
}

function Spinner() {
  return (
    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.1)', borderTopColor: 'rgba(255,255,255,.5)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
  )
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function XIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function TrackPlayIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
}
function AlbumIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
}
function ArtistIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
