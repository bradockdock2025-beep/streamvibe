'use client'

import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import type { Album, Playlist, Track } from '@/types'

type Tab = 'music' | 'artists' | 'playlists'

const TAB_LABELS: Record<Tab, string> = {
  music:     'Músicas',
  artists:   'Artistas',
  playlists: 'Playlists & Álbuns',
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminContentSection() {
  const { albums, artists, playlists, openMusicApp, showToast } = useAppStore(useShallow((s) => ({
    albums:      s.albums,
    artists:     s.artists,
    playlists:   s.playlists,
    openMusicApp: s.openMusicApp,
    showToast:    s.showToast,
  })))

  const [tab, setTab]       = useState<Tab>('music')
  const [q, setQ]           = useState('')
  const [genreF, setGenreF] = useState('')

  const tracksFlat = useMemo(() => {
    const out: { track: Track; album: Album }[] = []
    for (const al of albums) {
      for (const t of al.tracks) out.push({ track: t, album: al })
    }
    return out
  }, [albums])

  const filteredTracks = useMemo(() => {
    const s = q.trim().toLowerCase()
    return tracksFlat.filter(({ track, album }) => {
      const g   = (track.genre || album.genre || '').toLowerCase()
      const okG = !genreF.trim() || g.includes(genreF.trim().toLowerCase())
      if (!s) return okG
      return (
        (track.name.toLowerCase().includes(s) ||
          album.artist.toLowerCase().includes(s) ||
          album.name.toLowerCase().includes(s)) &&
        okG
      )
    })
  }, [tracksFlat, q, genreF])

  const filteredArtists = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return artists
    return artists.filter((a) => a.name.toLowerCase().includes(s))
  }, [artists, q])

  const filteredPlaylists = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return playlists
    return playlists.filter(
      (p) => p.name.toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s),
    )
  }, [playlists, q])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', padding: 4, borderRadius: 9, border: '1px solid var(--b2)', width: 'fit-content' }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setQ(''); setGenreF('') }}
            style={{
              padding: '6px 14px', borderRadius: 6,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: tab === t ? 'var(--bg5)' : 'transparent',
              color: tab === t ? 'var(--t1)' : 'var(--t3)',
              fontSize: 12, fontWeight: tab === t ? 500 : 400,
              transition: 'all .15s',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,.3)' : 'none',
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Filtrar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              padding: '8px 12px 8px 30px',
              width: 220,
              background: 'var(--bg3)', border: '1px solid var(--b2)',
              borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit',
              outline: 'none', transition: 'border-color .15s',
            }}
            onFocus={(e)  => { e.currentTarget.style.borderColor = 'var(--ac)' }}
            onBlur={(e)   => { e.currentTarget.style.borderColor = 'var(--b2)' }}
          />
        </div>
        {tab === 'music' && (
          <input
            placeholder="Género"
            value={genreF}
            onChange={(e) => setGenreF(e.target.value)}
            style={{
              padding: '8px 12px', width: 120,
              background: 'var(--bg3)', border: '1px solid var(--b2)',
              borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit',
              outline: 'none', transition: 'border-color .15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ac)' }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--b2)' }}
          />
        )}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t3)' }}>
          {tab === 'music'     && `${Math.min(filteredTracks.length, 150)} de ${filteredTracks.length} faixas`}
          {tab === 'artists'   && `${filteredArtists.length} artistas`}
          {tab === 'playlists' && `${filteredPlaylists.length} playlists`}
        </div>
      </div>

      {/* ── Tracks table ── */}
      {tab === 'music' && (
        <TableCard>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <TableHead cols={['#', 'Faixa', 'Artista', 'Álbum', 'Género', 'Estado', 'Ações']} />
            <tbody>
              {filteredTracks.slice(0, 150).map(({ track, album }, i) => (
                <DataRow key={track.id} isLast={i === Math.min(filteredTracks.length, 150) - 1}>
                  <Td muted>{i + 1}</Td>
                  <Td primary>{track.name}</Td>
                  <Td>{album.artist}</Td>
                  <Td>{album.name}</Td>
                  <Td muted>{track.genre || album.genre || '—'}</Td>
                  <Td>
                    <PublishedBadge />
                  </Td>
                  <Td>
                    <ActionLink
                      label="Editar"
                      onClick={() => { openMusicApp(); showToast('Use o editor no módulo Música') }}
                    />
                  </Td>
                </DataRow>
              ))}
              {filteredTracks.length === 0 && (
                <EmptyRow cols={7} msg="Nenhuma faixa encontrada" />
              )}
            </tbody>
          </table>
          {filteredTracks.length > 150 && (
            <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t3)', borderTop: '1px solid var(--b1)' }}>
              Mostrando 150 de {filteredTracks.length}. Afinar filtros para ver mais.
            </div>
          )}
        </TableCard>
      )}

      {/* ── Artists table ── */}
      {tab === 'artists' && (
        <TableCard>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <TableHead cols={['Artista', 'Álbuns', 'Faixas', 'Ações']} />
            <tbody>
              {filteredArtists.map((a, i) => (
                <DataRow key={a.id} isLast={i === filteredArtists.length - 1}>
                  <Td primary>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, hsl(${strHash(a.name) % 360}, 50%, 35%), hsl(${(strHash(a.name) + 60) % 360}, 50%, 28%))`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.7)',
                      }}>
                        {a.name.slice(0, 2).toUpperCase()}
                      </div>
                      {a.name}
                    </div>
                  </Td>
                  <Td>{a.albumCount}</Td>
                  <Td>{a.trackCount}</Td>
                  <Td>
                    <ActionLink
                      label="Editar"
                      onClick={() => { openMusicApp(); showToast('Biblioteca → Artistas') }}
                    />
                  </Td>
                </DataRow>
              ))}
              {filteredArtists.length === 0 && (
                <EmptyRow cols={4} msg="Nenhum artista encontrado" />
              )}
            </tbody>
          </table>
        </TableCard>
      )}

      {/* ── Playlists table ── */}
      {tab === 'playlists' && (
        <TableCard>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <TableHead cols={['Playlist', 'Faixas', 'Criada', 'Ações']} />
            <tbody>
              {filteredPlaylists.map((p: Playlist, i) => (
                <DataRow key={p.id} isLast={i === filteredPlaylists.length - 1}>
                  <Td primary>{p.name}</Td>
                  <Td>{p.trackCount}</Td>
                  <Td muted>{p.createdAt?.slice(0, 10) ?? '—'}</Td>
                  <Td>
                    <ActionLink
                      label="Editar"
                      onClick={() => { openMusicApp(); showToast('Separador Playlists') }}
                    />
                  </Td>
                </DataRow>
              ))}
              {filteredPlaylists.length === 0 && (
                <EmptyRow cols={4} msg="Nenhuma playlist encontrada" />
              )}
            </tbody>
          </table>
        </TableCard>
      )}

    </div>
  )
}

// ─── Table components ─────────────────────────────────────────────────────────

function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  )
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background: 'var(--bg4)', borderBottom: '1px solid var(--b2)' }}>
        {cols.map((c) => (
          <th key={c} style={{
            padding: '10px 14px', textAlign: 'left',
            fontSize: 11, fontWeight: 600, color: 'var(--t3)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
          }}>
            {c}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function DataRow({
  children, isLast,
}: {
  children: React.ReactNode; isLast: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <tr
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--b1)', background: hovered ? 'rgba(255,255,255,.02)' : 'transparent', transition: 'background .1s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </tr>
  )
}

function Td({ children, primary, muted }: { children: React.ReactNode; primary?: boolean; muted?: boolean }) {
  return (
    <td style={{ padding: '9px 14px', color: primary ? 'var(--t1)' : muted ? 'var(--t3)' : 'var(--t2)', verticalAlign: 'middle' }}>
      {children}
    </td>
  )
}

function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return (
    <tr>
      <td colSpan={cols} style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
        {msg}
      </td>
    </tr>
  )
}

function PublishedBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: 'rgba(29,185,84,.1)', color: 'var(--teal)',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} />
      publicado
    </span>
  )
}

function ActionLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--ach)', fontSize: 11, fontFamily: 'inherit',
        padding: 0, textDecoration: 'none', transition: 'opacity .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.65' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
    >
      {label} →
    </button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function strHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
