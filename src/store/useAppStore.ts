import { create } from 'zustand'
import type { AppPage, MpView, Album, Track, Artist, Playlist, UploadFile } from '@/types'
import type { ApiAlbum, ApiArtist, ApiTrack, ApiPlaylist } from '@/types'
import { adminHeaders, uid } from '@/lib/utils'
import { audioManager } from '@/lib/audioManager'

// ─── Adapters: API shape → store shape ───────────────────────────────────────
function apiAlbumToStore(a: ApiAlbum): Album {
  return {
    id:       a.id,
    name:     a.name,
    artistId: a.artistId,
    artist:   a.artist?.name ?? '',
    cover:    a.cover,
    year:     a.year,
    genre:    a.genre,
    tracks:   a.tracks.map(apiTrackToStore),
  }
}

function apiTrackToStore(t: ApiTrack): Track {
  return {
    id:          t.id,
    name:        t.name,
    dur:         t.dur || '0:00',
    durationSec: t.durationSec ?? 0,
    trackNumber: t.trackNumber ?? 0,
    fileUrl:     t.fileUrl ?? '',
    fileSize:    t.fileSize ?? 0,
    format:      t.format  ?? '',
    genre:       t.genre   ?? '',
    albumId:     t.albumId,
    artistId:    t.artistId,
  }
}

function apiArtistToStore(a: ApiArtist): Artist {
  return {
    id:         a.id,
    name:       a.name,
    image:      a.image      ?? '',
    bio:        a.bio        ?? '',
    albumCount: a.albumCount ?? 0,
    trackCount: a.trackCount ?? 0,
  }
}

function fmtTotalDur(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function apiPlaylistToStore(p: ApiPlaylist): Playlist {
  const tracks = [...p.tracks]
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      id: entry.id,
      order: entry.order,
      track: apiTrackToStore(entry.track),
      album: {
        id: entry.track.album?.id ?? entry.track.albumId,
        name: entry.track.album?.name ?? '',
        cover: entry.track.album?.cover ?? '',
      },
      artist: {
        id: entry.track.artist?.id ?? entry.track.artistId,
        name: entry.track.artist?.name ?? '',
      },
    }))

  const totalSec = tracks.reduce((acc, entry) => acc + (entry.track.durationSec ?? 0), 0)
  const seen = new Set<string>()
  const covers: string[] = []
  for (const entry of tracks) {
    const cover = entry.album.cover
    if (cover && !seen.has(cover)) { seen.add(cover); covers.push(cover) }
    if (covers.length === 4) break
  }
  return {
    id:          p.id,
    name:        p.name,
    description: p.description ?? '',
    createdAt:   p.createdAt,
    covers,
    trackCount:  tracks.length,
    totalDur:    fmtTotalDur(totalSec),
    tracks,
  }
}

interface MusicDeleteSummary {
  deletedArtistIds: string[]
  deletedAlbumIds: string[]
  deletedTrackIds: string[]
  cleanupErrors: string[]
}

interface PlaybackQueueItem {
  albumId: string
  trackId: string
}

function normalizeDeleteSummary(body: unknown): MusicDeleteSummary {
  const data = (body && typeof body === 'object') ? body as Record<string, unknown> : {}
  return {
    deletedArtistIds: Array.isArray(data.deletedArtistIds) ? data.deletedArtistIds.filter((v): v is string => typeof v === 'string') : [],
    deletedAlbumIds: Array.isArray(data.deletedAlbumIds) ? data.deletedAlbumIds.filter((v): v is string => typeof v === 'string') : [],
    deletedTrackIds: Array.isArray(data.deletedTrackIds) ? data.deletedTrackIds.filter((v): v is string => typeof v === 'string') : [],
    cleanupErrors: Array.isArray(data.cleanupErrors) ? data.cleanupErrors.filter((v): v is string => typeof v === 'string') : [],
  }
}

function stoppedPlayerState() {
  return {
    mpPlaying: false,
    mpTrackIdx: 0,
    mpQueue: [] as PlaybackQueueItem[],
    mpQueueIdx: 0,
    mpProgress: 0,
    mpCurrentTrackId: '',
    mpCurrentTrackName: '',
    mpCurrentArtist: '',
    mpCurrentCover: '',
    mpCurrentDur: '0:00',
    mpCurrentSec: 0,
    mpTotalSec: 0,
    mpAudioError: '',
  }
}

// ─── User ─────────────────────────────────────────────────────────────────────
interface User { name: string; email: string; initials: string }

// ─── State interface ──────────────────────────────────────────────────────────
interface AppState {
  // Navigation
  page: AppPage
  user: User

  // Toast
  toastMsg:     string
  toastVisible: boolean

  // Modals
  uploadModalOpen: boolean

  // Music — library
  mpView:               MpView
  mpCurrentAlbumId:     string | null
  mpCurrentArtistName:  string | null
  mpCurrentPlaylistId:  string | null
  albums:               Album[]
  artists:              Artist[]
  playlists:            Playlist[]
  albumsLoading:        boolean
  artistsLoading:       boolean
  playlistsLoading:     boolean

  // Music — playback
  mpFullscreen:       boolean
  mpPlaying:          boolean
  mpShuffling:        boolean
  mpRepeating:        boolean
  mpTrackIdx:         number
  mpQueue:            PlaybackQueueItem[]
  mpQueueIdx:         number
  mpProgress:         number    // 0–100
  mpVolume:           number    // 0–100
  mpCurrentTrackId:   string
  mpCurrentTrackName: string
  mpCurrentArtist:    string
  mpCurrentCover:     string
  mpCurrentDur:       string
  mpCurrentSec:       number
  mpTotalSec:         number
  mpAudioError:       string

  // Music — user data
  mpLiked:     string[]
  uploadFiles: UploadFile[]

  // ── Actions — Navigation ────────────────────────────────────────────────────
  goAuth:       () => void
  goHub:        () => void
  openMusicApp: () => void

  // ── Actions — Toast ─────────────────────────────────────────────────────────
  showToast: (msg: string) => void

  // ── Actions — Modals ────────────────────────────────────────────────────────
  openUploadModal:  () => void
  closeUploadModal: () => void

  // ── Actions — Music data ────────────────────────────────────────────────────
  fetchAlbums:    () => Promise<void>
  fetchArtists:   () => Promise<void>
  fetchPlaylists: () => Promise<void>
  fetchLikes:     () => Promise<void>

  // ── Actions — Music navigation ──────────────────────────────────────────────
  mpSetView:      (v: MpView) => void
  mpOpenAlbum:    (id: string) => void
  mpOpenArtist:   (name: string) => void
  mpOpenPlaylist: (id: string) => void
  mpBackToLibrary:() => void

  // ── Actions — Playback ──────────────────────────────────────────────────────
  mpToggleFullscreen: () => void
  mpPlayAlbum:    (albumId: string) => void
  mpPlayTrack:    (albumId: string, idx: number) => void
  mpPlayPlaylist: (playlistId: string, idx?: number) => void
  mpTogglePlay:   () => void
  mpSetProgress:  (p: number) => void
  mpPrev:         () => void
  mpNext:         () => void
  mpToggleShuffle:() => void
  mpToggleRepeat: () => void
  mpSetVolume:    (v: number) => void

  // ── Actions — User data ─────────────────────────────────────────────────────
  mpToggleLike:     (trackId: string) => Promise<void>
  simulateUpload:   () => void
  removeUploadFile: (id: string) => void

  // Called after real upload API succeeds — refresh albums from DB
  refreshAfterUpload: () => Promise<void>
  createPlaylist: (name: string, description?: string, trackIds?: string[]) => Promise<string | null>
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<boolean>
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<boolean>
  reorderPlaylistTracks: (playlistId: string, orderedTrackIds: string[]) => Promise<boolean>
  deletePlaylist: (playlistId: string) => Promise<boolean>
  deleteAlbum: (albumId: string) => Promise<boolean>
  deleteArtist: (artistId: string) => Promise<boolean>
  deleteTrack: (trackId: string) => Promise<boolean>
  updateAlbumCover: (albumId: string, coverUrl: string) => Promise<boolean>
  updateArtistImage: (artistId: string, imageUrl: string) => Promise<boolean>
}

// ─── Fake upload files ────────────────────────────────────────────────────────
const FAKE_FILES = [
  { n: 'Saturday Nights.mp3', s: '4.2 MB' },
  { n: 'Bad Luck (Khalid).mp3', s: '3.8 MB' },
  { n: 'Circles - Mac Miller.flac', s: '18.4 MB' },
  { n: 'God is a woman.mp3', s: '5.1 MB' },
  { n: 'Ladders.wav', s: '22.1 MB' },
]
let fakeIdx = 0

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>((set, get) => {
  const refreshMusicLibrary = async () => {
    await Promise.all([
      get().fetchAlbums(),
      get().fetchArtists(),
      get().fetchPlaylists(),
      get().fetchLikes(),
    ])
  }

  const applyDeleteSummary = (summary: MusicDeleteSummary) => {
    const { albums, artists, mpCurrentAlbumId, mpCurrentArtistName, mpCurrentTrackId, mpLiked } = get()
    const deletedTrackIds = new Set(summary.deletedTrackIds)
    const deletedAlbumIds = new Set(summary.deletedAlbumIds)
    const deletedArtistIds = new Set(summary.deletedArtistIds)

    const currentAlbum = albums.find((album) => album.id === mpCurrentAlbumId) ?? null
    const currentArtist = artists.find((artist) => artist.name === mpCurrentArtistName) ?? null
    const shouldStopPlayback =
      (mpCurrentTrackId ? deletedTrackIds.has(mpCurrentTrackId) : false) ||
      (mpCurrentAlbumId ? deletedAlbumIds.has(mpCurrentAlbumId) : false) ||
      (currentAlbum ? deletedArtistIds.has(currentAlbum.artistId) : false)

    const nextState: Partial<AppState> = {
      mpLiked: mpLiked.filter((id) => !deletedTrackIds.has(id)),
    }

    if (shouldStopPlayback) {
      Object.assign(nextState, stoppedPlayerState())
      audioManager.stop()
    }

    if (
      (mpCurrentAlbumId ? deletedAlbumIds.has(mpCurrentAlbumId) : false) ||
      (currentAlbum ? deletedArtistIds.has(currentAlbum.artistId) : false)
    ) {
      nextState.mpCurrentAlbumId = null
    }

    if (
      (currentArtist ? deletedArtistIds.has(currentArtist.id) : false) ||
      (currentAlbum ? deletedArtistIds.has(currentAlbum.artistId) : false)
    ) {
      nextState.mpCurrentArtistName = null
    }

    set(nextState)

    if (summary.cleanupErrors.length) {
      console.warn('[music delete cleanup]', summary.cleanupErrors)
    }
  }

  const deleteMusicEntity = async (path: string, successMessage: string) => {
    try {
      const res = await fetch(path, { method: 'DELETE', headers: adminHeaders() })
      const body = await res.json().catch(() => null)

      if (!res.ok) {
        const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'Delete failed'
        get().showToast(message)
        return false
      }

      applyDeleteSummary(normalizeDeleteSummary(body))
      await refreshMusicLibrary()
      get().showToast(successMessage)
      return true
    } catch (error) {
      console.error('[deleteMusicEntity]', error)
      get().showToast('Delete failed')
      return false
    }
  }

  const buildAlbumQueue = (albumId: string): PlaybackQueueItem[] => {
    const album = get().albums.find((item) => item.id === albumId)
    return album ? album.tracks.map((track) => ({ albumId, trackId: track.id })) : []
  }

  const buildPlaylistQueue = (playlistId: string): PlaybackQueueItem[] => {
    const playlist = get().playlists.find((item) => item.id === playlistId)
    return playlist
      ? playlist.tracks.map((entry) => ({ albumId: entry.track.albumId, trackId: entry.track.id }))
      : []
  }

  const resolveQueueItem = (item: PlaybackQueueItem) => {
    const album = get().albums.find((candidate) => candidate.id === item.albumId)
    if (!album) return null

    const albumTrackIdx = album.tracks.findIndex((track) => track.id === item.trackId)
    if (albumTrackIdx < 0) return null

    return {
      album,
      albumTrackIdx,
      track: album.tracks[albumTrackIdx],
    }
  }

  const playQueueAt = (queue: PlaybackQueueItem[], queueIdx: number) => {
    const item = queue[queueIdx]
    if (!item) return

    const resolved = resolveQueueItem(item)
    if (!resolved) return

    const { album, albumTrackIdx, track } = resolved

    set({
      mpCurrentAlbumId: album.id,
      mpTrackIdx: albumTrackIdx,
      mpQueue: queue,
      mpQueueIdx: queueIdx,
      mpPlaying: true,
      mpProgress: 0,
      mpCurrentSec: 0,
      mpTotalSec: track.durationSec,
      mpAudioError: '',
      mpCurrentTrackId: track.id,
      mpCurrentTrackName: track.name,
      mpCurrentArtist: album.artist,
      mpCurrentCover: album.cover,
      mpCurrentDur: track.dur,
    })

    if (track.fileUrl) {
      audioManager.play(track.fileUrl)
    }

    get().showToast(`▶ ${track.name}`)
  }

  const mutatePlaylist = async (payload: Record<string, unknown>, fallbackMessage: string) => {
    try {
      const res = await fetch('/api/playlists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => null)

      if (!res.ok) {
        const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : fallbackMessage
        get().showToast(message)
        return false
      }

      await get().fetchPlaylists()
      return true
    } catch (error) {
      console.error('[mutatePlaylist]', error)
      get().showToast(fallbackMessage)
      return false
    }
  }

  return {
  // ── App ──
  page:             'auth',
  user:             { name: 'Usuário', email: 'usuario@exemplo.com', initials: 'US' },
  toastMsg:         '',
  toastVisible:     false,
  uploadModalOpen:  false,

  // ── Music ──
  mpView:              'library',
  mpCurrentAlbumId:    null,
  mpCurrentArtistName: null,
  mpCurrentPlaylistId: null,
  albums:           [],
  artists:          [],
  playlists:        [],
  albumsLoading:    false,
  artistsLoading:   false,
  playlistsLoading: false,
  mpFullscreen:        false,
  mpPlaying:           false,
  mpShuffling:         false,
  mpRepeating:         false,
  mpTrackIdx:          0,
  mpQueue:             [],
  mpQueueIdx:          0,
  mpProgress:          0,
  mpVolume:            70,
  mpCurrentTrackId:    '',
  mpCurrentTrackName:  '',
  mpCurrentArtist:     '',
  mpCurrentCover:      '',
  mpCurrentDur:        '0:00',
  mpCurrentSec:        0,
  mpTotalSec:          0,
  mpAudioError:        '',
  mpLiked:             [],
  uploadFiles:         [],

  // ── Navigation ──
  goAuth: () => set({ page: 'auth' }),
  goHub:  () => set({ page: 'hub' }),

  openMusicApp: () => {
    set({ page: 'app', mpView: 'library', mpCurrentAlbumId: null, mpCurrentArtistName: null, mpCurrentPlaylistId: null })
    if (!get().albums.length)    get().fetchAlbums()
    if (!get().artists.length)   get().fetchArtists()
    if (!get().playlists.length) get().fetchPlaylists()
  },

  // ── Toast ──
  showToast: (msg) => {
    set({ toastMsg: msg, toastVisible: true })
    setTimeout(() => set({ toastVisible: false }), 2200)
  },

  // ── Modals ──
  openUploadModal:  () => set({ uploadModalOpen: true, uploadFiles: [] }),
  closeUploadModal: () => set({ uploadModalOpen: false }),

  // ── Music data ──
  fetchAlbums: async () => {
    set({ albumsLoading: true })
    try {
      const res  = await fetch('/api/albums')
      const body = await res.json()
      if (!res.ok) { console.error(`[fetchAlbums] HTTP ${res.status}`, body); set({ albumsLoading: false }); return }
      const data: ApiAlbum[] = Array.isArray(body) ? body : []
      set({ albums: data.map(apiAlbumToStore), albumsLoading: false })
    } catch (error) {
      console.error('[fetchAlbums]', error)
      set({ albumsLoading: false })
    }
  },

  fetchArtists: async () => {
    set({ artistsLoading: true })
    try {
      const res  = await fetch('/api/artists')
      const body = await res.json()
      if (!res.ok) { console.error('[fetchArtists]', body); set({ artistsLoading: false }); return }
      const data: ApiArtist[] = Array.isArray(body) ? body : []
      set({ artists: data.map(apiArtistToStore), artistsLoading: false })
    } catch (error) {
      console.error('[fetchArtists]', error)
      set({ artistsLoading: false })
    }
  },

  fetchPlaylists: async () => {
    set({ playlistsLoading: true })
    try {
      const res  = await fetch('/api/playlists')
      const body = await res.json()
      if (!res.ok) { console.error('[fetchPlaylists]', body); set({ playlistsLoading: false }); return }
      const data: ApiPlaylist[] = Array.isArray(body) ? body : []
      const playlists = data.map(apiPlaylistToStore)
      const nextState: Partial<AppState> = {
        playlists,
        playlistsLoading: false,
      }

      if (get().mpCurrentPlaylistId && !playlists.some((playlist) => playlist.id === get().mpCurrentPlaylistId)) {
        nextState.mpCurrentPlaylistId = null
      }

      set(nextState)
    } catch (error) {
      console.error('[fetchPlaylists]', error)
      set({ playlistsLoading: false })
    }
  },

  fetchLikes: async () => {
    try {
      const res  = await fetch('/api/likes')
      const body = await res.json()
      if (!res.ok) { console.error('[fetchLikes]', body); return }
      set({ mpLiked: Array.isArray(body) ? body : [] })
    } catch (error) {
      console.error('[fetchLikes]', error)
    }
  },

  // ── Music navigation ──
  mpSetView:       (v) => set({ mpView: v, mpCurrentAlbumId: null, mpCurrentArtistName: null, mpCurrentPlaylistId: null }),
  mpOpenAlbum:     (id)   => set({ mpCurrentAlbumId: id, mpCurrentArtistName: null, mpCurrentPlaylistId: null }),
  mpOpenArtist:    (name) => set({ mpCurrentArtistName: name, mpCurrentAlbumId: null, mpCurrentPlaylistId: null }),
  mpOpenPlaylist:  (id)   => set({ mpCurrentPlaylistId: id, mpCurrentAlbumId: null, mpCurrentArtistName: null, mpView: 'playlists' }),
  mpBackToLibrary: () => set({ mpCurrentAlbumId: null, mpCurrentArtistName: null, mpCurrentPlaylistId: null }),

  // ── Playback ──
  mpPlayAlbum: (albumId) => {
    const queue = buildAlbumQueue(albumId)
    if (!queue.length) return
    playQueueAt(queue, 0)
  },

  mpPlayTrack: (albumId, idx) => {
    const queue = buildAlbumQueue(albumId)
    if (!queue[idx]) return
    playQueueAt(queue, idx)
  },

  mpPlayPlaylist: (playlistId, idx = 0) => {
    const queue = buildPlaylistQueue(playlistId)
    if (!queue[idx]) return
    playQueueAt(queue, idx)
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
    let idx: number
    if (mpShuffling) {
      idx = Math.floor(Math.random() * mpQueue.length)
    } else {
      idx = Math.max(0, mpQueueIdx - 1)
    }
    playQueueAt(mpQueue, idx)
  },

  mpNext: () => {
    const { mpQueue, mpQueueIdx, mpShuffling, mpRepeating } = get()
    if (!mpQueue.length) return
    let idx: number
    if (mpRepeating) {
      idx = mpQueueIdx
    } else if (mpShuffling) {
      idx = Math.floor(Math.random() * mpQueue.length)
    } else {
      idx = Math.min(mpQueue.length - 1, mpQueueIdx + 1)
    }
    playQueueAt(mpQueue, idx)
  },

  mpToggleFullscreen: () => set((s) => ({ mpFullscreen: !s.mpFullscreen })),
  mpToggleShuffle: () => set((s) => ({ mpShuffling: !s.mpShuffling })),
  mpToggleRepeat:  () => set((s) => ({ mpRepeating: !s.mpRepeating })),

  mpSetVolume: (v) => {
    const clamped = Math.max(0, Math.min(100, v))
    set({ mpVolume: clamped })
    audioManager.setVolume(clamped)
  },

  // ── User data ──
  mpToggleLike: async (trackId) => {
    // Optimistic update
    set((s) => ({
      mpLiked: s.mpLiked.includes(trackId)
        ? s.mpLiked.filter((id) => id !== trackId)
        : [...s.mpLiked, trackId],
    }))
    try {
      await fetch('/api/likes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ trackId }),
      })
    } catch {
      // Rollback on error
      set((s) => ({
        mpLiked: s.mpLiked.includes(trackId)
          ? s.mpLiked.filter((id) => id !== trackId)
          : [...s.mpLiked, trackId],
      }))
    }
  },

  // ── Simulate upload (dev / demo) ──
  simulateUpload: () => {
    const f = FAKE_FILES[fakeIdx % FAKE_FILES.length]
    fakeIdx++
    const id   = uid()
    const file: UploadFile = { id, name: f.n, size: f.s, progress: 0, done: false }
    set((s) => ({ uploadFiles: [...s.uploadFiles, file] }))
    let p = 0
    const t = setInterval(() => {
      p += Math.random() * 15 + 5
      if (p >= 100) {
        p = 100
        clearInterval(t)
        set((s) => ({ uploadFiles: s.uploadFiles.map((u) => u.id === id ? { ...u, progress: 100, done: true } : u) }))
      } else {
        set((s) => ({ uploadFiles: s.uploadFiles.map((u) => u.id === id ? { ...u, progress: Math.round(p) } : u) }))
      }
    }, 150)
  },

  removeUploadFile: (id) => set((s) => ({ uploadFiles: s.uploadFiles.filter((u) => u.id !== id) })),

  // After real upload finishes, reload albums + artists from DB
  refreshAfterUpload: async () => {
    await Promise.all([get().fetchAlbums(), get().fetchArtists(), get().fetchPlaylists()])
    get().showToast('Library updated!')
  },

  createPlaylist: async (name, description = '', trackIds = []) => {
    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    const normalizedTrackIds = [...new Set(trackIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))]

    if (!trimmedName) {
      get().showToast('Playlist name is required')
      return null
    }

    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify({ name: trimmedName, description: trimmedDescription, trackIds: normalizedTrackIds }),
      })
      const body = await res.json().catch(() => null)

      if (!res.ok) {
        const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'Failed to create playlist'
        get().showToast(message)
        return null
      }

      await get().fetchPlaylists()
      get().showToast(`Playlist "${trimmedName}" created`)
      return body && typeof body === 'object' && 'id' in body && typeof body.id === 'string'
        ? body.id
        : null
    } catch (error) {
      console.error('[createPlaylist]', error)
      get().showToast('Failed to create playlist')
      return null
    }
  },

  addTrackToPlaylist: async (playlistId, trackId) => {
    const ok = await mutatePlaylist({ playlistId, trackId, action: 'add' }, 'Failed to update playlist')
    if (!ok) return false

    const playlist = get().playlists.find((item) => item.id === playlistId)
    const track = get().albums.flatMap((album) => album.tracks).find((item) => item.id === trackId)
    get().showToast(
      playlist?.name && track?.name
        ? `"${track.name}" added to "${playlist.name}"`
        : 'Playlist updated',
    )
    return true
  },

  removeTrackFromPlaylist: async (playlistId, trackId) => {
    const ok = await mutatePlaylist({ playlistId, trackId, action: 'remove' }, 'Failed to update playlist')
    if (!ok) return false

    const playlist = get().playlists.find((item) => item.id === playlistId)
    const track = get().albums.flatMap((album) => album.tracks).find((item) => item.id === trackId)
    get().showToast(
      playlist?.name && track?.name
        ? `"${track.name}" removed from "${playlist.name}"`
        : 'Playlist updated',
    )
    return true
  },

  reorderPlaylistTracks: async (playlistId, orderedTrackIds) => {
    const ok = await mutatePlaylist({ playlistId, orderedTrackIds, action: 'reorder' }, 'Failed to reorder playlist')
    if (!ok) return false
    return true
  },

  deletePlaylist: async (playlistId) => {
    const playlist = get().playlists.find((item) => item.id === playlistId)

    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      })
      const body = await res.json().catch(() => null)

      if (!res.ok) {
        const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'Delete failed'
        get().showToast(message)
        return false
      }

      if (get().mpCurrentPlaylistId === playlistId) {
        set({ mpCurrentPlaylistId: null })
      }

      await get().fetchPlaylists()
      get().showToast(playlist?.name ? `Playlist "${playlist.name}" deleted` : 'Playlist deleted')
      return true
    } catch (error) {
      console.error('[deletePlaylist]', error)
      get().showToast('Delete failed')
      return false
    }
  },

  deleteAlbum: async (albumId) => {
    const album = get().albums.find((item) => item.id === albumId)
    const label = album?.name ? `Album "${album.name}" deleted` : 'Album deleted'
    return deleteMusicEntity(`/api/albums/${albumId}`, label)
  },

  deleteArtist: async (artistId) => {
    const artist = get().artists.find((item) => item.id === artistId)
    const label = artist?.name ? `Artist "${artist.name}" deleted` : 'Artist deleted'
    return deleteMusicEntity(`/api/artists/${artistId}`, label)
  },

  deleteTrack: async (trackId) => {
    const track = get().albums.flatMap((album) => album.tracks).find((item) => item.id === trackId)
    const label = track?.name ? `Track "${track.name}" deleted` : 'Track deleted'
    return deleteMusicEntity(`/api/tracks/${trackId}`, label)
  },

  updateAlbumCover: async (albumId, coverUrl) => {
    try {
      const res = await fetch(`/api/albums/${albumId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify({ cover: coverUrl }),
      })
      if (!res.ok) {
        get().showToast('Failed to update cover')
        return false
      }
      set((s) => ({
        albums: s.albums.map((a) => a.id === albumId ? { ...a, cover: coverUrl } : a),
      }))
      get().showToast('Cover updated')
      return true
    } catch (error) {
      console.error('[updateAlbumCover]', error)
      get().showToast('Failed to update cover')
      return false
    }
  },

  updateArtistImage: async (artistId, imageUrl) => {
    try {
      const res = await fetch(`/api/artists/${artistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify({ image: imageUrl }),
      })
      if (!res.ok) {
        get().showToast('Failed to update image')
        return false
      }
      set((s) => ({
        artists: s.artists.map((a) => a.id === artistId ? { ...a, image: imageUrl } : a),
      }))
      get().showToast('Artist image updated')
      return true
    } catch (error) {
      console.error('[updateArtistImage]', error)
      get().showToast('Failed to update image')
      return false
    }
  },
}
})

// ─── Wire AudioManager callbacks → store (runs once in browser) ──────────────
if (typeof window !== 'undefined') {
  audioManager.onProgress((pct, currentSec, totalSec) => {
    useAppStore.setState({ mpProgress: pct, mpCurrentSec: currentSec, mpTotalSec: totalSec })
  })

  audioManager.onEnded(() => {
    useAppStore.getState().mpNext()
  })

  audioManager.onError((msg) => {
    useAppStore.setState({ mpAudioError: msg, mpPlaying: false })
  })

  // Sync initial volume
  audioManager.setVolume(useAppStore.getState().mpVolume)
}
