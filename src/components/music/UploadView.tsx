'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { adminHeaders } from '@/lib/utils'
import { uploadWithProgress, registerTrackSSE } from '@/lib/upload-utils'

type UploadMode = null | 'track' | 'album'

interface LocalTrack {
  id:            string
  file:          File
  name:          string
  artist:        string
  albumName:     string   // existing or new album name
  genre:         string
  durationSec:   number   // extracted client-side via AudioContext
  coverFile:     File | null
  progress:      number   // 0-100, -1 = error
  progressLabel: string   // human-readable phase label
  done:          boolean
  fileUrl:       string   // returned from API after upload
  errorMsg:      string   // human-readable error shown in UI
}

interface AlbumMeta {
  name:     string
  artist:   string
  year:     string
  genre:    string
  coverUrl: string
  coverFile: File | null
}

const GENRES     = ['Pop','Hip-Hop','R&B','Rock','Electronic','Jazz','Classical','Alternative','Indie','Soul','Funk','Latin','Other']
const AUDIO_EXTS = ['.mp3','.flac','.wav','.m4a','.ogg','.aac']

function uid() { return Math.random().toString(36).slice(2) }

const MAX_AUDIO_BYTES = 200 * 1024 * 1024 // 200 MB — must match Supabase Storage settings

function isAudioFile(f: File) {
  return AUDIO_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext))
}

/** Extract audio duration in seconds client-side using HTMLAudioElement */
function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio()
    const url   = URL.createObjectURL(file)
    audio.addEventListener('loadedmetadata', () => { URL.revokeObjectURL(url); resolve(isFinite(audio.duration) ? Math.floor(audio.duration) : 0) })
    audio.addEventListener('error', () => { URL.revokeObjectURL(url); resolve(0) })
    audio.src = url
  })
}

function fmtDur(sec: number): string {
  if (!sec || sec <= 0) return '0:00'
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}


// ─── Main export ─────────────────────────────────────────────────────────────
export default function UploadView() {
  const [mode, setMode] = useState<UploadMode>(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      <AnimatePresence mode="wait">
        {mode === null ? (
          <motion.div
            key="selector"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}
          >
            <div style={{ width: '100%', maxWidth: 480 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-.6px', marginBottom: 6, textAlign: 'center' }}>
                Upload Music
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', marginBottom: 32, textAlign: 'center' }}>
                Choose a mode to get started.
              </p>
              <ModeSelector onSelect={setMode} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '36px 32px 56px' }}
          >
            {/* Header with back button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
              <button
                onClick={() => setMode(null)}
                style={{ background: 'rgba(255,255,255,.07)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,.6)', flexShrink: 0, transition: 'background .15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.13)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-.6px', marginBottom: 2 }}>
                  {mode === 'track' ? 'Upload Tracks' : 'Upload Album'}
                </h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)' }}>
                  {mode === 'track' ? 'Upload one or more audio files.' : 'Upload a complete album with cover art and metadata.'}
                </p>
              </div>
            </div>
            {mode === 'track' && <TrackUploader />}
            {mode === 'album' && <AlbumUploader />}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Mode Selector ────────────────────────────────────────────────────────────
function ModeSelector({ onSelect }: { onSelect: (m: 'track' | 'album') => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ModeCard
        onClick={() => onSelect('track')}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        }
        title="Tracks"
        sub="Single files · MP3, FLAC, WAV, M4A"
        accent="#1db954"
      />
      <ModeCard
        onClick={() => onSelect('album')}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="1" fill="currentColor"/>
          </svg>
        }
        title="Album"
        sub="Cover art · metadata · all tracks together"
        accent="#8877cc"
      />
    </div>
  )
}

function ModeCard({ onClick, icon, title, sub, accent }: {
  onClick: () => void
  icon: React.ReactNode
  title: string
  sub: string
  accent: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 18,
        background: hov ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.02)',
        border: `1px solid ${hov ? accent + '60' : 'rgba(255,255,255,.08)'}`,
        borderRadius: 14, padding: '20px 24px',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        transition: 'border-color .18s, background .18s',
        width: '100%',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: hov ? `${accent}20` : 'rgba(255,255,255,.05)',
        border: `1px solid ${hov ? accent + '40' : 'rgba(255,255,255,.07)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: hov ? accent : 'rgba(255,255,255,.4)',
        transition: 'background .18s, border-color .18s, color .18s',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', letterSpacing: '.1px' }}>{sub}</div>
      </div>
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke={hov ? accent : 'rgba(255,255,255,.2)'}
        strokeWidth="2" strokeLinecap="round"
        style={{ flexShrink: 0, transition: 'stroke .18s, transform .18s', transform: hov ? 'translateX(2px)' : 'none' }}
      >
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  )
}

// ─── Track Uploader ───────────────────────────────────────────────────────────
function TrackUploader() {
  const refreshAfterUpload = useAppStore((s) => s.refreshAfterUpload)
  const [tracks, setTracks]          = useState<LocalTrack[]>([])
  const [submitting, setSubmitting]  = useState(false)
  const [artistImage, setArtistImage] = useState<File | null>(null)
  const [coverPickId, setCoverPickId] = useState<string | null>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const artistImgRef = useRef<HTMLInputElement>(null)
  const coverImgRef  = useRef<HTMLInputElement>(null)

  const artistImgPreview = artistImage ? URL.createObjectURL(artistImage) : ''

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files) return
    const audioFiles = Array.from(files).filter(isAudioFile)
    if (!audioFiles.length) return
    const placeholders: LocalTrack[] = audioFiles.map((f) => {
      const tooBig = f.size > MAX_AUDIO_BYTES
      return {
        id: uid(), file: f,
        name: f.name.replace(/\.[^.]+$/, ''),
        artist: '', albumName: '', genre: 'Pop',
        durationSec: 0, coverFile: null,
        progress: tooBig ? -1 : 0,
        progressLabel: '',
        done: false, fileUrl: '',
        errorMsg: tooBig ? `File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 50 MB.` : '',
      }
    })
    setTracks((prev) => [...prev, ...placeholders])
    const durations = await Promise.all(audioFiles.map(getAudioDuration))
    setTracks((prev) => prev.map((t) => {
      const idx = placeholders.findIndex((p) => p.id === t.id)
      return idx === -1 ? t : { ...t, durationSec: durations[idx] }
    }))
  }, [])

  function updateTrack(id: string, field: keyof LocalTrack, value: string) {
    setTracks((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t))
  }

  async function handleSubmit() {
    if (!tracks.length || submitting) return
    setSubmitting(true)

    let anyFailed = false

    function setProgress(id: string, pct: number, label: string) {
      setTracks((prev) => prev.map((t) => t.id === id ? { ...t, progress: Math.round(pct), progressLabel: label } : t))
    }

    async function uploadOne(track: LocalTrack) {
      if (track.done || track.progress === -1) { if (track.progress === -1) anyFailed = true; return }

      try {
        const headers = adminHeaders()

        // Phase 1: real XHR upload to storage with byte-level progress (0 → 80%)
        const uploaded = await uploadWithProgress(
          track.file, 'audio', headers,
          ({ pct, label }) => setProgress(track.id, pct * 0.8, label),
        )

        // Phase 2: cover upload (80 → 85%)
        setProgress(track.id, 80, 'Uploading cover…')
        const coverUrl = track.coverFile
          ? (await uploadWithProgress(track.coverFile, 'covers', headers, () => {})).publicUrl
          : ''
        const artistImageUrl = artistImage
          ? (await uploadWithProgress(artistImage, 'covers', headers, () => {})).publicUrl
          : ''

        // Phase 3: SSE stream — server registers metadata and streams progress (85 → 100%)
        setProgress(track.id, 85, 'Processing…')
        await registerTrackSSE(
          {
            name:           track.name      || track.file.name.replace(/\.[^.]+$/, ''),
            artist:         track.artist    || 'Unknown Artist',
            albumName:      track.albumName || 'Singles',
            genre:          track.genre,
            durationSec:    track.durationSec,
            fileUrl:        uploaded.publicUrl,
            fileSize:       uploaded.fileSize,
            format:         uploaded.format,
            coverUrl,
            artistImageUrl,
          },
          headers,
          ({ pct, label }) => {
            // Map server's 20–95% into our 85–99% range
            const mapped = 85 + (pct / 100) * 14
            setProgress(track.id, mapped, label)
          },
        )

        setTracks((prev) => prev.map((t) =>
          t.id === track.id
            ? { ...t, progress: 100, progressLabel: 'Done', done: true, fileUrl: uploaded.publicUrl, errorMsg: '' }
            : t,
        ))
      } catch (e) {
        anyFailed = true
        const errMsg = e instanceof Error ? e.message : 'Upload failed'
        setTracks((prev) => prev.map((t) =>
          t.id === track.id ? { ...t, progress: -1, progressLabel: '', errorMsg: errMsg } : t,
        ))
      }
    }

    await Promise.all(tracks.map(uploadOne))
    setSubmitting(false)
    if (!anyFailed) {
      await refreshAfterUpload()
      setTracks([])
    }
  }

  const allDone  = tracks.length > 0 && tracks.every((t) => t.done)
  const hasError = tracks.some((t) => t.progress === -1)

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

      {/* Hidden inputs */}
      <input ref={inputRef}     type="file" multiple accept={AUDIO_EXTS.join(',')} style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />
      <input ref={artistImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setArtistImage(f) }} />
      <input ref={coverImgRef}  type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
        const f = e.target.files?.[0]
        if (f && coverPickId) setTracks((prev) => prev.map((t) => t.id === coverPickId ? { ...t, coverFile: f } : t))
        setCoverPickId(null); e.target.value = ''
      }} />

      {/* ── Top action bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {/* Add files button */}
        <button
          onClick={() => inputRef.current?.click()}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(29,185,84,.12)', border: '1px solid rgba(29,185,84,.3)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: '#1db954', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'background .15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(29,185,84,.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(29,185,84,.12)')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
          {tracks.length > 0 ? 'Add more files' : 'Choose audio files'}
        </button>

        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>or drag & drop · MP3, FLAC, WAV, M4A</span>

        <div style={{ flex: 1 }} />

        {/* Artist photo mini button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {artistImage && (
            <button onClick={() => setArtistImage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,.3)', fontFamily: 'inherit', padding: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#e05252')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.3)')}
            >Remove photo</button>
          )}
          <div
            onClick={() => artistImgRef.current?.click()}
            title="Artist photo (optional)"
            style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1.5px dashed rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .15s', flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1db954')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)')}
          >
            {artistImgPreview
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={artistImgPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            }
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>Artist photo</span>
        </div>
      </div>

      {/* ── Drop area (only shown when no tracks) ── */}
      {tracks.length === 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          style={{ border: '1.5px dashed rgba(255,255,255,.1)', borderRadius: 12, padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', background: 'rgba(255,255,255,.015)', transition: 'border-color .15s, background .15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(29,185,84,.4)'; e.currentTarget.style.background = 'rgba(29,185,84,.03)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'; e.currentTarget.style.background = 'rgba(255,255,255,.015)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', margin: 0 }}>Drop your audio files here</p>
        </div>
      )}

      {/* ── Track list ── */}
      {tracks.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '28px 2fr 1.4fr 1.4fr 110px 44px 24px', gap: 8, padding: '0 12px', marginBottom: 6 }}>
            {['', 'Title', 'Artist', 'Album', 'Genre', '', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.25)', letterSpacing: '.5px', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tracks.map((t) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '28px 2fr 1.4fr 1.4fr 110px 44px 24px', gap: 8, alignItems: 'center', background: t.done ? 'rgba(29,185,84,.04)' : t.progress === -1 ? 'rgba(224,82,82,.05)' : 'rgba(255,255,255,.03)', border: `1px solid ${t.done ? 'rgba(29,185,84,.15)' : t.progress === -1 ? 'rgba(224,82,82,.18)' : 'rgba(255,255,255,.07)'}`, borderRadius: 8, padding: '7px 12px' }}>

                  {/* Cover thumbnail / status */}
                  <div
                    onClick={() => { if (!t.done) { setCoverPickId(t.id); setTimeout(() => coverImgRef.current?.click(), 0) } }}
                    title={t.coverFile ? 'Change cover' : 'Add cover'}
                    style={{ width: 26, height: 26, borderRadius: 4, overflow: 'hidden', cursor: t.done ? 'default' : 'pointer', background: 'rgba(255,255,255,.06)', border: `1px dashed ${t.coverFile ? 'transparent' : 'rgba(255,255,255,.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color .12s' }}
                    onMouseEnter={(e) => { if (!t.done && !t.coverFile) e.currentTarget.style.borderColor = '#1db954' }}
                    onMouseLeave={(e) => { if (!t.done && !t.coverFile) e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)' }}
                  >
                    {t.done
                      ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1db954" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : t.progress === -1
                      ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#e05252" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      : t.coverFile
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={URL.createObjectURL(t.coverFile)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    }
                  </div>

                  <MetaInput value={t.name} onChange={(v) => updateTrack(t.id, 'name', v)} placeholder="Track title" bold disabled={t.done} />
                  <ArtistInput value={t.artist} onChange={(v) => updateTrack(t.id, 'artist', v)} disabled={t.done} />
                  <AlbumInput value={t.albumName} onChange={(v) => updateTrack(t.id, 'albumName', v)} artistName={t.artist} disabled={t.done} />
                  <GenreSelect value={t.genre} onChange={(g) => updateTrack(t.id, 'genre', g)} disabled={t.done} size="sm" />

                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {t.durationSec > 0 ? fmtDur(t.durationSec) : '—'}
                  </span>

                  <button onClick={() => setTracks((p) => p.filter((x) => x.id !== t.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'color .1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#e05252')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.18)')}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>

                  {/* Progress bar + label */}
                  {t.progress > 0 && !t.done && t.progress !== -1 && (
                    <>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -2 }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{t.progressLabel || 'Uploading…'}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', fontVariantNumeric: 'tabular-nums' }}>{t.progress}%</span>
                      </div>
                      <div style={{ gridColumn: '1 / -1', height: 2, background: 'rgba(255,255,255,.07)', borderRadius: 1, overflow: 'hidden' }}>
                        <motion.div animate={{ width: `${t.progress}%` }} transition={{ duration: 0.15 }} style={{ height: '100%', background: '#1db954', borderRadius: 1 }} />
                      </div>
                    </>
                  )}

                  {/* Error message */}
                  {t.progress === -1 && t.errorMsg && (
                    <div style={{ gridColumn: '1 / -1', fontSize: 11, color: '#e05252', marginTop: -2, paddingLeft: 2 }}>
                      {t.errorMsg}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Footer actions ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hasError && <span style={{ fontSize: 12, color: '#e05252' }}>Some tracks failed</span>}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || allDone}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: allDone ? 'rgba(29,185,84,.12)' : '#1db954', color: allDone ? '#1db954' : '#111', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: submitting || allDone ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'opacity .15s', opacity: submitting ? .6 : 1, boxShadow: (!submitting && !allDone) ? '0 4px 16px rgba(29,185,84,.25)' : 'none' }}
            >
              {allDone
                ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Saved to Library</>
                : submitting ? 'Uploading…'
                : `Upload ${tracks.length} track${tracks.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Album Uploader ───────────────────────────────────────────────────────────
function AlbumUploader() {
  const refreshAfterUpload = useAppStore((s) => s.refreshAfterUpload)
  const [albumMeta, setAlbumMeta]   = useState<AlbumMeta>({ name: '', artist: '', year: String(new Date().getFullYear()), genre: 'Pop', coverUrl: '', coverFile: null })
  const [tracks, setTracks]         = useState<LocalTrack[]>([])
  const [submitting, setSubmitting]  = useState(false)
  const [submitted, setSubmitted]    = useState(false)
  const [artistImage, setArtistImage] = useState<File | null>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const artistImgRef  = useRef<HTMLInputElement>(null)

  const coverPreview     = albumMeta.coverUrl || (albumMeta.coverFile ? URL.createObjectURL(albumMeta.coverFile) : '')
  const artistImgPreview = artistImage ? URL.createObjectURL(artistImage) : ''

  const canSave = !submitting && !submitted && tracks.length > 0
    && albumMeta.name.trim().length > 0 && albumMeta.artist.trim().length > 0

  const addAudioFiles = async (files: FileList | null) => {
    if (!files) return
    const audioFiles = Array.from(files).filter(isAudioFile)
    if (!audioFiles.length) return

    const placeholders: LocalTrack[] = audioFiles.map((f) => ({
      id: uid(), file: f,
      name:          f.name.replace(/\.[^.]+$/, ''),
      artist:        albumMeta.artist,
      albumName:     albumMeta.name,
      genre:         albumMeta.genre,
      durationSec:   0,
      coverFile:     null,
      progress:      0,
      progressLabel: '',
      done:          false,
      fileUrl:       '',
      errorMsg:      '',
    }))
    setTracks((prev) => [...prev, ...placeholders])

    const durations = await Promise.all(audioFiles.map(getAudioDuration))
    setTracks((prev) => prev.map((t) => {
      const idx = placeholders.findIndex((p) => p.id === t.id)
      if (idx === -1) return t
      return { ...t, durationSec: durations[idx] }
    }))
  }

  function updateTrack(id: string, field: 'name' | 'genre', value: string) {
    setTracks((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t))
  }

  function removeTrack(id: string) {
    setTracks((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleSaveAlbum() {
    if (!canSave) return
    setSubmitting(true)

    const headers = adminHeaders()

    function setTrackProgress(id: string, pct: number, label: string) {
      setTracks((prev) => prev.map((t) => t.id === id ? { ...t, progress: Math.round(pct), progressLabel: label } : t))
    }

    try {
      // Upload cover + artist image in parallel (no per-file progress needed here)
      const [coverUpload, artistUpload] = await Promise.all([
        albumMeta.coverFile ? uploadWithProgress(albumMeta.coverFile, 'covers', headers, () => {}) : Promise.resolve(null),
        artistImage ? uploadWithProgress(artistImage, 'covers', headers, () => {}) : Promise.resolve(null),
      ])

      const uploadedTracks = []

      // Upload audio tracks sequentially with real XHR progress
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i]
        try {
          const uploaded = await uploadWithProgress(
            track.file, 'audio', headers,
            ({ pct, label }) => setTrackProgress(track.id, pct * 0.95, label),
          )
          uploadedTracks.push({
            name: track.name, trackNumber: i + 1,
            genre: track.genre, durationSec: track.durationSec,
            fileUrl: uploaded.publicUrl, fileSize: uploaded.fileSize, format: uploaded.format,
          })
          setTrackProgress(track.id, 96, 'Waiting…')
        } catch (err) {
          setTracks((prev) => prev.map((t) =>
            t.id === track.id ? { ...t, progress: -1, progressLabel: '', errorMsg: err instanceof Error ? err.message : 'Upload failed' } : t,
          ))
          throw err
        }
      }

      // Register the full album via API
      setTracks((prev) => prev.map((t) => ({ ...t, progressLabel: 'Saving album…' })))
      const res = await fetch('/api/upload/album', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumName:     albumMeta.name,
          artistName:    albumMeta.artist,
          year:          albumMeta.year,
          genre:         albumMeta.genre,
          coverUrl:      coverUpload?.publicUrl || albumMeta.coverUrl,
          artistImageUrl: artistUpload?.publicUrl || '',
          tracks:        uploadedTracks,
        }),
      })

      if (res.ok) {
        setTracks((prev) => prev.map((t) => ({ ...t, progress: 100, progressLabel: 'Done', done: true })))
        setSubmitted(true)
        await refreshAfterUpload()
      } else {
        const body = await res.json().catch(() => null)
        const msg = body?.error ?? `Server error ${res.status}`
        setTracks((prev) => prev.map((t) => ({ ...t, progress: -1, progressLabel: '', errorMsg: msg })))
      }
    } catch {
      setTracks((prev) => prev.map((t) => t.progress !== -1 ? { ...t, progress: -1, progressLabel: '' } : t))
    }

    setSubmitting(false)
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
      {/* Album metadata */}
      {/* Hidden inputs */}
      <input ref={coverInputRef}  type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setAlbumMeta((p) => ({ ...p, coverFile: f, coverUrl: '' })) }} />
      <input ref={artistImgRef}   type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setArtistImage(f) }} />

      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 28, marginBottom: 36, alignItems: 'start' }}>

        {/* Cover art */}
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.4)', letterSpacing: '.8px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Album Cover</label>
          <div
            onClick={() => coverInputRef.current?.click()}
            style={{ width: 160, height: 160, borderRadius: 14, background: '#252530', overflow: 'hidden', border: '2px dashed rgba(255,255,255,.12)', cursor: 'pointer', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,.4)', transition: 'border-color .18s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#8877cc')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)')}
          >
            {coverPreview
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
              : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 500 }}>Add cover</span>
                </div>
            }
            {coverPreview && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0, transition: 'opacity .18s' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>Change cover</span>
              </div>
            )}
          </div>

          {/* Artist photo */}
          <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.4)', letterSpacing: '.8px', textTransform: 'uppercase', display: 'block', marginTop: 16, marginBottom: 8 }}>Artist Photo</label>
          <div
            onClick={() => artistImgRef.current?.click()}
            style={{ width: 72, height: 72, borderRadius: '50%', background: '#252530', overflow: 'hidden', border: '2px dashed rgba(255,255,255,.12)', cursor: 'pointer', position: 'relative', transition: 'border-color .18s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#8877cc')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)')}
          >
            {artistImgPreview
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={artistImgPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.6" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            }
          </div>
          {artistImage && (
            <button onClick={() => setArtistImage(null)} style={{ marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'rgba(255,255,255,.3)', fontFamily: 'inherit', padding: 0, transition: 'color .12s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#e05252')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.3)')}
            >Remove</button>
          )}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Album name *">
            <MetaInput value={albumMeta.name} onChange={(v) => setAlbumMeta((p) => ({ ...p, name: v }))} placeholder="Enter album name" bold large />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="Artist *">
              <ArtistInput
                value={albumMeta.artist}
                onChange={(v) => setAlbumMeta((p) => ({ ...p, artist: v }))}
              />
            </FormField>
            <FormField label="Year">
              <MetaInput value={albumMeta.year} onChange={(v) => setAlbumMeta((p) => ({ ...p, year: v }))} placeholder="2024" />
            </FormField>
          </div>
          <FormField label="Genre">
            <GenreSelect value={albumMeta.genre} onChange={(g) => setAlbumMeta((p) => ({ ...p, genre: g }))} />
          </FormField>
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,.06)', marginBottom: 28 }} />

      {/* Tracks section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Tracks</h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>Upload all tracks for this album.</p>
        </div>
        {tracks.length > 0 && <span style={{ fontSize: 12, color: '#8877cc', background: 'rgba(136,119,204,.12)', borderRadius: 20, padding: '3px 12px', fontWeight: 500 }}>{tracks.length} track{tracks.length > 1 ? 's' : ''}</span>}
      </div>

      <input ref={audioInputRef} type="file" multiple accept={AUDIO_EXTS.join(',')} style={{ display: 'none' }}
        onChange={(e) => addAudioFiles(e.target.files)} />

      <DropZone
        onDrop={(e) => { e.preventDefault(); addAudioFiles(e.dataTransfer.files) }}
        onClick={() => audioInputRef.current?.click()}
        accent="#8877cc" compact
        label="Drop audio tracks or click to browse"
        sublabel="MP3 · FLAC · WAV · M4A"
      />

      <AnimatePresence>
        {tracks.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tracks.map((t, idx) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 32px', gap: 10, alignItems: 'center', background: t.done ? 'rgba(136,119,204,.05)' : 'rgba(255,255,255,.03)', border: `1px solid ${t.done ? 'rgba(136,119,204,.18)' : 'rgba(255,255,255,.07)'}`, borderRadius: 9, padding: '9px 12px' }}
                >
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.28)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</span>
                  <MetaInput value={t.name} onChange={(v) => updateTrack(t.id, 'name', v)} placeholder="Track title" bold disabled={t.done} />
                  <GenreSelect value={t.genre} onChange={(g) => updateTrack(t.id, 'genre', g)} disabled={t.done} size="sm" />
                  <button onClick={() => removeTrack(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.2)', display: 'flex', justifyContent: 'center', padding: 4, transition: 'color .12s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#e05252')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.2)')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>

                  {/* Progress bar */}
                  {t.progress > 0 && (
                    <div style={{ gridColumn: '1 / -1', height: 2, background: 'rgba(255,255,255,.08)', borderRadius: 1, overflow: 'hidden', marginTop: -4 }}>
                      <motion.div animate={{ width: `${t.progress}%` }} transition={{ duration: 0.2 }}
                        style={{ height: '100%', background: t.done ? '#8877cc' : '#8877cc', borderRadius: 1 }} />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '28px 0' }} />

      {/* Save CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {!canSave && !submitted && tracks.length === 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>Upload tracks and fill in album name & artist to continue.</p>}
          {!canSave && !submitted && tracks.length > 0 && (!albumMeta.name || !albumMeta.artist) && <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>Fill in album name and artist to save.</p>}
        </div>
        <button
          onClick={handleSaveAlbum}
          disabled={!canSave}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: submitted ? 'rgba(136,119,204,.15)' : canSave ? '#8877cc' : 'rgba(255,255,255,.08)', color: submitted ? '#8877cc' : canSave ? '#fff' : 'rgba(255,255,255,.3)', border: 'none', borderRadius: 24, padding: '11px 28px', fontSize: 14, fontWeight: 700, cursor: canSave ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'transform .1s', boxShadow: canSave ? '0 4px 18px rgba(136,119,204,.35)' : 'none' }}
          onMouseEnter={(e) => canSave && (e.currentTarget.style.transform = 'scale(1.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {submitted
            ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Album Saved!</>
            : submitting
            ? 'Saving…'
            : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg> Save Album to Library</>
          }
        </button>
      </div>
    </motion.div>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────
function DropZone({ onDrop, onClick, accent, label, sublabel, compact = false }: {
  onDrop: (e: React.DragEvent) => void; onClick: () => void
  accent: string; label: string; sublabel: string; compact?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onDragOver={(e) => { e.preventDefault(); setHover(true) }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => { onDrop(e); setHover(false) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ border: `2px dashed ${hover ? accent : 'rgba(255,255,255,.12)'}`, borderRadius: 14, padding: compact ? '28px 24px' : '52px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', background: hover ? `${accent}0a` : 'rgba(255,255,255,.02)', transition: 'border-color .18s, background .18s' }}
    >
      <div style={{ width: compact ? 48 : 64, height: compact ? 48 : 64, borderRadius: '50%', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={compact ? 22 : 28} height={compact ? 22 : 28} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round">
          <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: compact ? 14 : 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
          {label.includes('click to browse')
            ? <>{label.split('click to browse')[0]}<span style={{ color: accent }}>click to browse</span></>
            : label}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.32)' }}>{sublabel}</p>
      </div>
    </div>
  )
}

function MetaInput({ value, onChange, placeholder, bold = false, large = false, disabled = false }: {
  value: string; onChange: (v: string) => void; placeholder: string
  bold?: boolean; large?: boolean; disabled?: boolean
}) {
  const [focus, setFocus] = useState(false)
  return (
    <div style={{ background: disabled ? 'transparent' : focus ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.04)', border: `1px solid ${disabled ? 'transparent' : focus ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.09)'}`, borderRadius: 7, padding: '6px 10px', transition: 'background .15s, border-color .15s' }}>
      <input value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        placeholder={placeholder} disabled={disabled}
        style={{ background: 'none', border: 'none', outline: 'none', fontSize: large ? 15 : 12, fontWeight: bold ? 600 : 400, color: disabled ? 'rgba(255,255,255,.5)' : '#fff', width: '100%', fontFamily: 'inherit' }}
      />
    </div>
  )
}

// ─── Album autocomplete input ─────────────────────────────────────────────────
// ─── Shared: fixed-position dropdown (escapes overflow:hidden parents) ──────────
function FixedDropdown({ anchorRef, open, children }: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  open: boolean
  children: React.ReactNode
}) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!open || !anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    setRect(r)

    // Update on scroll/resize while open
    function update() {
      if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect())
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef])

  if (!open || !rect) return null

  return (
    <div style={{
      position: 'fixed',
      top:      rect.bottom + 4,
      left:     rect.left,
      width:    rect.width,
      background: '#1e1e28',
      border: '1px solid rgba(255,255,255,.14)',
      borderRadius: 10,
      overflow: 'hidden',
      zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,.6)',
      maxHeight: 280,
      overflowY: 'auto',
    }}>
      {children}
    </div>
  )
}

function AlbumInput({ value, onChange, artistName, disabled = false }: {
  value: string; onChange: (v: string) => void
  artistName: string; disabled?: boolean
}) {
  const albums         = useAppStore((s) => s.albums)
  const [focus, setFocus] = useState(false)
  const [open, setOpen]   = useState(false)
  const wrapRef           = useRef<HTMLDivElement>(null)

  const query      = value.trim().toLowerCase()
  const byArtist   = artistName.trim()
    ? albums.filter((a) => a.artist.toLowerCase() === artistName.trim().toLowerCase())
    : albums
  const suggestions = query.length === 0
    ? byArtist.slice(0, 8)
    : byArtist.filter((a) => a.name.toLowerCase().includes(query)).slice(0, 8)
  const exactMatch  = byArtist.find((a) => a.name.toLowerCase() === query)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef}>
      <div style={{ background: disabled ? 'transparent' : focus ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.04)', border: `1px solid ${disabled ? 'transparent' : exactMatch ? 'rgba(136,119,204,.5)' : focus ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.09)'}`, borderRadius: 7, padding: '6px 10px', transition: 'background .15s, border-color .15s', display: 'flex', alignItems: 'center', gap: 6 }}>
        {exactMatch?.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={exactMatch.cover} alt="" style={{ width: 16, height: 16, borderRadius: 2, objectFit: 'cover', flexShrink: 0 }} />
        )}
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => { setFocus(true); setOpen(true) }}
          onBlur={() => setFocus(false)}
          placeholder={byArtist.length > 0 ? 'Choose or create album' : 'Album name'}
          disabled={disabled}
          style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, color: disabled ? 'rgba(255,255,255,.5)' : '#fff', width: '100%', fontFamily: 'inherit' }}
        />
        {exactMatch && (
          <span style={{ fontSize: 9, fontWeight: 700, color: '#8877cc', background: 'rgba(136,119,204,.12)', borderRadius: 4, padding: '2px 5px', whiteSpace: 'nowrap', flexShrink: 0 }}>EXISTING</span>
        )}
      </div>

      <FixedDropdown anchorRef={wrapRef} open={open && !disabled && (suggestions.length > 0 || !!value.trim())}>
        {suggestions.map((a) => (
          <div key={a.id}
            onMouseDown={(e) => { e.preventDefault(); onChange(a.name); setOpen(false) }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: 30, height: 30, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {a.cover
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={a.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.3)' }}>{a.name.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{a.year} · {a.tracks.length} track{a.tracks.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        ))}
        {value.trim() && !exactMatch && (
          <div style={{ padding: '8px 12px', borderTop: suggestions.length ? '1px solid rgba(255,255,255,.07)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8877cc" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>Create <strong style={{ color: '#fff' }}>&quot;{value.trim()}&quot;</strong></span>
          </div>
        )}
      </FixedDropdown>
    </div>
  )
}

// ─── Artist autocomplete input ────────────────────────────────────────────────
function ArtistInput({ value, onChange, onImageChange, large = false, disabled = false }: {
  value: string; onChange: (v: string) => void
  onImageChange?: (img: string) => void
  large?: boolean; disabled?: boolean
}) {
  const artists        = useAppStore((s) => s.artists)
  const [focus, setFocus] = useState(false)
  const [open, setOpen]   = useState(false)
  const wrapRef           = useRef<HTMLDivElement>(null)

  const query       = value.trim().toLowerCase()
  const suggestions = query.length === 0
    ? artists.slice(0, 8)
    : artists.filter((a) => a.name.toLowerCase().includes(query)).slice(0, 8)
  const exactMatch  = artists.find((a) => a.name.toLowerCase() === query)

  function select(name: string, image?: string) {
    onChange(name)
    if (image && onImageChange) onImageChange(image)
    setOpen(false)
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef}>
      <div style={{ background: disabled ? 'transparent' : focus ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.04)', border: `1px solid ${disabled ? 'transparent' : exactMatch ? 'rgba(29,185,84,.45)' : focus ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.09)'}`, borderRadius: 7, padding: '6px 10px', transition: 'background .15s, border-color .15s', display: 'flex', alignItems: 'center', gap: 6 }}>
        {exactMatch && (
          <div style={{ width: 18, height: 18, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#252530', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {exactMatch.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={exactMatch.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.4)' }}>{exactMatch.name.charAt(0).toUpperCase()}</span>
            }
          </div>
        )}
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => { setFocus(true); setOpen(true) }}
          onBlur={() => setFocus(false)}
          placeholder={artists.length > 0 ? 'Choose or type artist' : 'Artist name'}
          disabled={disabled}
          style={{ background: 'none', border: 'none', outline: 'none', fontSize: large ? 15 : 12, color: disabled ? 'rgba(255,255,255,.5)' : '#fff', width: '100%', fontFamily: 'inherit' }}
        />
        {exactMatch && (
          <span style={{ fontSize: 9, fontWeight: 700, color: '#1db954', background: 'rgba(29,185,84,.12)', borderRadius: 4, padding: '2px 5px', whiteSpace: 'nowrap', flexShrink: 0 }}>EXISTING</span>
        )}
      </div>

      <FixedDropdown anchorRef={wrapRef} open={open && !disabled && (suggestions.length > 0 || !!value.trim())}>
        {suggestions.map((a) => (
          <div key={a.id}
            onMouseDown={(e) => { e.preventDefault(); select(a.name, a.image) }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {a.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={a.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.3)' }}>{a.name.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{a.albumCount} album{a.albumCount !== 1 ? 's' : ''} · {a.trackCount} track{a.trackCount !== 1 ? 's' : ''}</div>
            </div>
          </div>
        ))}
        {value.trim() && !exactMatch && (
          <div style={{ padding: '8px 12px', borderTop: suggestions.length ? '1px solid rgba(255,255,255,.07)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1db954" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>Create <strong style={{ color: '#fff' }}>&quot;{value.trim()}&quot;</strong></span>
          </div>
        )}
      </FixedDropdown>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.4)', letterSpacing: '.8px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}


function GenreSelect({ value, onChange, disabled = false, size = 'md' }: {
  value: string; onChange: (g: string) => void; disabled?: boolean; size?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState(false)
  const wrapRef         = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fs   = size === 'sm' ? 11 : 13
  const pad  = size === 'sm' ? '5px 8px' : '9px 12px'
  const rad  = size === 'sm' ? 6 : 8

  return (
    <div ref={wrapRef}>
      <button
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, background: 'rgba(255,255,255,.06)', border: `1px solid rgba(255,255,255,.09)`, borderRadius: rad, padding: pad, cursor: disabled ? 'default' : 'pointer', color: 'rgba(255,255,255,.8)', fontSize: fs, fontFamily: 'inherit', transition: 'border-color .15s' }}
        onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)' }}
        onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)' }}
      >
        <span>{value || 'Genre'}</span>
        {!disabled && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>}
      </button>

      <FixedDropdown anchorRef={wrapRef} open={open && !disabled}>
        {GENRES.map((g) => (
          <button key={g}
            onMouseDown={(e) => { e.preventDefault(); onChange(g); setOpen(false) }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', color: g === value ? '#1db954' : 'rgba(255,255,255,.75)', fontSize: 13, fontFamily: 'inherit', textAlign: 'left' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            {g}
            {g === value && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </button>
        ))}
      </FixedDropdown>
    </div>
  )
}
