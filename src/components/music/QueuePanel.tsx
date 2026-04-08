'use client'

import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'

interface QueuePanelProps {
  onClose: () => void
}

export default function QueuePanel({ onClose }: QueuePanelProps) {
  const { mpQueue, mpQueueIdx, albums, mpPlayTrack } = useAppStore(useShallow((s) => ({
    mpQueue:    s.mpQueue,
    mpQueueIdx: s.mpQueueIdx,
    albums:     s.albums,
    mpPlayTrack: s.mpPlayTrack,
  })))

  // Resolve a queue item to its track/album data
  function resolve(item: { albumId: string; trackId: string }) {
    const album = albums.find((a) => a.id === item.albumId)
    const track = album?.tracks.find((t) => t.id === item.trackId)
    return track && album ? { track, album } : null
  }

  function jumpTo(queueIdx: number) {
    const item = mpQueue[queueIdx]
    if (!item) return
    const album = albums.find((a) => a.id === item.albumId)
    if (!album) return
    const trackIdx = album.tracks.findIndex((t) => t.id === item.trackId)
    if (trackIdx < 0) return
    mpPlayTrack(album.id, trackIdx)
    // rebuild queue from that album starting at trackIdx
  }

  const nowItem   = mpQueue[mpQueueIdx]
  const nowData   = nowItem ? resolve(nowItem) : null
  const nextItems = mpQueue.slice(mpQueueIdx + 1)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 58 }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', right: 16, bottom: 80,
        width: 320, maxHeight: 'calc(100vh - 120px)',
        background: '#1e1e26', border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.6)',
        display: 'flex', flexDirection: 'column',
        zIndex: 59, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Queue</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', display: 'flex', padding: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.4)')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 8 }}>
          {/* Now Playing */}
          {nowData && (
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.28)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                A tocar
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 7, background: 'rgba(29,185,84,.08)', border: '1px solid rgba(29,185,84,.15)' }}>
                <Cover src={nowData.album.cover} name={nowData.track.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1db954', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {nowData.track.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {nowData.album.artist}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', flexShrink: 0 }}>{nowData.track.dur}</span>
              </div>
            </div>
          )}

          {/* Next Up */}
          {nextItems.length > 0 ? (
            <div style={{ padding: '0 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.28)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                A seguir · {nextItems.length} {nextItems.length === 1 ? 'faixa' : 'faixas'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {nextItems.map((item, i) => {
                  const d = resolve(item)
                  if (!d) return null
                  const qIdx = mpQueueIdx + 1 + i
                  return (
                    <div
                      key={`${item.trackId}-${qIdx}`}
                      onClick={() => jumpTo(qIdx)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 7, cursor: 'pointer', transition: 'background .12s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ width: 16, fontSize: 11, color: 'rgba(255,255,255,.22)', textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <Cover src={d.album.cover} name={d.track.name} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {d.track.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {d.album.artist}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', flexShrink: 0 }}>{d.track.dur}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            !nowData && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,.2)', fontSize: 13 }}>
                Fila vazia
              </div>
            )
          )}

          {nextItems.length === 0 && nowData && (
            <div style={{ padding: '12px 16px', textAlign: 'center', color: 'rgba(255,255,255,.18)', fontSize: 12 }}>
              Última faixa da fila
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Cover({ src, name, size }: { src: string; name: string; size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 4, background: '#252530', overflow: 'hidden', flexShrink: 0 }}>
      {src
        ? /* eslint-disable-next-line @next/next/no-img-element */
          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        : <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, color: 'rgba(255,255,255,.2)', fontWeight: 700 }}>
            {name.charAt(0)}
          </span>
      }
    </div>
  )
}
