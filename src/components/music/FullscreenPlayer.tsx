'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import { parseDur, fmtDur } from '@/lib/utils'

// ─── Layout constants ─────────────────────────────────────────────────────────
const C  = 300   // center cover px
const S1 = 210   // ±1 slot visual size  (C × 0.70)
const S2 = 144   // ±2 slot visual size  (C × 0.48)

// tx values place slot centers equidistant from the center
const TX1 = C / 2 + S1 / 2 + 20   // 285
const TX2 = C / 2 + S1 + S2 / 2 + 32  // 514

const SLOT_CFG = {
  [-2]: { scale: 0.48, opacity: 0.20, tx: -TX2, z: 1 },
  [-1]: { scale: 0.70, opacity: 0.50, tx: -TX1, z: 2 },
  [ 0]: { scale: 1.00, opacity: 1.00, tx: 0,    z: 5 },
  [ 1]: { scale: 0.70, opacity: 0.50, tx:  TX1, z: 2 },
  [ 2]: { scale: 0.48, opacity: 0.20, tx:  TX2, z: 1 },
} as const

// Directional variants — vinyl: slide + slight tilt
const coverVar = {
  enter:  (d: number) => ({ x: d * 130, opacity: 0, scale: 0.72, rotate: d * -12 }),
  center: { x: 0, opacity: 1, scale: 1, rotate: 0 },
  exit:   (d: number) => ({ x: d * -130, opacity: 0, scale: 0.72, rotate: d * 12 }),
}
const infoVar = {
  enter:  (d: number) => ({ x: d * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d * -40, opacity: 0 }),
}

const SPRING = { type: 'spring', stiffness: 340, damping: 34 } as const

export default function FullscreenPlayer() {
  const {
    mpFullscreen, mpToggleFullscreen,
    mpPlaying, mpTogglePlay, mpPrev, mpNext,
    mpCurrentTrackName, mpCurrentTrackId,
    mpCurrentArtist, mpCurrentCover,
    mpCurrentDur, mpProgress, mpSetProgress,
    mpShuffling, mpRepeating, mpToggleShuffle, mpToggleRepeat,
    mpLiked, mpToggleLike,
    mpQueue, mpQueueIdx, albums, artists,
  } = useAppStore(useShallow((s) => ({
    mpFullscreen:       s.mpFullscreen,
    mpToggleFullscreen: s.mpToggleFullscreen,
    mpPlaying:          s.mpPlaying,
    mpTogglePlay:       s.mpTogglePlay,
    mpPrev:             s.mpPrev,
    mpNext:             s.mpNext,
    mpCurrentTrackName: s.mpCurrentTrackName,
    mpCurrentTrackId:   s.mpCurrentTrackId,
    mpCurrentArtist:    s.mpCurrentArtist,
    mpCurrentCover:     s.mpCurrentCover,
    mpCurrentDur:       s.mpCurrentDur,
    mpProgress:         s.mpProgress,
    mpSetProgress:      s.mpSetProgress,
    mpShuffling:        s.mpShuffling,
    mpRepeating:        s.mpRepeating,
    mpToggleShuffle:    s.mpToggleShuffle,
    mpToggleRepeat:     s.mpToggleRepeat,
    mpLiked:            s.mpLiked,
    mpToggleLike:       s.mpToggleLike,
    mpQueue:            s.mpQueue,
    mpQueueIdx:         s.mpQueueIdx,
    albums:             s.albums,
    artists:            s.artists,
  })))

  // ── Direction tracking ────────────────────────────────────────────────────
  const prevIdxRef                = useRef(mpQueueIdx)
  const [direction, setDirection] = useState(0)
  const [pulse,     setPulse]     = useState(0)

  useEffect(() => {
    const diff = mpQueueIdx - prevIdxRef.current
    if (diff !== 0) {
      setDirection(diff > 0 ? 1 : -1)
      prevIdxRef.current = mpQueueIdx
      setPulse((n) => n + 1)
    }
  }, [mpQueueIdx])

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mpFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     { mpToggleFullscreen(); return }
      if (e.key === 'ArrowRight') { mpNext(); return }
      if (e.key === 'ArrowLeft')  { mpPrev(); return }
      if (e.key === ' ')          { e.preventDefault(); mpTogglePlay() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mpFullscreen, mpToggleFullscreen, mpNext, mpPrev, mpTogglePlay])

  // ── Scroll lock ───────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = mpFullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mpFullscreen])

  const seekClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    mpSetProgress(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)))
  }, [mpSetProgress])

  // ── Derived values ────────────────────────────────────────────────────────
  const tot     = parseDur(mpCurrentDur || '0:00')
  const cur     = Math.round((mpProgress / 100) * tot)
  const isLiked = mpLiked.includes(mpCurrentTrackId)
  const artistImg = artists.find((a) => a.name === mpCurrentArtist)?.image
  const bgImage   = artistImg || mpCurrentCover

  function getCover(idx: number) {
    const item = mpQueue[idx]
    if (!item) return ''
    return albums.find((a) => a.id === item.albumId)?.cover ?? ''
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {mpFullscreen && (
        <motion.div
          key="fs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'grid',
            gridTemplateRows: '1fr auto',
            overflow: 'hidden',
          }}
        >
          {/* ── Background ── */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
            <AnimatePresence mode="sync">
              {bgImage && (
                <motion.img
                  key={bgImage}
                  src={bgImage}
                  alt=""
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                  // eslint-disable-next-line @next/next/no-img-element
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%', objectFit: 'cover',
                    filter: 'blur(68px) brightness(0.22) saturate(1.6)',
                    transform: 'scale(1.15)',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </AnimatePresence>
            {/* gradient: transparent center → dark edges */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,.30) 0%, rgba(0,0,0,.10) 40%, rgba(0,0,0,.10) 60%, rgba(0,0,0,.55) 100%)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* ── Row 1 — main content ── */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 0, minHeight: 0, overflow: 'hidden',
          }}>

            {/* Close */}
            <button
              onClick={mpToggleFullscreen}
              title="Exit (Esc)"
              style={{
                position: 'absolute', top: 24, right: 28,
                width: 38, height: 38, borderRadius: 9,
                background: 'rgba(255,255,255,.08)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'rgba(255,255,255,.6)',
                transition: 'all .15s',
                zIndex: 50,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.16)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ pointerEvents: 'none' }}>
                <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
              </svg>
            </button>

            {/* ── Carousel ── */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: C + 20,
              flexShrink: 0,
            }}>
              {([-2, -1, 0, 1, 2] as const).map((offset) => {
                const qIdx    = mpQueueIdx + offset
                const cover   = getCover(qIdx)
                const cfg     = SLOT_CFG[offset]
                const isCenter = offset === 0

                return (
                  <motion.div
                    key={`slot-${offset}`}
                    style={{
                      position: 'absolute',
                      left: '50%', top: '50%',
                      marginLeft: -C / 2, marginTop: -C / 2,
                      width: C, height: C,
                      // center slot is circular — no overflow/bg (handled by VinylDisk)
                      borderRadius: isCenter ? '50%' : 12,
                      overflow: isCenter ? 'visible' : 'hidden',
                      background: isCenter ? 'transparent' : 'rgba(30,30,40,.9)',
                      cursor: isCenter ? 'default' : 'pointer',
                      boxShadow: isCenter ? 'none' : '0 16px 40px rgba(0,0,0,.5)',
                    }}
                    animate={{
                      x: cfg.tx, scale: cfg.scale,
                      opacity: cfg.opacity, zIndex: cfg.z,
                    }}
                    transition={{ type: 'spring', stiffness: 240, damping: 26 }}
                    onClick={isCenter ? undefined : () => {
                      if (offset < 0) mpPrev(); else mpNext()
                    }}
                  >
                    {isCenter ? (
                      /* ── Vinyl disk — directional enter/exit + CSS spin ── */
                      <AnimatePresence initial={false} custom={direction} mode="popLayout">
                        <motion.div
                          key={mpCurrentTrackId}
                          custom={direction}
                          variants={coverVar}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={SPRING}
                          style={{ position: 'absolute', inset: 0 }}
                        >
                          <VinylDisk cover={cover} playing={mpPlaying} size={C} />
                        </motion.div>
                      </AnimatePresence>
                    ) : (
                      /* Side slots — square album art */
                      cover
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.45) saturate(0.6)' }} />
                        : null
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* ── Track info ── */}
            <div style={{ position: 'relative', height: 72, marginTop: 40, width: '100%', maxWidth: 500, overflow: 'hidden' }}>
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={mpCurrentTrackId}
                  custom={direction}
                  variants={infoVar}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}
                >
                  <div style={{
                    fontSize: 20, fontWeight: 700, color: '#fff',
                    letterSpacing: '-.3px', marginBottom: 8,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: '100%', textAlign: 'center',
                  }}>
                    {mpCurrentTrackName || '—'}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', letterSpacing: '.1px' }}>
                    {mpCurrentArtist || '—'}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Like ── */}
            <motion.button
              key={`like-${mpCurrentTrackId}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              onClick={() => mpCurrentTrackId && mpToggleLike(mpCurrentTrackId)}
              style={{
                marginTop: 20,
                background: 'none', border: 'none', cursor: 'pointer', padding: 8,
                color: isLiked ? '#1db954' : 'rgba(255,255,255,.28)',
                transition: 'color .15s, transform .15s',
              }}
              whileTap={{ scale: 0.85 }}
              onMouseEnter={(e) => !isLiked && (e.currentTarget.style.color = 'rgba(255,255,255,.7)')}
              onMouseLeave={(e) => !isLiked && (e.currentTarget.style.color = 'rgba(255,255,255,.28)')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24"
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </motion.button>
          </div>

          {/* ── Row 2 — controls ── */}
          <div style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: 520,
            margin: '0 auto',
            padding: '12px 28px 44px',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>

            {/* Seek bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,.35)',
                fontVariantNumeric: 'tabular-nums',
                width: 32, textAlign: 'right', flexShrink: 0,
              }}>
                {fmtDur(cur)}
              </span>

              <div
                onClick={seekClick}
                style={{
                  flex: 1, height: 3, background: 'rgba(255,255,255,.15)',
                  borderRadius: 2, cursor: 'pointer', position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.height = '5px'
                  ;(e.currentTarget.firstChild as HTMLElement).style.background = '#1db954'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.height = '3px'
                  ;(e.currentTarget.firstChild as HTMLElement).style.background = 'rgba(255,255,255,.75)'
                }}
              >
                <div style={{
                  height: '100%',
                  background: 'rgba(255,255,255,.75)',
                  width: `${mpProgress}%`,
                  borderRadius: 2,
                  transition: 'width .2s linear, background .15s',
                  pointerEvents: 'none',
                }} />
              </div>

              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,.35)',
                fontVariantNumeric: 'tabular-nums',
                width: 32, flexShrink: 0,
              }}>
                {mpCurrentDur || '0:00'}
              </span>
            </div>

            {/* Transport */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
              <FsBtn onClick={mpToggleShuffle} active={mpShuffling} title="Shuffle">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                  <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                  <line x1="4" y1="4" x2="9" y2="9"/>
                </svg>
              </FsBtn>

              <FsBtn onClick={mpPrev} title="Previous (←)" size="lg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="19 20 9 12 19 4 19 20"/>
                  <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
                </svg>
              </FsBtn>

              {/* Play / Pause */}
              <motion.button
                key={`play-${pulse}`}
                initial={{ scale: 0.86 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                onClick={mpTogglePlay}
                style={{
                  width: 62, height: 62, borderRadius: '50%',
                  background: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 36px rgba(0,0,0,.5)',
                  flexShrink: 0,
                }}
              >
                {mpPlaying
                  ? <svg width="19" height="19" viewBox="0 0 24 24" fill="#111"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  : <svg width="19" height="19" viewBox="0 0 24 24" fill="#111"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                }
              </motion.button>

              <FsBtn onClick={mpNext} title="Next (→)" size="lg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 4 15 12 5 20 5 4"/>
                  <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
                </svg>
              </FsBtn>

              <FsBtn onClick={mpToggleRepeat} active={mpRepeating} title="Repeat">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
              </FsBtn>
            </div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Vinyl Disk ───────────────────────────────────────────────────────────────
function VinylDisk({ cover, playing, size }: { cover: string; playing: boolean; size: number }) {
  const hole = Math.round(size * 0.093) // center hole ~28px at 300px

  return (
    <div style={{ position: 'relative', width: size, height: size }}>

      {/* Drop shadow ring — sits behind the disk */}
      <div style={{
        position: 'absolute',
        inset: -6,
        borderRadius: '50%',
        boxShadow: '0 50px 130px rgba(0,0,0,.85), 0 8px 32px rgba(0,0,0,.6)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Spinning disk */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        overflow: 'hidden',
        zIndex: 1,
        // CSS spin — play state controlled by prop
        animation: 'spin 9s linear infinite',
        animationPlayState: playing ? 'running' : 'paused',
      }}>
        {/* Album art */}
        {cover
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '50%' }} />
          : <div style={{ width: '100%', height: '100%', background: '#1a1a24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
        }

        {/* Vinyl groove rings */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%,
            transparent 27%,
            rgba(0,0,0,.30) 28%, transparent 29.5%,
            rgba(0,0,0,.22) 37%, transparent 38.5%,
            rgba(0,0,0,.16) 49%, transparent 50.5%,
            rgba(0,0,0,.12) 61%, transparent 62.5%,
            rgba(0,0,0,.09) 73%, transparent 74.5%
          )`,
          pointerEvents: 'none',
        }} />

        {/* Shine highlight — top-left arc */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'radial-gradient(ellipse at 32% 22%, rgba(255,255,255,.22) 0%, transparent 52%)',
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Center hole — outside spinning div so it stays static */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: hole, height: hole,
        borderRadius: '50%',
        background: 'radial-gradient(circle, #222230 0%, #0e0e16 100%)',
        border: `${Math.max(1, Math.round(hole * 0.06))}px solid rgba(255,255,255,.14)`,
        boxShadow: 'inset 0 1px 4px rgba(0,0,0,.9), 0 0 8px rgba(0,0,0,.6)',
        zIndex: 2,
      }} />

      {/* Outer edge gloss ring */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,.07)',
        zIndex: 3,
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ─── Button helpers ───────────────────────────────────────────────────────────
function FsBtn({
  children, onClick, title, active, size = 'sm',
}: {
  children: React.ReactNode
  onClick: () => void
  title?: string
  active?: boolean
  size?: 'sm' | 'lg'
}) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileTap={{ scale: 0.84 }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: size === 'lg' ? 6 : 8,
        color: active ? '#1db954' : 'rgba(255,255,255,.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'color .12s',
        position: 'relative',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.color = '#fff')}
      onMouseLeave={(e) => !active && (e.currentTarget.style.color = 'rgba(255,255,255,.5)')}
    >
      {children}
      {active && (
        <span style={{
          position: 'absolute', bottom: 2, left: '50%',
          transform: 'translateX(-50%)',
          width: 3, height: 3, borderRadius: '50%', background: '#1db954',
        }} />
      )}
    </motion.button>
  )
}
