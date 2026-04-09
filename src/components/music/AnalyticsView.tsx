'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { adminHeaders } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useMobile } from '@/hooks/useMobile'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayStats {
  total_plays:   number
  plays_today:   number
  plays_week:    number
  unique_tracks: number
}

interface TopTrack {
  track_id:    string
  track_name:  string
  dur:         string
  artist_name: string
  album_name:  string
  cover:       string
  play_count:  number
}

interface TopArtist {
  artist_id:   string
  artist_name: string
  image:       string
  play_count:  number
}

interface HistoryEntry {
  play_id:     string
  played_at:   string
  track_id:    string
  track_name:  string
  dur:         string
  artist_name: string
  cover:       string
}

interface AnalyticsData {
  stats:      PlayStats | null
  topTracks:  TopTrack[]
  topArtists: TopArtist[]
  history:    HistoryEntry[]
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TT { show: boolean; x: number; y: number; lines: string[] }
const hideTT: TT = { show: false, x: 0, y: 0, lines: [] }

function Tooltip({ tt }: { tt: TT }) {
  if (!tt.show) return null
  return (
    <div style={{
      position: 'fixed',
      left: tt.x + 14,
      top: tt.y - 10,
      zIndex: 9999,
      background: '#1e1e28',
      border: '1px solid rgba(29,185,84,.25)',
      borderRadius: 8,
      padding: '8px 12px',
      pointerEvents: 'none',
      boxShadow: '0 8px 24px rgba(0,0,0,.55)',
      minWidth: 160, maxWidth: 240,
    }}>
      {tt.lines.map((line, i) => (
        <div key={i} style={{
          fontSize: i === 0 ? 12 : 11,
          fontWeight: i === 0 ? 600 : 400,
          color: i === 0 ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.5)',
          marginBottom: i < tt.lines.length - 1 ? 3 : 0,
          lineHeight: 1.4,
        }}>
          {line}
        </div>
      ))}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch { return iso }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnalyticsView() {
  const isMobile = useMobile()
  const { mpPlayTrack, albums } = useAppStore(useShallow((s) => ({
    mpPlayTrack: s.mpPlayTrack,
    albums:      s.albums,
  })))

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch('/api/analytics', { headers: adminHeaders() })
      .then((res) => res.ok ? res.json() : Promise.reject(res.statusText))
      .then((json) => { setData(json); setLoading(false) })
      .catch((err) => { setError(String(err)); setLoading(false) })
  }, [])

  function playTrack(trackId: string) {
    for (const album of albums) {
      const idx = album.tracks.findIndex((t) => t.id === trackId)
      if (idx >= 0) { mpPlayTrack(album.id, idx); return }
    }
  }

  const pad = isMobile ? '20px 14px 32px' : '36px 32px 40px'

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.3)', fontSize: 14 }}>
        Loading analytics…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,82,82,.7)', fontSize: 14 }}>
        {error || 'No data'}
      </div>
    )
  }

  const { stats, topTracks, topArtists, history } = data
  const noData = !stats || stats.total_plays === 0
  const maxArtistPlays = topArtists[0]?.play_count || 1
  const maxTrackPlays  = topTracks[0]?.play_count || 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{ flex: 1, overflowY: 'auto', padding: pad }}
    >
      {/* Header */}
      <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-.6px' }}>
        Your Stats
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', marginBottom: isMobile ? 24 : 32 }}>
        Listening history and play counts
      </p>

      {noData ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,.2)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No plays yet</p>
          <p style={{ fontSize: 13 }}>Start listening to see your stats here</p>
        </div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14, marginBottom: isMobile ? 32 : 40 }}>
            <StatCard
              label="Total plays" value={stats?.total_plays ?? 0} icon="▶"
              tooltip={['Total plays ever', 'Every track you\'ve started', 'All time']}
            />
            <StatCard
              label="Today" value={stats?.plays_today ?? 0} icon="☀"
              tooltip={['Plays today', 'Tracks started since midnight', 'Resets at 00:00 UTC']}
            />
            <StatCard
              label="This week" value={stats?.plays_week ?? 0} icon="📅"
              tooltip={['Plays this week', 'Last 7 days rolling window', `${stats?.plays_week ?? 0} tracks`]}
            />
            <StatCard
              label="Unique tracks" value={stats?.unique_tracks ?? 0} icon="🎵"
              tooltip={['Unique tracks', 'Different songs you\'ve heard', 'Counts each track once']}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: isMobile ? 32 : 40, alignItems: 'start' }}>
            {/* ── Left column ── */}
            <div>
              {/* Top Tracks */}
              {topTracks.length > 0 && (
                <TopTracksSection
                  tracks={topTracks}
                  maxPlays={maxTrackPlays}
                  onPlay={playTrack}
                />
              )}

              {/* Recent History */}
              {history.length > 0 && (
                <HistorySection history={history} onPlay={playTrack} />
              )}
            </div>

            {/* ── Right column: Top Artists ── */}
            {topArtists.length > 0 && (
              <TopArtistsSection
                artists={topArtists}
                maxPlays={maxArtistPlays}
              />
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}

// ─── Top Tracks with tooltip ─────────────────────────────────────────────────

function TopTracksSection({ tracks, maxPlays, onPlay }: {
  tracks: TopTrack[]
  maxPlays: number
  onPlay: (id: string) => void
}) {
  const [tt, setTT] = useState<TT>(hideTT)

  function showTT(e: React.MouseEvent, t: TopTrack, rank: number) {
    const pct = maxPlays > 0 ? Math.round((t.play_count / maxPlays) * 100) : 0
    setTT({
      show: true,
      x: e.clientX,
      y: e.clientY,
      lines: [
        `#${rank} — ${t.track_name}`,
        `👤 ${t.artist_name}`,
        `💿 ${t.album_name}`,
        `▶ ${t.play_count} plays · ${pct}% of your top`,
        `⏱ ${t.dur}`,
      ],
    })
  }

  return (
    <section style={{ marginBottom: 36 }}>
      <SectionTitle>Top Tracks</SectionTitle>
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        onMouseLeave={() => setTT(hideTT)}
      >
        {tracks.map((t, i) => (
          <div
            key={t.track_id}
            onClick={() => onPlay(t.track_id)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', transition: 'background .12s' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,.05)'
              showTT(e, t, i + 1)
            }}
            onMouseMove={(e) => showTT(e, t, i + 1)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Rank */}
            <span style={{ width: 20, textAlign: 'center', fontSize: 13, fontWeight: 700, color: i < 3 ? '#1db954' : 'rgba(255,255,255,.25)', flexShrink: 0 }}>
              {i + 1}
            </span>

            {/* Cover */}
            <div style={{ width: 38, height: 38, borderRadius: 4, overflow: 'hidden', background: '#252530', flexShrink: 0 }}>
              {t.cover
                ? /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={t.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                : <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'rgba(255,255,255,.2)', fontWeight: 700 }}>
                    {t.track_name.charAt(0)}
                  </span>
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.track_name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.artist_name} · {t.album_name}
              </div>
            </div>

            {/* Play count */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 12, color: '#1db954', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {t.play_count}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)' }}>plays</span>
            </div>

            {/* Duration */}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', flexShrink: 0, fontVariantNumeric: 'tabular-nums', marginLeft: 4 }}>
              {t.dur}
            </span>
          </div>
        ))}
      </div>
      <Tooltip tt={tt} />
    </section>
  )
}

// ─── Recent History with tooltip ─────────────────────────────────────────────

function HistorySection({ history, onPlay }: {
  history: HistoryEntry[]
  onPlay: (id: string) => void
}) {
  const [tt, setTT] = useState<TT>(hideTT)

  function showTT(e: React.MouseEvent, h: HistoryEntry) {
    setTT({
      show: true,
      x: e.clientX,
      y: e.clientY,
      lines: [
        h.track_name,
        `👤 ${h.artist_name}`,
        `🕐 ${fmtDate(h.played_at)}`,
        `⏱ ${h.dur}`,
      ],
    })
  }

  return (
    <section>
      <SectionTitle>Recent History</SectionTitle>
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 1 }}
        onMouseLeave={() => setTT(hideTT)}
      >
        {history.map((h) => (
          <div
            key={h.play_id}
            onClick={() => onPlay(h.track_id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7, cursor: 'pointer', transition: 'background .12s' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,.04)'
              showTT(e, h)
            }}
            onMouseMove={(e) => showTT(e, h)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Cover */}
            <div style={{ width: 34, height: 34, borderRadius: 4, overflow: 'hidden', background: '#252530', flexShrink: 0 }}>
              {h.cover
                ? /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={h.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                : null
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {h.track_name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {h.artist_name}
              </div>
            </div>

            {/* Time */}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', flexShrink: 0 }}>
              {timeAgo(h.played_at)}
            </span>
          </div>
        ))}
      </div>
      <Tooltip tt={tt} />
    </section>
  )
}

// ─── Top Artists with tooltip ─────────────────────────────────────────────────

function TopArtistsSection({ artists, maxPlays }: {
  artists: TopArtist[]
  maxPlays: number
}) {
  const [tt, setTT] = useState<TT>(hideTT)

  function showTT(e: React.MouseEvent, a: TopArtist, rank: number) {
    const pct = maxPlays > 0 ? Math.round((a.play_count / maxPlays) * 100) : 0
    setTT({
      show: true,
      x: e.clientX,
      y: e.clientY,
      lines: [
        `#${rank} — ${a.artist_name}`,
        `▶ ${a.play_count} ${a.play_count === 1 ? 'play' : 'plays'}`,
        `${pct}% of your top artist`,
        rank === 1 ? '🥇 Your most played' : rank === 2 ? '🥈 Second most played' : `Top ${rank}`,
      ],
    })
  }

  return (
    <div>
      <SectionTitle>Top Artists</SectionTitle>
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        onMouseLeave={() => setTT(hideTT)}
      >
        {artists.map((a, i) => (
          <div
            key={a.artist_id}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)', cursor: 'default', transition: 'background .12s' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.06)'
              showTT(e, a, i + 1)
            }}
            onMouseMove={(e) => showTT(e, a, i + 1)}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.03)'
            }}
          >
            {/* Rank badge */}
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? '#1db954' : 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? '#000' : 'rgba(255,255,255,.4)', flexShrink: 0 }}>
              {i + 1}
            </span>

            {/* Avatar */}
            <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #2e2840, #1a1a28)', flexShrink: 0 }}>
              {a.image
                ? /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={a.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                : <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.25)' }}>
                    {a.artist_name.charAt(0).toUpperCase()}
                  </span>
              }
            </div>

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {a.artist_name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>
                {a.play_count} {a.play_count === 1 ? 'play' : 'plays'}
              </div>
            </div>

            {/* Bar */}
            <div style={{ width: 48, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.08)', flexShrink: 0, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2, background: '#1db954',
                width: `${Math.round((a.play_count / maxPlays) * 100)}%`,
              }} />
            </div>
          </div>
        ))}
      </div>
      <Tooltip tt={tt} />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon, tooltip }: {
  label: string
  value: number
  icon: string
  tooltip: string[]
}) {
  const [tt, setTT] = useState<TT>(hideTT)

  return (
    <div
      style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '16px 18px', cursor: 'default', transition: 'border-color .15s, transform .1s', position: 'relative' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'rgba(29,185,84,.3)'
        el.style.transform = 'translateY(-1px)'
        setTT({ show: true, x: e.clientX, y: e.clientY, lines: tooltip })
      }}
      onMouseMove={(e) => setTT((prev) => prev.show ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'rgba(255,255,255,.07)'
        el.style.transform = 'translateY(0)'
        setTT(hideTT)
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{label}</div>
      <Tooltip tt={tt} />
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.85)', letterSpacing: '-.2px', marginBottom: 14 }}>
      {children}
    </h2>
  )
}
