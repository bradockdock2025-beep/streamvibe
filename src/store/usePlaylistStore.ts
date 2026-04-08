'use client'

import { create } from 'zustand'
import type { Playlist } from '@/types'
import type { ApiPlaylist, ApiTrack } from '@/types'
import { adminHeaders } from '@/lib/utils'

// ─── Adapters ────────────────────────────────────────────────────────────────

function fmtTotalDur(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function apiTrackToStore(t: ApiTrack) {
  return {
    id: t.id, name: t.name, dur: t.dur || '0:00',
    durationSec: t.durationSec ?? 0, trackNumber: t.trackNumber ?? 0,
    fileUrl: t.fileUrl ?? '', fileSize: t.fileSize ?? 0,
    format: t.format ?? '', genre: t.genre ?? '',
    albumId: t.albumId, artistId: t.artistId,
  }
}

function apiPlaylistToStore(p: ApiPlaylist): Playlist {
  const tracks = [...p.tracks]
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      id: entry.id, order: entry.order,
      track: apiTrackToStore(entry.track),
      album:  { id: entry.track.album?.id ?? entry.track.albumId, name: entry.track.album?.name ?? '', cover: entry.track.album?.cover ?? '' },
      artist: { id: entry.track.artist?.id ?? entry.track.artistId, name: entry.track.artist?.name ?? '' },
    }))

  const totalSec = tracks.reduce((acc, e) => acc + (e.track.durationSec ?? 0), 0)
  const seen = new Set<string>()
  const covers: string[] = []
  for (const e of tracks) {
    const c = e.album.cover
    if (c && !seen.has(c)) { seen.add(c); covers.push(c) }
    if (covers.length === 4) break
  }
  return { id: p.id, name: p.name, description: p.description ?? '', createdAt: p.createdAt, covers, trackCount: tracks.length, totalDur: fmtTotalDur(totalSec), tracks }
}

interface PlaylistState {
  playlists:        Playlist[]
  playlistsLoading: boolean

  fetchPlaylists:         () => Promise<void>
  createPlaylist:         (name: string, description?: string, trackIds?: string[]) => Promise<string | null>
  addTrackToPlaylist:     (playlistId: string, trackId: string) => Promise<boolean>
  removeTrackFromPlaylist:(playlistId: string, trackId: string) => Promise<boolean>
  reorderPlaylistTracks:  (playlistId: string, orderedTrackIds: string[]) => Promise<boolean>
  deletePlaylist:         (playlistId: string) => Promise<boolean>
}

export const usePlaylistStore = create<PlaylistState>((set, get) => {
  async function mutate(payload: Record<string, unknown>, fallback: string) {
    try {
      const res  = await fetch('/api/playlists', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...adminHeaders() }, body: JSON.stringify(payload) })
      const body = await res.json().catch(() => null)
      if (!res.ok) { console.error('[playlist mutate]', body?.error ?? fallback); return false }
      await get().fetchPlaylists()
      return true
    } catch (e) { console.error('[playlist mutate]', e); return false }
  }

  return {
    playlists:        [],
    playlistsLoading: false,

    fetchPlaylists: async () => {
      set({ playlistsLoading: true })
      try {
        const res  = await fetch('/api/playlists', { headers: adminHeaders() })
        const body = await res.json()
        if (!res.ok) { console.error('[fetchPlaylists]', body); set({ playlistsLoading: false }); return }
        const data: ApiPlaylist[] = Array.isArray(body) ? body : []
        set({ playlists: data.map(apiPlaylistToStore), playlistsLoading: false })
      } catch (e) { console.error('[fetchPlaylists]', e); set({ playlistsLoading: false }) }
    },

    createPlaylist: async (name, description = '', trackIds = []) => {
      const trimmedName = name.trim()
      if (!trimmedName) return null
      try {
        const res  = await fetch('/api/playlists', { method: 'POST', headers: { 'Content-Type': 'application/json', ...adminHeaders() }, body: JSON.stringify({ name: trimmedName, description: description.trim(), trackIds }) })
        const body = await res.json().catch(() => null)
        if (!res.ok) return null
        await get().fetchPlaylists()
        return typeof body?.id === 'string' ? body.id : null
      } catch { return null }
    },

    addTrackToPlaylist:      (playlistId, trackId)         => mutate({ playlistId, trackId, action: 'add' },     'Failed to add track'),
    removeTrackFromPlaylist: (playlistId, trackId)         => mutate({ playlistId, trackId, action: 'remove' },  'Failed to remove track'),
    reorderPlaylistTracks:   (playlistId, orderedTrackIds) => mutate({ playlistId, orderedTrackIds, action: 'reorder' }, 'Failed to reorder'),

    deletePlaylist: async (playlistId) => {
      try {
        const res = await fetch(`/api/playlists/${playlistId}`, { method: 'DELETE', headers: adminHeaders() })
        if (!res.ok) return false
        set((s) => ({ playlists: s.playlists.filter((p) => p.id !== playlistId) }))
        return true
      } catch { return false }
    },
  }
})
