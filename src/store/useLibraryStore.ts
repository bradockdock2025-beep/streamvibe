'use client'

import { create } from 'zustand'
import type { Album, Artist, UploadFile } from '@/types'
import type { ApiAlbum, ApiArtist } from '@/types'
import { adminHeaders, uid } from '@/lib/utils'

// ─── Adapters ────────────────────────────────────────────────────────────────

function apiAlbumToStore(a: ApiAlbum): Album {
  return {
    id:       a.id,
    name:     a.name,
    artistId: a.artistId,
    artist:   a.artist?.name ?? '',
    cover:    a.cover,
    year:     a.year,
    genre:    a.genre,
    tracks:   a.tracks.map((t) => ({
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
    })),
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

const FAKE_FILES = [
  { n: 'Saturday Nights.mp3', s: '4.2 MB' },
  { n: 'Bad Luck (Khalid).mp3', s: '3.8 MB' },
  { n: 'Circles - Mac Miller.flac', s: '18.4 MB' },
]
let fakeIdx = 0

interface LibraryState {
  albums:        Album[]
  artists:       Artist[]
  mpLiked:       string[]
  uploadFiles:   UploadFile[]
  albumsLoading:  boolean
  artistsLoading: boolean

  fetchAlbums:  () => Promise<void>
  fetchArtists: () => Promise<void>
  fetchLikes:   () => Promise<void>

  mpToggleLike:       (trackId: string) => Promise<void>
  simulateUpload:     () => void
  removeUploadFile:   (id: string) => void
  refreshAfterUpload: () => Promise<void>

  updateAlbumCover:  (albumId: string, coverUrl: string) => Promise<boolean>
  updateArtistImage: (artistId: string, imageUrl: string) => Promise<boolean>
  deleteAlbum:       (albumId: string) => Promise<boolean>
  deleteArtist:      (artistId: string) => Promise<boolean>
  deleteTrack:       (trackId: string) => Promise<boolean>
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  albums:        [],
  artists:       [],
  mpLiked:       [],
  uploadFiles:   [],
  albumsLoading:  false,
  artistsLoading: false,

  fetchAlbums: async () => {
    set({ albumsLoading: true })
    try {
      const res  = await fetch('/api/albums?limit=100')
      const body = await res.json()
      if (!res.ok) { console.error('[fetchAlbums]', body); set({ albumsLoading: false }); return }
      const data: ApiAlbum[] = Array.isArray(body) ? body : (body?.albums ?? [])
      set({ albums: data.map(apiAlbumToStore), albumsLoading: false })
    } catch (e) {
      console.error('[fetchAlbums]', e)
      set({ albumsLoading: false })
    }
  },

  fetchArtists: async () => {
    set({ artistsLoading: true })
    try {
      const res  = await fetch('/api/artists?limit=100')
      const body = await res.json()
      if (!res.ok) { console.error('[fetchArtists]', body); set({ artistsLoading: false }); return }
      const data: ApiArtist[] = Array.isArray(body) ? body : (body?.artists ?? [])
      set({ artists: data.map(apiArtistToStore), artistsLoading: false })
    } catch (e) {
      console.error('[fetchArtists]', e)
      set({ artistsLoading: false })
    }
  },

  fetchLikes: async () => {
    try {
      const res  = await fetch('/api/likes', { headers: adminHeaders() })
      const body = await res.json()
      if (!res.ok) { console.error('[fetchLikes]', body); return }
      set({ mpLiked: Array.isArray(body) ? body : [] })
    } catch (e) {
      console.error('[fetchLikes]', e)
    }
  },

  mpToggleLike: async (trackId) => {
    set((s) => ({
      mpLiked: s.mpLiked.includes(trackId)
        ? s.mpLiked.filter((id) => id !== trackId)
        : [...s.mpLiked, trackId],
    }))
    try {
      await fetch('/api/likes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body:    JSON.stringify({ trackId }),
      })
    } catch {
      set((s) => ({
        mpLiked: s.mpLiked.includes(trackId)
          ? s.mpLiked.filter((id) => id !== trackId)
          : [...s.mpLiked, trackId],
      }))
    }
  },

  simulateUpload: () => {
    const f = FAKE_FILES[fakeIdx % FAKE_FILES.length]
    fakeIdx++
    const id = uid()
    const file: UploadFile = { id, name: f.n, size: f.s, progress: 0, done: false }
    set((s) => ({ uploadFiles: [...s.uploadFiles, file] }))
    let p = 0
    const t = setInterval(() => {
      p += Math.random() * 15 + 5
      if (p >= 100) {
        clearInterval(t)
        set((s) => ({ uploadFiles: s.uploadFiles.map((u) => u.id === id ? { ...u, progress: 100, done: true } : u) }))
      } else {
        set((s) => ({ uploadFiles: s.uploadFiles.map((u) => u.id === id ? { ...u, progress: Math.round(p) } : u) }))
      }
    }, 150)
  },

  removeUploadFile: (id) => set((s) => ({ uploadFiles: s.uploadFiles.filter((u) => u.id !== id) })),

  refreshAfterUpload: async () => {
    await Promise.all([get().fetchAlbums(), get().fetchArtists()])
  },

  updateAlbumCover: async (albumId, coverUrl) => {
    try {
      const res = await fetch(`/api/albums/${albumId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body:    JSON.stringify({ cover: coverUrl }),
      })
      if (!res.ok) return false
      set((s) => ({ albums: s.albums.map((a) => a.id === albumId ? { ...a, cover: coverUrl } : a) }))
      return true
    } catch { return false }
  },

  updateArtistImage: async (artistId, imageUrl) => {
    try {
      const res = await fetch(`/api/artists/${artistId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body:    JSON.stringify({ image: imageUrl }),
      })
      if (!res.ok) return false
      set((s) => ({ artists: s.artists.map((a) => a.id === artistId ? { ...a, image: imageUrl } : a) }))
      return true
    } catch { return false }
  },

  deleteAlbum: async (albumId) => {
    try {
      const res = await fetch(`/api/albums/${albumId}`, { method: 'DELETE', headers: adminHeaders() })
      if (!res.ok) return false
      set((s) => ({ albums: s.albums.filter((a) => a.id !== albumId) }))
      return true
    } catch { return false }
  },

  deleteArtist: async (artistId) => {
    try {
      const res = await fetch(`/api/artists/${artistId}`, { method: 'DELETE', headers: adminHeaders() })
      if (!res.ok) return false
      set((s) => ({
        albums:  s.albums.filter((a) => a.artistId !== artistId),
        artists: s.artists.filter((a) => a.id !== artistId),
      }))
      return true
    } catch { return false }
  },

  deleteTrack: async (trackId) => {
    try {
      const res = await fetch(`/api/tracks/${trackId}`, { method: 'DELETE', headers: adminHeaders() })
      if (!res.ok) return false
      set((s) => ({
        albums: s.albums.map((a) => ({ ...a, tracks: a.tracks.filter((t) => t.id !== trackId) })),
      }))
      return true
    } catch { return false }
  },
}))
