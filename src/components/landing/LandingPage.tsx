'use client'

import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useScroll, useSpring,
} from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'

// ─── Local Assets ─────────────────────────────────────────────────────────────
const A = {
  hero:   '/uploads/podfee-ezgif.webp',
  cat1:   '/uploads/assets/Whisk_bf4151f536604d3bea540c4f20ba6758dr.jpeg',
  cat2:   '/uploads/assets/Whisk_369dee8ba97f4fa84a7414b968bb517bdr.jpeg',
  cat3:   '/uploads/assets/Whisk_ef5e182b46895cda5e4405bd9040194ddr.jpeg',
  cat4:   '/uploads/assets/Whisk_8fbacaa0a69ef3d843749f802acf4422dr.jpeg',
  player: '/uploads/assets/Whisk_3d94dbce457bec2bc2941eb99880a3b5dr.jpeg',
}

// ─── Design Tokens (DESIGN.md) ────────────────────────────────────────────────
const BG    = '#0a0a0a'   // surface base
const SURF  = '#121212'   // surface container

const RED   = '#ff3b30'   // primary
const E     = [0.2, 1, 0.3, 1] as [number, number, number, number]

const MAN  = "'Manrope', 'Inter', system-ui, sans-serif"
const BODY = "'Inter', system-ui, sans-serif"

// ─── SVG Icon primitives ──────────────────────────────────────────────────────
function Ico({ d, size = 20, fill = 'none', stroke = 'currentColor', sw = 1.8 }: {
  d: string; size?: number; fill?: string; stroke?: string; sw?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

// Common icon paths
const IC = {
  search:     'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  bell:       'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  heart:      'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  play:       'M5 3l14 9-14 9V3z',
  pause:      'M6 4h4v16H6zM14 4h4v16h-4z',
  skipPrev:   'M19 20L9 12l10-8v16zM5 4h2v16H5z',
  skipNext:   'M5 4l10 8-10 8V4zM17 4h2v16h-2z',
  shuffle:    'M16 3h5v5M4 20L21 3M16 21h5v-5M15 15l6 6M4 4l5 5',
  repeat:     'M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3',
  volume:     'M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07',
  listPlay:   'M21 15V19M21 5V9M21 10.5H3M3 15.5h14M3 5.5h14',
  lyrics:     'M9 18V5l12-2v13M6 21a3 3 0 100-6 3 3 0 000 6zM18 19a3 3 0 100-6 3 3 0 000 6z',
  fullscr:    'M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3',
  plus:       'M12 5v14M5 12h14',
  share:      'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
  more:       'M12 5h.01M12 12h.01M12 19h.01',
  arrow:      'M5 12h14M12 5l7 7-7 7',
  globe:      'M3 12a9 9 0 1018 0 9 9 0 00-18 0M12 3a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10zM3 12h18',
  podcast:    'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8',
  waves:      'M2 12c.5-4.5 2.5-7 4-7s3.5 2.5 4 7-.5 9-2 9-3.5-4.5-4-7M14 12c.5-4.5 2.5-7 4-7s3 2.5 3 7-1.5 9-3 9',
}

// ─── Scroll Progress Bar ──────────────────────────────────────────────────────
function ProgressBar({ container }: { container: React.RefObject<HTMLDivElement | null> }) {
  const { scrollYProgress } = useScroll({ container })
  const w = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  return (
    <motion.div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 9999,
      background: RED, transformOrigin: '0%', scaleX: w,
    }} />
  )
}

// ─── Animated Waveform ────────────────────────────────────────────────────────
function Wave({ n = 16, color = 'rgba(255,59,48,0.7)', h = 18 }: {
  n?: number; color?: string; h?: number
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height: h }}>
      {Array.from({ length: n }).map((_, i) => {
        const p = Math.max(0.12, Math.sin(i * 0.52) * 0.45 + Math.cos(i * 0.21) * 0.3 + 0.28)
        return (
          <motion.div key={i}
            style={{ width: 2, background: color, borderRadius: 2, transformOrigin: 'bottom' }}
            animate={{ scaleY: [p, p * 0.28 + 0.08, p * 1.28, p * 0.52, p] }}
            transition={{ duration: 1.5 + (i % 5) * 0.28, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
            initial={{ height: p * h }}
          />
        )
      })}
    </div>
  )
}

// ─── Marquee strip ────────────────────────────────────────────────────────────
function MarqueeStrip() {
  const items = [
    'Testemunhos', 'Gospel', 'Missão', 'Fé', 'Palavra', 'Sermões',
    'Milagres', 'Louvor', 'Oração', 'Comunidade', 'Altar Digital', 'PodFé',
  ]
  const doubled = [...items, ...items]
  return (
    <div style={{
      overflow: 'hidden',
      borderTop: '0.5px solid rgba(255,255,255,0.05)',
      borderBottom: '0.5px solid rgba(255,255,255,0.05)',
      background: 'rgba(8,8,8,0.92)',
      padding: '12px 0',
    }}>
      <motion.div
        style={{ display: 'flex', gap: 0, width: 'max-content' }}
        animate={{ x: ['0px', '-50%'] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <span style={{
              fontFamily: BODY, fontSize: 9.5, fontWeight: 700, letterSpacing: 3.5,
              textTransform: 'uppercase' as const,
              color: i % items.length === 0 ? RED : 'rgba(255,255,255,0.18)',
              padding: '0 28px', whiteSpace: 'nowrap' as const,
            }}>{item}</span>
            <span style={{ color: 'rgba(255,255,255,0.07)', fontSize: 7 }}>◆</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

// ─── Episode Row ──────────────────────────────────────────────────────────────
function EpisodeRow({ num, img, title, desc, duration, premium, isPlaying, onPlay, onAdd, onShare }: {
  num: string; img: string; title: string; desc: string
  duration: string; premium?: boolean; isPlaying?: boolean
  onPlay: () => void; onAdd: () => void; onShare: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <motion.div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onPlay}
      animate={{ background: hov ? 'rgba(255,255,255,0.03)' : 'transparent' }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 32, padding: '20px 24px',
        borderRadius: 16, cursor: 'pointer',
        borderBottom: '0.5px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Number / playing indicator */}
      <span style={{
        fontFamily: MAN, fontSize: 20, fontWeight: 300, width: 28, flexShrink: 0,
        color: isPlaying ? RED : hov ? RED : 'rgba(255,255,255,0.18)',
        transition: 'color 0.3s',
      }}>
        {isPlaying ? <Ico d={IC.pause} size={18} stroke={RED} fill="none" sw={2} /> : num}
      </span>

      {/* Thumbnail */}
      <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
        <img src={img} alt={title} style={{
          width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          outline: isPlaying ? `2px solid ${RED}` : 'none',
        }} />
        <motion.div
          animate={{ opacity: hov ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            background: 'rgba(0,0,0,0.62)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ico d={isPlaying ? IC.pause : IC.play} size={22} fill="#fff" stroke="none" />
        </motion.div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          {premium && (
            <span style={{
              fontFamily: BODY, fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
              background: RED, color: '#fff', padding: '2px 7px', borderRadius: 4,
              textTransform: 'uppercase' as const,
            }}>Premium</span>
          )}
          <span style={{ fontFamily: BODY, fontSize: 10.5, fontWeight: 600, letterSpacing: 2.5, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.28)' }}>{duration}</span>
        </div>
        <h3 style={{
          fontFamily: MAN, fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 4,
          color: isPlaying ? RED : hov ? RED : '#fff', transition: 'color 0.3s', letterSpacing: -0.3,
        }}>{title}</h3>
        <p style={{ fontFamily: BODY, fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>

      {/* Actions */}
      <motion.div
        animate={{ opacity: hov ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ display: 'flex', alignItems: 'center', gap: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.span onClick={onAdd} whileHover={{ color: RED }}
          style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'color 0.2s' }}>
          <Ico d={IC.plus} size={18} sw={1.8} />
        </motion.span>
        <motion.span onClick={onShare} whileHover={{ color: RED }}
          style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'color 0.2s' }}>
          <Ico d={IC.share} size={18} sw={1.8} />
        </motion.span>
        <motion.span onClick={onPlay} whileHover={{ color: RED }}
          style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'color 0.2s' }}>
          <Ico d={IC.more} size={18} sw={2.5} />
        </motion.span>
      </motion.div>
    </motion.div>
  )
}

// ─── Category Card ────────────────────────────────────────────────────────────
function CatCard({ img, label, cat, desc, tall }: {
  img: string; label: string; cat?: string; desc?: string; tall?: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <motion.div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 20,
        background: SURF, height: tall ? '100%' : undefined,
        cursor: 'pointer',
      }}
    >
      <motion.img
        src={img} alt={label}
        animate={{ scale: hov ? 1.07 : 1 }}
        transition={{ duration: 1.1, ease: E }}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', filter: 'brightness(0.65)',
        }}
      />
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
      }} />
      {/* Content */}
      <div style={{ position: 'relative', padding: tall ? '36px 32px' : '24px 24px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {cat && (
          <span style={{ fontFamily: BODY, fontSize: 9.5, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase' as const, color: RED, marginBottom: 6, display: 'block' }}>{cat}</span>
        )}
        <h3 style={{ fontFamily: MAN, fontSize: tall ? 32 : 20, fontWeight: 800, margin: 0, marginBottom: desc ? 8 : 0, letterSpacing: -0.5, color: '#fff' }}>{label}</h3>
        {desc && (
          <p style={{ fontFamily: BODY, fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6, maxWidth: 320 }}>{desc}</p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Genre gradient palette (deterministic, hash-based) ──────────────────────
const GENRE_GRADIENTS: [string, string][] = [
  ['#1a1a2e', '#e94560'],
  ['#0d2137', '#1a6b5c'],
  ['#1f1035', '#c850c0'],
  ['#0a1628', '#e05d44'],
  ['#0f2027', '#2c5364'],
  ['#1a0533', '#6a0572'],
  ['#0d1b2a', '#e94040'],
  ['#101820', '#fee715'],
  ['#1b1b2f', '#e84545'],
  ['#162447', '#1f4068'],
  ['#1b262c', '#0f3460'],
  ['#0a0a0a', '#e63946'],
]

function genreGradient(genre: string): [string, string] {
  let h = 0
  for (let i = 0; i < genre.length; i++) h = (h * 31 + genre.charCodeAt(i)) >>> 0
  return GENRE_GRADIENTS[h % GENRE_GRADIENTS.length]
}

interface GenreInfo { name: string; albumCount: number; trackCount: number; covers: string[] }

function deriveGenres(albums: { genre?: string; cover?: string; tracks?: unknown[] }[]): GenreInfo[] {
  const map = new Map<string, GenreInfo>()
  for (const album of albums) {
    const g = album.genre?.trim()
    if (!g) continue
    const existing = map.get(g)
    if (existing) {
      existing.albumCount++
      existing.trackCount += (album.tracks as unknown[])?.length ?? 0
      if (album.cover && existing.covers.length < 4) existing.covers.push(album.cover)
    } else {
      map.set(g, {
        name: g,
        albumCount: 1,
        trackCount: (album.tracks as unknown[])?.length ?? 0,
        covers: album.cover ? [album.cover] : [],
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.albumCount - a.albumCount)
}

// ─── Genre card (landing, gradient-based) ────────────────────────────────────
function GenreLandingCard({ genre, onClick }: { genre: GenreInfo; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  const [from, to] = genreGradient(genre.name)
  return (
    <motion.div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.35, ease: [0.2, 1, 0.3, 1] }}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 18,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        cursor: 'pointer', padding: '28px 24px',
        minHeight: 130, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        boxShadow: hov ? `0 16px 48px rgba(0,0,0,0.55)` : '0 4px 16px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.3s',
      }}
    >
      {/* Cover mosaic (up to 4 covers faint in background) */}
      {genre.covers[0] && (
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.18,
          backgroundImage: `url(${genre.covers[0]})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(2px)',
        }} />
      )}
      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${from}cc, ${to}99)` }} />
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <h3 style={{
          fontFamily: MAN, fontSize: 18, fontWeight: 800, margin: 0, marginBottom: 4,
          letterSpacing: -0.3, color: '#fff',
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>{genre.name}</h3>
        <span style={{
          fontFamily: BODY, fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
          color: 'rgba(255,255,255,0.6)',
        }}>
          {genre.albumCount} {genre.albumCount === 1 ? 'álbum' : 'álbuns'}
        </span>
      </div>
      {/* Hover arrow */}
      <motion.div
        animate={{ opacity: hov ? 1 : 0, x: hov ? 0 : -6 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute', top: 20, right: 20, zIndex: 2,
          color: 'rgba(255,255,255,0.8)',
        }}
      >
        <Ico d={IC.arrow} size={16} sw={2} />
      </motion.div>
    </motion.div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtSec(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const goAuth            = useAppStore((s) => s.goAuth)
  const openMusicApp      = useAppStore((s) => s.openMusicApp)
  const mpOpenGenre       = useAppStore((s) => s.mpOpenGenre)
  const albums            = useAppStore((s) => s.albums)
  // ── Playback store ──
  const mpPlaying         = useAppStore((s) => s.mpPlaying)
  const mpProgress        = useAppStore((s) => s.mpProgress)
  const mpCurrentSec      = useAppStore((s) => s.mpCurrentSec)
  const mpTotalSec        = useAppStore((s) => s.mpTotalSec)
  const mpCurrentTrackId  = useAppStore((s) => s.mpCurrentTrackId)
  const mpShuffling       = useAppStore((s) => s.mpShuffling)
  const mpRepeating       = useAppStore((s) => s.mpRepeating)
  const mpVolume          = useAppStore((s) => s.mpVolume)
  const mpTogglePlay      = useAppStore((s) => s.mpTogglePlay)
  const mpSetProgress     = useAppStore((s) => s.mpSetProgress)
  const mpPrev            = useAppStore((s) => s.mpPrev)
  const mpNext            = useAppStore((s) => s.mpNext)
  const mpToggleShuffle   = useAppStore((s) => s.mpToggleShuffle)
  const mpToggleRepeat    = useAppStore((s) => s.mpToggleRepeat)
  const mpSetVolume       = useAppStore((s) => s.mpSetVolume)
  const mpPlayTrack       = useAppStore((s) => s.mpPlayTrack)
  const mpLiked           = useAppStore((s) => s.mpLiked)
  const mpToggleLike      = useAppStore((s) => s.mpToggleLike)

  const wrap = useRef<HTMLDivElement>(null)

  function scrollToSection(id: string) {
    const el = wrap.current?.querySelector(`#${id}`) as HTMLElement | null
    if (!el || !wrap.current) return
    wrap.current.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' })
  }

  // ── Derive current track info from store ──
  const currentTrack = (() => {
    if (!mpCurrentTrackId) return null
    for (const album of albums) {
      const t = (album as { tracks?: { id: string; name: string; dur: string }[] }).tracks?.find(t => t.id === mpCurrentTrackId)
      if (t) return {
        name: t.name,
        dur: t.dur,
        cover: (album as { cover?: string }).cover ?? '',
        artist: (album as { artist?: string }).artist ?? '',
        albumName: (album as { name?: string }).name ?? '',
      }
    }
    return null
  })()

  const genres = deriveGenres(albums as { genre?: string; cover?: string; tracks?: unknown[] }[])

  async function handleBiblioteca() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) openMusicApp()
    else goAuth()
  }

  async function handleGenreClick(genreName: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) { openMusicApp(); mpOpenGenre(genreName) }
    else goAuth()
  }

  // Flatten all tracks from all albums, take first 10, enrich with album cover + artist
  const recentTracks = (() => {
    const result: { num: string; img: string; title: string; desc: string; duration: string; albumId: string; trackIdx: number; trackId: string }[] = []
    for (const album of albums) {
      const a = album as { id: string; tracks?: { id: string; name: string; dur: string; genre: string }[]; cover?: string; artist?: string; name?: string }
      for (let idx = 0; idx < (a.tracks?.length ?? 0); idx++) {
        if (result.length >= 10) break
        const track = a.tracks![idx]
        result.push({
          num: String(result.length + 1).padStart(2, '0'),
          img: a.cover ?? '',
          title: track.name,
          desc: `${a.artist ?? ''} · ${a.name ?? ''}`,
          duration: track.dur,
          albumId: a.id,
          trackIdx: idx,
          trackId: track.id,
        })
      }
      if (result.length >= 10) break
    }
    return result
  })()

  async function handleTrackPlay(albumId: string, trackIdx: number) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) mpPlayTrack(albumId, trackIdx)
    else goAuth()
  }

  async function handleLikeCurrentTrack() {
    if (!mpCurrentTrackId) return
    const { data: { session } } = await supabase.auth.getSession()
    if (session) mpToggleLike(mpCurrentTrackId)
    else goAuth()
  }

  function handleShare(title: string, desc: string) {
    if (navigator.share) {
      navigator.share({ title, text: desc, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(`${title} — ${window.location.href}`).catch(() => {})
    }
  }
  // Load Manrope from Google Fonts
  useEffect(() => {
    const id = 'manrope-font-link'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id   = id
    link.rel  = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@200;400;600;800&display=swap'
    document.head.appendChild(link)
  }, [])

  return (
    <div
      ref={wrap}
      style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: BG, scrollBehavior: 'smooth' }}
    >
      <ProgressBar container={wrap} />

      {/* ══════════════════════════════════════════════════════════════
          NAV — glass, fixed, editorial
      ══════════════════════════════════════════════════════════════ */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: E, delay: 0.2 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 48px', height: 72,
          background: 'rgba(10,10,10,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '0.5px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: RED,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico d={IC.waves} size={16} stroke="#fff" sw={1.8} />
          </div>
          <span style={{ fontFamily: MAN, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
            PodFé<span style={{ fontWeight: 300, color: 'rgba(255,255,255,0.45)' }}>Play</span>
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <motion.a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('section-categories') }}
            whileHover={{ color: '#fff' }}
            style={{ fontFamily: MAN, fontSize: 13, fontWeight: 600, letterSpacing: 0.1, color: '#fff', textDecoration: 'none', cursor: 'pointer', borderBottom: `2px solid ${RED}`, paddingBottom: 2, transition: 'color 0.25s' }}>
            Descobrir
          </motion.a>
          <motion.a href="#" onClick={(e) => { e.preventDefault(); handleBiblioteca() }}
            whileHover={{ color: '#fff' }}
            style={{ fontFamily: MAN, fontSize: 13, fontWeight: 600, letterSpacing: 0.1, color: 'rgba(255,255,255,0.42)', textDecoration: 'none', cursor: 'pointer', borderBottom: '2px solid transparent', paddingBottom: 2, transition: 'color 0.25s' }}>
            Biblioteca
          </motion.a>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <motion.button
            onClick={handleBiblioteca}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{
              background: RED, color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: BODY, letterSpacing: 0.2,
            }}
          >Entrar</motion.button>
        </div>
      </motion.nav>


      {/* ══════════════════════════════════════════════════════════════
          HERO — full-screen image, left-aligned editorial layout
      ══════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', height: '100vh', overflow: 'hidden',
        display: 'flex', alignItems: 'center', padding: '0 64px',
      }}>
        {/* Background image */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img src={A.hero} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {/* Vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 68% 50%, transparent 0%, rgba(10,10,10,0.82) 100%)',
          }} />
          {/* Left gradient — creates the editorial "text over image" effect */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, #0a0a0a 14%, rgba(10,10,10,0.55) 52%, transparent 100%)',
          }} />
          {/* Bottom fade */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, #0a0a0a 0%, transparent 40%)',
          }} />
        </div>

        {/* Hero content — left aligned, max 55% width */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 680 }}>

          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: E, delay: 0.5 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}
          >
            <motion.span
              animate={{ opacity: [1, 0.2, 1], scale: [1, 1.7, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: '50%', background: RED, display: 'block' }}
            />
            <span style={{ fontFamily: BODY, fontSize: 10, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.5)' }}>
              História em Destaque
            </span>
          </motion.div>

          {/* Display headline — Manrope 800, tight tracking, editorial scale */}
          <div style={{ overflow: 'hidden' }}>
            <motion.h1
              initial={{ y: '105%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.88, ease: E, delay: 0.62 }}
              style={{
                fontFamily: MAN, fontWeight: 800,
                fontSize: 'clamp(52px, 8vw, 108px)',
                lineHeight: 0.88, letterSpacing: '-0.04em',
                color: '#fff', margin: 0,
              }}
            >
              A voz dos
            </motion.h1>
          </div>
          <div style={{ overflow: 'hidden', marginBottom: 28 }}>
            <motion.h1
              initial={{ y: '105%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.88, ease: E, delay: 0.78 }}
              style={{
                fontFamily: MAN, fontWeight: 200, fontStyle: 'italic',
                fontSize: 'clamp(52px, 8vw, 108px)',
                lineHeight: 0.88, letterSpacing: '-0.04em',
                color: RED, margin: 0,
              }}
            >
              testemunhos
            </motion.h1>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0)' }}
            transition={{ duration: 0.65, ease: E, delay: 1.0 }}
            style={{
              fontFamily: BODY, fontSize: 18, fontWeight: 300, lineHeight: 1.65,
              color: 'rgba(255,255,255,0.62)', maxWidth: 440, margin: '0 0 40px',
            }}
          >
            Um altar digital para sua fé. Ouça histórias que inspiram e transformam vidas através da palavra.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: E, delay: 1.15 }}
            style={{ display: 'flex', alignItems: 'center', gap: 20 }}
          >
            <motion.button
              onClick={handleBiblioteca}
              whileHover={{ scale: 1.04, boxShadow: `0 0 44px rgba(255,59,48,0.55)` }}
              whileTap={{ scale: 0.96 }}
              style={{
                background: '#fff', color: '#000', border: 'none',
                borderRadius: 9999, padding: '18px 40px',
                fontSize: 12, fontWeight: 800, fontFamily: MAN,
                letterSpacing: 2.5, textTransform: 'uppercase' as const,
                cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
                transition: 'background 0.4s, color 0.4s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = RED
                ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#fff'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#000'
              }}
            >
              Ouvir agora
            </motion.button>

            <motion.button
              onClick={() => scrollToSection('section-episodes')}
              whileHover={{ color: RED }}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: MAN, fontSize: 12, fontWeight: 800,
                letterSpacing: 2.5, textTransform: 'uppercase' as const,
                color: '#fff', transition: 'color 0.3s',
              }}
            >
              Saiba mais
              <Ico d={IC.arrow} size={16} />
            </motion.button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div
          onClick={() => scrollToSection('section-categories')}
          style={{
            position: 'absolute', bottom: 36, left: 64, zIndex: 2,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            color: 'rgba(255,255,255,0.28)', cursor: 'pointer',
          }}
        >
          <span style={{
            fontFamily: BODY, fontSize: 9, letterSpacing: 4,
            textTransform: 'uppercase' as const,
            writingMode: 'vertical-rl' as const,
            transform: 'rotate(180deg)',
          }}>Scroll</span>
          <motion.div
            animate={{ scaleY: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 48, background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)', transformOrigin: 'top' }}
          />
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          MARQUEE
      ══════════════════════════════════════════════════════════════ */}
      <MarqueeStrip />


      {/* ══════════════════════════════════════════════════════════════
          CATEGORIES — editorial asymmetric grid
      ══════════════════════════════════════════════════════════════ */}
      <section id="section-categories" style={{ padding: '96px 64px' }}>
        <div style={{ maxWidth: 1520, margin: '0 auto' }}>

          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, ease: E }}
            style={{ marginBottom: 52 }}
          >
            <h2 style={{ fontFamily: MAN, fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', margin: 0, marginBottom: 10 }}>
              Explorar Categorias
            </h2>
            <p style={{ fontFamily: BODY, fontSize: 15, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              Encontre inspiração por tema
            </p>
          </motion.div>

          {/* Dynamic genre grid */}
          {genres.length === 0 ? (
            /* Skeleton while albums load */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{
                  height: 130, borderRadius: 18,
                  background: 'rgba(255,255,255,0.04)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
              ))}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}>
              {genres.map((genre, i) => (
                <motion.div
                  key={genre.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, ease: E, delay: Math.min(i * 0.05, 0.4) }}
                >
                  <GenreLandingCard genre={genre} onClick={() => handleGenreClick(genre.name)} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          EPISODES — premium editorial list
      ══════════════════════════════════════════════════════════════ */}
      <section id="section-episodes" style={{ padding: '96px 64px', background: `rgba(5,5,5,0.6)` }}>
        <div style={{ maxWidth: 1520, margin: '0 auto' }}>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, ease: E }}
            style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}
          >
            <div>
              <h2 style={{ fontFamily: MAN, fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', margin: 0, marginBottom: 10 }}>
                Lançamentos
              </h2>
              <p style={{ fontFamily: BODY, fontSize: 15, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                Episódios mais recentes
              </p>
            </div>
            <motion.button
              onClick={handleBiblioteca}
              whileHover={{ background: '#fff', color: '#000' }}
              style={{
                padding: '10px 24px', borderRadius: 9999,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent', color: 'rgba(255,255,255,0.7)',
                fontFamily: BODY, fontSize: 11, fontWeight: 700,
                letterSpacing: 2.5, textTransform: 'uppercase' as const, cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            >Ver Catálogo</motion.button>
          </motion.div>

          {/* Track list — real data from store, up to 10 */}
          <div>
            {recentTracks.length === 0 ? (
              /* Skeleton */
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  height: 88, borderRadius: 12, marginBottom: 2,
                  background: 'rgba(255,255,255,0.03)',
                }} />
              ))
            ) : (
              recentTracks.map((ep, i) => (
                <motion.div
                  key={`${ep.title}-${i}`}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.55, ease: E, delay: i * 0.05 }}
                >
                  <EpisodeRow
                    num={ep.num}
                    img={ep.img}
                    title={ep.title}
                    desc={ep.desc}
                    duration={ep.duration}
                    isPlaying={mpCurrentTrackId === ep.trackId}
                    onPlay={() => handleTrackPlay(ep.albumId, ep.trackIdx)}
                    onAdd={() => handleTrackPlay(ep.albumId, ep.trackIdx)}
                    onShare={() => handleShare(ep.title, ep.desc)}
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          SITE FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer style={{ background: BG, padding: '80px 64px 200px' }}>
        <div style={{ maxWidth: 1520, margin: '0 auto' }}>
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)', marginBottom: 72 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 48 }}>

            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ico d={IC.waves} size={16} stroke="#fff" sw={1.8} />
                </div>
                <span style={{ fontFamily: MAN, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>PodFé<span style={{ fontWeight: 300, color: 'rgba(255,255,255,0.45)' }}>Play</span></span>
              </div>
              <p style={{ fontFamily: BODY, fontSize: 13.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.7, maxWidth: 300, marginBottom: 32 }}>
                Elevando a experiência espiritual através do som. Histórias, reflexões e testemunhos em alta fidelidade.
              </p>
              <div style={{ display: 'flex', gap: 18 }}>
                {[IC.globe, IC.podcast, IC.waves].map((d, i) => (
                  <motion.span key={i}
                    onClick={handleBiblioteca}
                    whileHover={{ color: RED }}
                    style={{ color: 'rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'color 0.2s' }}
                  ><Ico d={d} size={18} sw={1.6} /></motion.span>
                ))}
              </div>
            </div>

            {/* Navegação */}
            <div>
              <h5 style={{ fontFamily: MAN, fontSize: 10, fontWeight: 700, letterSpacing: 3.5, textTransform: 'uppercase' as const, color: '#fff', marginBottom: 28 }}>Navegação</h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
                {([
                  ['Início',         () => wrap.current?.scrollTo({ top: 0, behavior: 'smooth' })],
                  ['Explorar',       () => scrollToSection('section-categories')],
                  ['Minha Biblioteca', handleBiblioteca],
                  ['Lançamentos',    () => scrollToSection('section-episodes')],
                ] as [string, () => void][]).map(([l, fn]) => (
                  <li key={l}>
                    <motion.a href="#" onClick={(e) => { e.preventDefault(); fn() }} whileHover={{ color: '#fff' }} style={{ fontFamily: BODY, fontSize: 13.5, color: 'rgba(255,255,255,0.38)', textDecoration: 'none', transition: 'color 0.2s', cursor: 'pointer' }}>{l}</motion.a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suporte */}
            <div>
              <h5 style={{ fontFamily: MAN, fontSize: 10, fontWeight: 700, letterSpacing: 3.5, textTransform: 'uppercase' as const, color: '#fff', marginBottom: 28 }}>Suporte</h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
                {['Privacidade', 'Termos de Uso', 'Ajuda', 'Contato'].map(l => (
                  <li key={l}>
                    <motion.a
                      href="#"
                      onClick={(e) => { e.preventDefault(); handleShare('PodFéPlay', 'Um altar digital para sua fé.') }}
                      whileHover={{ color: '#fff' }}
                      style={{ fontFamily: BODY, fontSize: 13.5, color: 'rgba(255,255,255,0.38)', textDecoration: 'none', transition: 'color 0.2s', cursor: 'pointer' }}
                    >{l}</motion.a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)', margin: '56px 0 28px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontFamily: BODY, fontSize: 11, color: 'rgba(255,255,255,0.18)', margin: 0 }}>© 2024 PodFé Audio Sanctuary. Todos os direitos reservados.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: BODY, fontSize: 9.5, color: 'rgba(255,255,255,0.18)', letterSpacing: 3, textTransform: 'uppercase' as const }}>Made with soul</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: RED, display: 'block' }} />
            </div>
          </div>
        </div>
      </footer>


      {/* ══════════════════════════════════════════════════════════════
          AUDIO PLAYER — fixed glass bottom bar, synced with store
      ══════════════════════════════════════════════════════════════ */}
      <motion.footer
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: E, delay: 1.6 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 88, zIndex: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 48px',
          background: 'rgba(18,18,18,0.68)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          boxShadow: `0 -1px 0 0 rgba(255,59,48,0.22), 0 -2px 0 0 rgba(255,59,48,0.08), 0 -24px 48px rgba(0,0,0,0.45)`,
        }}
      >
        {/* ── Track Info ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '28%', minWidth: 0 }}>
          <div style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }} onClick={handleBiblioteca}>
            <img
              src={currentTrack?.cover || A.player}
              alt="Playing"
              style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
            />
            {mpPlaying && (
              <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                <Wave n={8} color="rgba(255,59,48,0.9)" h={12} />
              </div>
            )}
          </div>
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: MAN, fontSize: 13, fontWeight: 800, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: -0.2 }}>
              {currentTrack?.name ?? 'Nenhuma faixa selecionada'}
            </p>
            <p style={{ fontFamily: BODY, fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', margin: 0, letterSpacing: 1.8, textTransform: 'uppercase' as const, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack ? `${currentTrack.artist} · ${currentTrack.albumName}` : 'PodFéPlay'}
            </p>
          </div>
          <motion.span
            onClick={handleLikeCurrentTrack}
            whileHover={{ color: RED }}
            style={{
              color: (mpCurrentTrackId && mpLiked.includes(mpCurrentTrackId)) ? RED : 'rgba(255,255,255,0.3)',
              cursor: 'pointer', flexShrink: 0, transition: 'color 0.2s',
            }}
          >
            <Ico
              d={IC.heart}
              size={17}
              sw={1.8}
              fill={(mpCurrentTrackId && mpLiked.includes(mpCurrentTrackId)) ? RED : 'none'}
            />
          </motion.span>
        </div>

        {/* ── Player Controls ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '44%' }}>
          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {/* Shuffle */}
            <motion.span
              onClick={mpToggleShuffle}
              whileHover={{ color: '#fff' }}
              style={{ color: mpShuffling ? RED : 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'color 0.2s' }}
            >
              <Ico d={IC.shuffle} size={17} sw={1.6} />
            </motion.span>

            {/* Prev */}
            <motion.span
              onClick={mpPrev}
              whileHover={{ color: '#fff' }}
              style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'color 0.2s' }}
            >
              <Ico d={IC.skipPrev} size={22} sw={1.6} />
            </motion.span>

            {/* Play/Pause */}
            <motion.div
              onClick={mpTogglePlay}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              style={{
                width: 46, height: 46, borderRadius: '50%', background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,255,255,0.12)',
              }}
            >
              <Ico d={mpPlaying ? IC.pause : IC.play} size={20} fill="#000" stroke="none" />
            </motion.div>

            {/* Next */}
            <motion.span
              onClick={mpNext}
              whileHover={{ color: '#fff' }}
              style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'color 0.2s' }}
            >
              <Ico d={IC.skipNext} size={22} sw={1.6} />
            </motion.span>

            {/* Repeat */}
            <motion.span
              onClick={mpToggleRepeat}
              whileHover={{ color: '#fff' }}
              style={{ color: mpRepeating ? RED : 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'color 0.2s' }}
            >
              <Ico d={IC.repeat} size={17} sw={1.6} />
            </motion.span>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: BODY, fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700, minWidth: 32, textAlign: 'right' as const }}>
              {fmtSec(mpCurrentSec)}
            </span>
            <div
              style={{ height: 3, flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 99, cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                mpSetProgress(Math.round(((e.clientX - rect.left) / rect.width) * 100))
              }}
            >
              <div style={{
                height: '100%', background: RED, borderRadius: 99,
                width: `${mpProgress}%`, transition: 'width 0.3s linear',
              }} />
            </div>
            <span style={{ fontFamily: BODY, fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700, minWidth: 32 }}>
              {fmtSec(mpTotalSec)}
            </span>
          </div>
        </div>

        {/* ── Right Controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 20, width: '28%' }}>
          {[IC.lyrics, IC.listPlay].map((d, i) => (
            <motion.span key={i} whileHover={{ color: '#fff' }}
              style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'color 0.2s' }}>
              <Ico d={d} size={18} sw={1.6} />
            </motion.span>
          ))}
          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ico d={IC.volume} size={17} stroke="rgba(255,255,255,0.38)" sw={1.6} />
            <div
              style={{ width: 80, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                mpSetVolume(Math.round(((e.clientX - rect.left) / rect.width) * 100))
              }}
            >
              <div style={{ height: '100%', background: 'rgba(255,255,255,0.55)', width: `${mpVolume}%`, borderRadius: 99, transition: 'width 0.2s' }} />
            </div>
          </div>
          <motion.span onClick={handleBiblioteca} whileHover={{ color: '#fff' }}
            style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'color 0.2s' }}>
            <Ico d={IC.fullscr} size={17} sw={1.6} />
          </motion.span>
        </div>
      </motion.footer>
    </div>
  )
}
