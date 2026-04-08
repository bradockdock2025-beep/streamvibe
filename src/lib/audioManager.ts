// ─── AudioManager ─────────────────────────────────────────────────────────────
// Two HTMLAudioElements: _el (active) and _nextEl (preloading / crossfading).
// All DOM access is guarded by typeof window.

type ProgressCb        = (progressPct: number, currentSec: number, durationSec: number) => void
type EndedCb           = () => void
type ErrorCb           = (msg: string) => void
type CrossfadeStartCb  = () => void

class AudioManager {
  private _el:     HTMLAudioElement | null = null
  private _nextEl: HTMLAudioElement | null = null

  private _onProgress:       ProgressCb       | null = null
  private _onEnded:          EndedCb          | null = null
  private _onError:          ErrorCb          | null = null
  private _onCrossfadeStart: CrossfadeStartCb | null = null

  private _crossfadeSec    = 3
  private _crossfading     = false
  private _vol             = 70   // 0–100, user-set
  private _rafId: number   | null = null
  private _pendingPreload: string | null = null  // deferred during crossfade

  // ── Bound handlers (stable refs for add/removeEventListener) ─────────────────
  private readonly _handleTimeUpdate = () => this._onTimeUpdate()
  private readonly _handleNaturalEnd = () => this._onNaturalEnd()
  private readonly _handleError      = () => this._onElError()

  // ── Element lifecycle ─────────────────────────────────────────────────────────

  private _makeEl(): HTMLAudioElement {
    const a = new Audio()
    a.preload = 'auto'
    return a
  }

  private _attach(el: HTMLAudioElement) {
    el.addEventListener('timeupdate', this._handleTimeUpdate)
    el.addEventListener('ended',      this._handleNaturalEnd)
    el.addEventListener('error',      this._handleError)
  }

  private _detach(el: HTMLAudioElement) {
    el.removeEventListener('timeupdate', this._handleTimeUpdate)
    el.removeEventListener('ended',      this._handleNaturalEnd)
    el.removeEventListener('error',      this._handleError)
  }

  private get el(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null
    if (!this._el) {
      this._el = this._makeEl()
      this._attach(this._el)
    }
    return this._el
  }

  private get nextEl(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null
    if (!this._nextEl) this._nextEl = this._makeEl()
    return this._nextEl
  }

  // ── Internal event handlers ───────────────────────────────────────────────────

  private _onTimeUpdate() {
    const a = this._el
    if (!a || !a.duration || isNaN(a.duration)) return

    const pct = (a.currentTime / a.duration) * 100
    this._onProgress?.(pct, Math.floor(a.currentTime), Math.floor(a.duration))

    // Trigger crossfade when close to end and next track is preloaded
    const nextSrc   = this._nextEl?.src ?? ''
    const hasNext   = nextSrc.length > 0 && !nextSrc.endsWith('/') && nextSrc !== window.location.href
    const remaining = a.duration - a.currentTime

    if (
      !this._crossfading &&
      this._crossfadeSec > 0 &&
      hasNext &&
      remaining <= this._crossfadeSec + 0.3 &&
      remaining > 0.1
    ) {
      this._startCrossfade()
    }
  }

  private _onNaturalEnd() {
    if (this._crossfading) return  // crossfade is handling the transition
    this._onEnded?.()
  }

  private _onElError() {
    if (this._crossfading) return
    const code = this._el?.error?.code ?? 0
    const msgs: Record<number, string> = {
      1: 'Playback aborted',
      2: 'Network error',
      3: 'Decoding failed',
      4: 'Source not supported',
    }
    this._onError?.(msgs[code] ?? 'Unknown audio error')
  }

  // ── Crossfade engine ──────────────────────────────────────────────────────────

  private _startCrossfade() {
    const active = this._el
    const next   = this._nextEl
    if (!active || !next || !next.src) return

    this._crossfading = true
    this._onCrossfadeStart?.()   // store advances UI to next track

    next.currentTime = 0
    next.volume = 0
    next.play().catch(() => {})

    const startTime  = performance.now()
    const durationMs = this._crossfadeSec * 1000
    const targetVol  = this._vol / 100

    const tick = () => {
      const t = Math.min((performance.now() - startTime) / durationMs, 1)

      if (this._el)     this._el.volume     = targetVol * (1 - t)
      if (this._nextEl) this._nextEl.volume = targetVol * t

      if (t < 1) {
        this._rafId = requestAnimationFrame(tick)
      } else {
        this._completeCrossfade()
      }
    }

    this._rafId = requestAnimationFrame(tick)
  }

  private _completeCrossfade() {
    const oldEl = this._el
    const newEl = this._nextEl

    if (oldEl) { this._detach(oldEl); oldEl.pause(); oldEl.src = '' }
    if (newEl) { this._attach(newEl); newEl.volume = this._vol / 100 }

    this._el         = newEl
    this._nextEl     = oldEl ?? this._makeEl()
    this._nextEl.src = ''
    this._crossfading = false
    this._rafId       = null

    // Apply any preload that was deferred during the crossfade
    if (this._pendingPreload) {
      const url = this._pendingPreload
      this._pendingPreload = null
      this.preloadNext(url)
    }
  }

  // ── Public API — callbacks ────────────────────────────────────────────────────

  onProgress(cb: ProgressCb)              { this._onProgress       = cb }
  onEnded(cb: EndedCb)                    { this._onEnded          = cb }
  onError(cb: ErrorCb)                    { this._onError          = cb }
  onCrossfadeStart(cb: CrossfadeStartCb)  { this._onCrossfadeStart = cb }

  // ── Public API — configuration ────────────────────────────────────────────────

  setCrossfadeSec(s: number) { this._crossfadeSec = Math.max(0, s) }
  getCrossfadeSec()          { return this._crossfadeSec }

  // ── Public API — preloading ───────────────────────────────────────────────────

  preloadNext(url: string) {
    const normalized = url.startsWith('http') ? url : `${window.location.origin}${url}`

    // During crossfade _nextEl is the element fading in — don't interrupt it.
    if (this._crossfading) {
      this._pendingPreload = normalized
      return
    }

    const next = this.nextEl
    if (!next) return
    if (next.src !== normalized) {
      next.src = normalized
      next.load()
    }
  }

  clearPreload() {
    if (!this._nextEl) return
    this._nextEl.pause()
    this._nextEl.src = ''
  }

  // ── Public API — playback controls ────────────────────────────────────────────

  play(url: string) {
    const a = this.el
    if (!a) return

    const normalized = url.startsWith('http') ? url : `${window.location.origin}${url}`

    // Already playing this URL (e.g. after a crossfade swap) — just ensure volume
    if (a.src === normalized && !a.paused) {
      a.volume = this._vol / 100
      return
    }

    this._cancelCrossfade()

    if (a.src !== normalized) {
      a.src = normalized
      a.load()
    }
    a.volume = this._vol / 100
    a.play().catch(() => {})
  }

  pause()  { this._el?.pause() }
  resume() { this._el?.play().catch(() => {}) }

  seek(pct: number) {
    const a = this._el
    if (!a || !a.duration || isNaN(a.duration)) return
    a.currentTime = (Math.max(0, Math.min(100, pct)) / 100) * a.duration
  }

  setVolume(v: number) {
    this._vol = Math.max(0, Math.min(100, v))
    const vol = this._vol / 100
    if (this._el) {
      this._el.volume = vol
      this._el.muted  = this._vol === 0
    }
  }

  getDurationSec(): number {
    const a = this._el
    if (!a || !a.duration || isNaN(a.duration)) return 0
    return Math.floor(a.duration)
  }

  isPlaying(): boolean {
    const a = this._el
    if (!a) return false
    return !a.paused && !a.ended && a.readyState > 2
  }

  stop() {
    this._cancelCrossfade()
    if (this._el)     { this._el.pause();    this._el.src     = '' }
    if (this._nextEl) { this._nextEl.pause(); this._nextEl.src = '' }
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private _cancelCrossfade() {
    if (this._rafId !== null) { cancelAnimationFrame(this._rafId); this._rafId = null }
    this._crossfading    = false
    this._pendingPreload = null
    if (this._nextEl) { this._nextEl.pause(); this._nextEl.src = '' }
  }
}

// Export a single shared instance
export const audioManager = new AudioManager()
