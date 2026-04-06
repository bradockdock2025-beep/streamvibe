// ─── AudioManager ─────────────────────────────────────────────────────────────
// Singleton wrapper around HTMLAudioElement.
// Safe to import in any file — all DOM access is guarded by typeof window.

type ProgressCb = (progressPct: number, currentSec: number, durationSec: number) => void
type EndedCb    = () => void
type ErrorCb    = (msg: string) => void

class AudioManager {
  private _audio: HTMLAudioElement | null = null
  private _onProgress: ProgressCb | null = null
  private _onEnded:    EndedCb    | null = null
  private _onError:    ErrorCb    | null = null

  // Lazy init — only runs in browser
  private get audio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null
    if (!this._audio) {
      this._audio = new Audio()
      this._audio.preload = 'metadata'

      this._audio.addEventListener('timeupdate', () => {
        const a = this._audio!
        if (!a.duration || isNaN(a.duration)) return
        const pct = (a.currentTime / a.duration) * 100
        this._onProgress?.(pct, Math.floor(a.currentTime), Math.floor(a.duration))
      })

      this._audio.addEventListener('ended', () => {
        this._onEnded?.()
      })

      this._audio.addEventListener('error', () => {
        const code = this._audio?.error?.code ?? 0
        const msgs: Record<number, string> = {
          1: 'Playback aborted',
          2: 'Network error',
          3: 'Decoding failed',
          4: 'Source not supported',
        }
        this._onError?.(msgs[code] ?? 'Unknown audio error')
      })
    }
    return this._audio
  }

  // ── Callbacks ──────────────────────────────────────────────────────────────
  onProgress(cb: ProgressCb) { this._onProgress = cb }
  onEnded(cb: EndedCb)       { this._onEnded    = cb }
  onError(cb: ErrorCb)       { this._onError    = cb }

  // ── Playback controls ──────────────────────────────────────────────────────
  play(url: string) {
    const a = this.audio
    if (!a) return
    // Only reload if the source changed
    const normalized = url.startsWith('http') ? url : `${window.location.origin}${url}`
    if (a.src !== normalized) {
      a.src = normalized
      a.load()
    }
    a.play().catch(() => {/* autoplay blocked — UI will reflect paused state */})
  }

  pause()  { this.audio?.pause() }
  resume() { this.audio?.play().catch(() => {}) }

  seek(pct: number) {
    const a = this.audio
    if (!a || !a.duration || isNaN(a.duration)) return
    a.currentTime = (Math.max(0, Math.min(100, pct)) / 100) * a.duration
  }

  setVolume(v: number) {
    const a = this.audio
    if (!a) return
    a.volume = Math.max(0, Math.min(1, v / 100))
    a.muted  = v === 0
  }

  getDurationSec(): number {
    const a = this.audio
    if (!a || !a.duration || isNaN(a.duration)) return 0
    return Math.floor(a.duration)
  }

  isPlaying(): boolean {
    const a = this.audio
    if (!a) return false
    return !a.paused && !a.ended && a.readyState > 2
  }

  stop() {
    const a = this.audio
    if (!a) return
    a.pause()
    a.src = ''
  }
}

// Export a single shared instance
export const audioManager = new AudioManager()
