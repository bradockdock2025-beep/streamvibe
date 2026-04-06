'use client'

import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import { parseDur, fmtDur } from '@/lib/utils'

export default function PlayerBar() {
  const {
    mpPlaying, mpTogglePlay, mpPrev, mpNext,
    mpCurrentTrackName, mpCurrentTrackId, mpCurrentArtist, mpCurrentCover, mpCurrentDur,
    mpProgress, mpSetProgress,
    mpShuffling, mpRepeating, mpVolume,
    mpToggleShuffle, mpToggleRepeat, mpSetVolume,
    mpLiked, mpToggleLike,
    mpToggleFullscreen,
  } = useAppStore(useShallow((s) => ({
    mpPlaying:           s.mpPlaying,
    mpTogglePlay:        s.mpTogglePlay,
    mpPrev:              s.mpPrev,
    mpNext:              s.mpNext,
    mpCurrentTrackName:  s.mpCurrentTrackName,
    mpCurrentTrackId:    s.mpCurrentTrackId,
    mpCurrentArtist:     s.mpCurrentArtist,
    mpCurrentCover:      s.mpCurrentCover,
    mpCurrentDur:        s.mpCurrentDur,
    mpProgress:          s.mpProgress,
    mpSetProgress:       s.mpSetProgress,
    mpShuffling:         s.mpShuffling,
    mpRepeating:         s.mpRepeating,
    mpVolume:            s.mpVolume,
    mpToggleShuffle:     s.mpToggleShuffle,
    mpToggleRepeat:      s.mpToggleRepeat,
    mpSetVolume:         s.mpSetVolume,
    mpLiked:             s.mpLiked,
    mpToggleLike:        s.mpToggleLike,
    mpToggleFullscreen:  s.mpToggleFullscreen,
  })))

  const tot      = parseDur(mpCurrentDur || '0:00')
  const cur      = Math.round((mpProgress / 100) * tot)
  const hasTrack = !!mpCurrentTrackName
  const isLiked  = mpLiked.includes(mpCurrentTrackId)

  function seekClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    mpSetProgress(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
  }

  function volumeClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    mpSetVolume(Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))))
  }

  return (
    <div style={{ position: 'relative', background: '#141418', borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>

      {/* ── Thin seekable progress line at very top ── */}
      <div
        onClick={seekClick}
        style={{ height: 3, background: 'rgba(255,255,255,.09)', cursor: hasTrack ? 'pointer' : 'default', position: 'relative', flexShrink: 0 }}
        onMouseEnter={(e) => hasTrack && ((e.currentTarget.firstChild as HTMLElement).style.background = '#1db954')}
        onMouseLeave={(e) => ((e.currentTarget.firstChild as HTMLElement).style.background = 'rgba(255,255,255,.65)')}
      >
        <div style={{
          height: '100%', background: 'rgba(255,255,255,.65)',
          width: `${mpProgress}%`, transition: 'width .2s linear',
          pointerEvents: 'none', borderRadius: '0 1px 1px 0',
        }} />
      </div>

      {/* ── Main bar ── */}
      <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 22px' }}>

        {/* ── Left: Now playing ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, width: '30%', minWidth: 0 }}>
          {/* Album art */}
          <div style={{ width: 42, height: 42, borderRadius: 4, background: '#252530', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,.4)' }}>
            {mpCurrentCover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mpCurrentCover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>

          {/* Track info */}
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: hasTrack ? '#fff' : 'rgba(255,255,255,.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {mpCurrentTrackName || 'Not playing'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {mpCurrentArtist}
            </div>
          </div>

          {/* Heart / like */}
          <button
            onClick={() => hasTrack && mpToggleLike(mpCurrentTrackId)}
            title={isLiked ? 'Unlike' : 'Like'}
            style={{
              background: 'none', border: 'none', cursor: hasTrack ? 'pointer' : 'default',
              color: isLiked ? '#1db954' : 'rgba(255,255,255,.3)',
              display: 'flex', alignItems: 'center', padding: 4, flexShrink: 0,
              transition: 'color .15s', opacity: hasTrack ? 1 : 0.3,
            }}
            onMouseEnter={(e) => hasTrack && !isLiked && (e.currentTarget.style.color = 'rgba(255,255,255,.8)')}
            onMouseLeave={(e) => !isLiked && (e.currentTarget.style.color = 'rgba(255,255,255,.3)')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        {/* ── Center: Transport ── */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          {/* Shuffle */}
          <ToggleBtn onClick={mpToggleShuffle} active={mpShuffling} title="Shuffle">
            <ShuffleIcon />
          </ToggleBtn>

          {/* Prev */}
          <CtrlBtn onClick={mpPrev} title="Previous" disabled={!hasTrack}>
            <PrevIcon />
          </CtrlBtn>

          {/* Play/Pause */}
          <button
            onClick={mpTogglePlay}
            disabled={!hasTrack}
            title={mpPlaying ? 'Pause' : 'Play'}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: hasTrack ? '#fff' : 'rgba(255,255,255,.14)',
              border: 'none', cursor: hasTrack ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: hasTrack ? 1 : 0.4, flexShrink: 0,
              transition: 'transform .1s, opacity .15s',
            }}
            onMouseEnter={(e) => hasTrack && (e.currentTarget.style.transform = 'scale(1.07)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {mpPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* Next */}
          <CtrlBtn onClick={mpNext} title="Next" disabled={!hasTrack}>
            <NextIcon />
          </CtrlBtn>

          {/* Repeat */}
          <ToggleBtn onClick={mpToggleRepeat} active={mpRepeating} title="Repeat">
            <RepeatIcon />
          </ToggleBtn>
        </div>

        {/* ── Right: Time + Volume ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '30%', justifyContent: 'flex-end' }}>
          {/* Time */}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {fmtDur(cur)} / {mpCurrentDur || '0:00'}
          </span>

          {/* Queue */}
          <CtrlBtn onClick={() => {}} title="Queue">
            <QueueIcon />
          </CtrlBtn>

          {/* Volume icon */}
          <CtrlBtn onClick={() => mpSetVolume(mpVolume === 0 ? 70 : 0)} title="Mute">
            {mpVolume === 0 ? <MuteIcon /> : <VolumeIcon />}
          </CtrlBtn>

          {/* Volume slider */}
          <div
            onClick={volumeClick}
            style={{ width: 76, height: 3, background: 'rgba(255,255,255,.13)', borderRadius: 2, cursor: 'pointer', flexShrink: 0, position: 'relative' }}
            onMouseEnter={(e) => ((e.currentTarget.firstChild as HTMLElement).style.background = '#1db954')}
            onMouseLeave={(e) => ((e.currentTarget.firstChild as HTMLElement).style.background = 'rgba(255,255,255,.6)')}
          >
            <div style={{ height: '100%', width: `${mpVolume}%`, background: 'rgba(255,255,255,.6)', borderRadius: 2, pointerEvents: 'none', transition: 'width .1s' }} />
          </div>

          {/* Fullscreen */}
          <CtrlBtn onClick={mpToggleFullscreen} title="Fullscreen">
            <FullscreenIcon />
          </CtrlBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Button helpers ───────────────────────────────────────────────────────────
function CtrlBtn({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      style={{ background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', color: 'rgba(255,255,255,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 4, transition: 'color .12s', opacity: disabled ? 0.35 : 1 }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.color = '#fff')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.45)')}
    >
      {children}
    </button>
  )
}

function ToggleBtn({ children, onClick, active, title }: { children: React.ReactNode; onClick: () => void; active: boolean; title?: string }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: active ? '#1db954' : 'rgba(255,255,255,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 4, transition: 'color .12s', position: 'relative' }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.color = '#fff')}
      onMouseLeave={(e) => !active && (e.currentTarget.style.color = 'rgba(255,255,255,.45)')}
    >
      {children}
      {/* Active dot indicator */}
      {active && <span style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#1db954' }} />}
    </button>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function ShuffleIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
}
function PrevIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
}
function NextIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
}
function PlayIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="#111"><polygon points="5 3 19 12 5 21 5 3"/></svg> }
function PauseIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="#111"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> }
function RepeatIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
}
function QueueIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
}
function VolumeIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
}
function MuteIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
}
function FullscreenIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
}
