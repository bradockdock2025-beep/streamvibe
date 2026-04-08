'use client'

import { create } from 'zustand'
import { audioManager } from '@/lib/audioManager'
import { adminHeaders } from '@/lib/utils'

interface PlaybackQueueItem { albumId: string; trackId: string }

interface PlayerState {
  mpFullscreen:       boolean
  mpPlaying:          boolean
  mpShuffling:        boolean
  mpRepeating:        boolean
  mpTrackIdx:         number
  mpQueue:            PlaybackQueueItem[]
  mpQueueIdx:         number
  mpProgress:         number
  mpVolume:           number
  mpCurrentTrackId:   string
  mpCurrentTrackName: string
  mpCurrentArtist:    string
  mpCurrentCover:     string
  mpCurrentDur:       string
  mpCurrentSec:       number
  mpTotalSec:         number
  mpAudioError:       string

  // Plays a specific queue item by index
  playQueueAt: (queue: PlaybackQueueItem[], queueIdx: number, albums: import('@/types').Album[]) => void

  mpTogglePlay:       () => void
  mpSetProgress:      (p: number) => void
  mpPrev:             () => void
  mpNext:             () => void
  mpToggleFullscreen: () => void
  mpToggleShuffle:    () => void
  mpToggleRepeat:     () => void
  mpSetVolume:        (v: number) => void
  mpStop:             () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  mpFullscreen:       false,
  mpPlaying:          false,
  mpShuffling:        false,
  mpRepeating:        false,
  mpTrackIdx:         0,
  mpQueue:            [],
  mpQueueIdx:         0,
  mpProgress:         0,
  mpVolume:           70,
  mpCurrentTrackId:   '',
  mpCurrentTrackName: '',
  mpCurrentArtist:    '',
  mpCurrentCover:     '',
  mpCurrentDur:       '0:00',
  mpCurrentSec:       0,
  mpTotalSec:         0,
  mpAudioError:       '',

  playQueueAt: (queue, queueIdx, albums) => {
    const item = queue[queueIdx]
    if (!item) return

    const album = albums.find((a) => a.id === item.albumId)
    if (!album) return

    const albumTrackIdx = album.tracks.findIndex((t) => t.id === item.trackId)
    if (albumTrackIdx < 0) return

    const track = album.tracks[albumTrackIdx]

    set({
      mpTrackIdx: albumTrackIdx,
      mpQueue: queue,
      mpQueueIdx: queueIdx,
      mpPlaying: true,
      mpProgress: 0,
      mpCurrentSec: 0,
      mpTotalSec: track.durationSec,
      mpAudioError: '',
      mpCurrentTrackId:   track.id,
      mpCurrentTrackName: track.name,
      mpCurrentArtist:    album.artist,
      mpCurrentCover:     album.cover,
      mpCurrentDur:       track.dur,
    })

    if (track.fileUrl) {
      // Get a short-lived HMAC stream token, then play via byte-range proxy.
      // The proxy URL (/api/stream/[id]?t=TOKEN) supports Range requests for
      // efficient large-file streaming and instant seeking.
      fetch(`/api/stream/${track.id}`, { headers: adminHeaders() })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.streamUrl) {
            audioManager.play(data.streamUrl)
          } else {
            // Fallback: play direct URL (Range requests still work via CDN)
            audioManager.play(track.fileUrl)
          }
        })
        .catch(() => audioManager.play(track.fileUrl))
    }
  },

  mpTogglePlay: () => {
    const playing = !get().mpPlaying
    set({ mpPlaying: playing })
    if (playing) audioManager.resume()
    else         audioManager.pause()
  },

  mpSetProgress: (p) => {
    set({ mpProgress: p })
    audioManager.seek(p)
  },

  mpPrev: () => {
    const { mpQueue, mpQueueIdx, mpShuffling } = get()
    if (!mpQueue.length) return
    const idx = mpShuffling
      ? Math.floor(Math.random() * mpQueue.length)
      : Math.max(0, mpQueueIdx - 1)
    // Re-trigger via callback — albums injected by consumer
    set({ mpQueueIdx: idx })
  },

  mpNext: () => {
    const { mpQueue, mpQueueIdx, mpShuffling, mpRepeating } = get()
    if (!mpQueue.length) return
    const idx = mpRepeating ? mpQueueIdx
      : mpShuffling ? Math.floor(Math.random() * mpQueue.length)
      : Math.min(mpQueue.length - 1, mpQueueIdx + 1)
    set({ mpQueueIdx: idx })
  },

  mpToggleFullscreen: () => set((s) => ({ mpFullscreen: !s.mpFullscreen })),
  mpToggleShuffle:    () => set((s) => ({ mpShuffling:  !s.mpShuffling })),
  mpToggleRepeat:     () => set((s) => ({ mpRepeating:  !s.mpRepeating })),

  mpSetVolume: (v) => {
    const clamped = Math.max(0, Math.min(100, v))
    set({ mpVolume: clamped })
    audioManager.setVolume(clamped)
  },

  mpStop: () => {
    audioManager.stop()
    set({
      mpPlaying: false, mpTrackIdx: 0, mpQueue: [], mpQueueIdx: 0,
      mpProgress: 0, mpCurrentTrackId: '', mpCurrentTrackName: '',
      mpCurrentArtist: '', mpCurrentCover: '', mpCurrentDur: '0:00',
      mpCurrentSec: 0, mpTotalSec: 0, mpAudioError: '',
    })
  },
}))
