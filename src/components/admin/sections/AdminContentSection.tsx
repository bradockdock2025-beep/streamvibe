'use client'

import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import type { Album, Playlist, Track } from '@/types'

type Tab = 'music' | 'artists' | 'playlists'

export default function AdminContentSection() {
  const { albums, artists, playlists, openMusicApp, showToast } = useAppStore(useShallow((s) => ({
    albums: s.albums,
    artists: s.artists,
    playlists: s.playlists,
    openMusicApp: s.openMusicApp,
    showToast: s.showToast,
  })))

  const [tab, setTab] = useState<Tab>('music')
  const [q, setQ] = useState('')
  const [genreF, setGenreF] = useState('')

  const tracksFlat = useMemo(() => {
    const out: { track: Track; album: Album }[] = []
    for (const al of albums) {
      for (const t of al.tracks) {
        out.push({ track: t, album: al })
      }
    }
    return out
  }, [albums])

  const filteredTracks = useMemo(() => {
    const s = q.trim().toLowerCase()
    return tracksFlat.filter(({ track, album }) => {
      const g = (track.genre || album.genre || '').toLowerCase()
      const okG = !genreF.trim() || g.includes(genreF.trim().toLowerCase())
      if (!s) return okG
      const okS =
        track.name.toLowerCase().includes(s) ||
        album.artist.toLowerCase().includes(s) ||
        album.name.toLowerCase().includes(s)
      return okS && okG
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
    return playlists.filter((p) => p.name.toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s))
  }, [playlists, q])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(['music', 'artists', 'playlists'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--r)',
              border: tab === t ? '1px solid var(--ac)' : '1px solid var(--b2)',
              background: tab === t ? 'var(--acd)' : 'var(--bg2)',
              color: tab === t ? 'var(--ach)' : 'var(--t2)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t === 'music' ? 'Músicas' : t === 'artists' ? 'Artistas' : 'Playlists & álbuns'}
          </button>
        ))}
        <button
          type="button"
          onClick={() => openMusicApp()}
          style={{
            marginLeft: 'auto',
            padding: '8px 14px',
            borderRadius: 'var(--r)',
            border: '1px solid var(--teal)',
            background: 'var(--teald)',
            color: 'var(--teal)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Abrir módulo música (upload / edição)
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <input
          placeholder="Filtrar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            flex: '1 1 180px',
            maxWidth: 280,
            padding: '8px 12px',
            borderRadius: 'var(--r)',
            border: '1px solid var(--b2)',
            background: 'var(--bg3)',
            color: 'var(--t1)',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        />
        {tab === 'music' && (
          <input
            placeholder="Género"
            value={genreF}
            onChange={(e) => setGenreF(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--r)',
              border: '1px solid var(--b2)',
              background: 'var(--bg3)',
              color: 'var(--t1)',
              fontSize: 13,
              fontFamily: 'inherit',
              width: 120,
            }}
          />
        )}
      </div>

      {tab === 'music' && (
        <TableWrap>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--b2)', color: 'var(--t3)', textAlign: 'left' }}>
                <th style={{ padding: '8px 6px' }}>Faixa</th>
                <th style={{ padding: '8px 6px' }}>Artista</th>
                <th style={{ padding: '8px 6px' }}>Álbum</th>
                <th style={{ padding: '8px 6px' }}>Género</th>
                <th style={{ padding: '8px 6px' }}>Estado</th>
                <th style={{ padding: '8px 6px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTracks.slice(0, 150).map(({ track, album }) => (
                <tr key={track.id} style={{ borderBottom: '1px solid var(--b1)' }}>
                  <td style={{ padding: '8px 6px', color: 'var(--t1)' }}>{track.name}</td>
                  <td style={{ padding: '8px 6px', color: 'var(--t2)' }}>{album.artist}</td>
                  <td style={{ padding: '8px 6px', color: 'var(--t2)' }}>{album.name}</td>
                  <td style={{ padding: '8px 6px', color: 'var(--t3)' }}>{track.genre || album.genre || '—'}</td>
                  <td style={{ padding: '8px 6px', color: 'var(--teal)' }}>publicado</td>
                  <td style={{ padding: '8px 6px' }}>
                    <RowAction label="Editar" onClick={() => { openMusicApp(); showToast('Use o editor no módulo Música') }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTracks.length > 150 && (
            <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8 }}>Mostrando 150 de {filteredTracks.length}. Afinar filtros.</p>
          )}
        </TableWrap>
      )}

      {tab === 'artists' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--t3)' }}>
            Aprovação de novos artistas: fluxo não ligado a submissões neste projeto — contactos via módulo Música.
          </p>
          <TableWrap>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--b2)', color: 'var(--t3)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px' }}>Nome</th>
                  <th style={{ padding: '8px 6px' }}>Álbuns</th>
                  <th style={{ padding: '8px 6px' }}>Faixas</th>
                  <th style={{ padding: '8px 6px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredArtists.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '8px 6px', color: 'var(--t1)' }}>{a.name}</td>
                    <td style={{ padding: '8px 6px', color: 'var(--t2)' }}>{a.albumCount}</td>
                    <td style={{ padding: '8px 6px', color: 'var(--t2)' }}>{a.trackCount}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <RowAction label="Editar" onClick={() => { openMusicApp(); showToast('Biblioteca → Artistas') }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      )}

      {tab === 'playlists' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--t3)' }}>
            Destacar na home: requer campo no modelo de dados — por agora gerir playlists no módulo Música.
          </p>
          <TableWrap>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--b2)', color: 'var(--t3)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px' }}>Playlist</th>
                  <th style={{ padding: '8px 6px' }}>Faixas</th>
                  <th style={{ padding: '8px 6px' }}>Criada</th>
                  <th style={{ padding: '8px 6px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlaylists.map((p: Playlist) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '8px 6px', color: 'var(--t1)' }}>{p.name}</td>
                    <td style={{ padding: '8px 6px', color: 'var(--t2)' }}>{p.trackCount}</td>
                    <td style={{ padding: '8px 6px', color: 'var(--t3)' }}>{p.createdAt?.slice(0, 10) ?? '—'}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <RowAction label="Editar" onClick={() => { openMusicApp(); showToast('Separador Playlists') }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      )}

      <div
        style={{
          padding: 20,
          border: '1px dashed var(--b2)',
          borderRadius: 'var(--r2)',
          background: 'var(--bg2)',
          textAlign: 'center',
          color: 'var(--t3)',
          fontSize: 12,
        }}
      >
        Arrastar ficheiros para upload: use o módulo <strong style={{ color: 'var(--t2)' }}>Música → Upload</strong> (drag-and-drop já existente).
      </div>
    </div>
  )
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--b2)', borderRadius: 'var(--r2)', background: 'var(--bg2)' }}>
      {children}
    </div>
  )
}

function RowAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--ach)',
        cursor: 'pointer',
        fontSize: 11,
        padding: 0,
        fontFamily: 'inherit',
        textDecoration: 'underline',
      }}
    >
      {label}
    </button>
  )
}
