'use client'

import { create } from 'zustand'
import type { AppPage, MpView } from '@/types'
import { supabase } from '@/lib/supabase'
import { audioManager } from '@/lib/audioManager'

interface User { name: string; email: string; initials: string }

interface UIState {
  page:    AppPage
  user:    User

  toastMsg:     string
  toastVisible: boolean

  uploadModalOpen: boolean

  mpView:              MpView
  mpCurrentAlbumId:    string | null
  mpCurrentArtistName: string | null
  mpCurrentPlaylistId: string | null

  // Actions
  setUser:      (u: User) => void
  goAuth:       () => void
  goHub:        () => void
  openMusicApp: () => void
  signOut:      () => Promise<void>

  showToast: (msg: string) => void

  openUploadModal:  () => void
  closeUploadModal: () => void

  mpSetView:       (v: MpView) => void
  mpOpenAlbum:     (id: string) => void
  mpOpenArtist:    (name: string) => void
  mpOpenPlaylist:  (id: string) => void
  mpBackToLibrary: () => void
}

export const useUIStore = create<UIState>((set) => ({
  page: 'auth',
  user: { name: '', email: '', initials: '' },

  toastMsg:     '',
  toastVisible: false,
  uploadModalOpen: false,

  mpView:              'library',
  mpCurrentAlbumId:    null,
  mpCurrentArtistName: null,
  mpCurrentPlaylistId: null,

  setUser: (u) => set({ user: u }),
  goAuth:  () => set({ page: 'auth' }),
  goHub:   () => set({ page: 'hub' }),

  openMusicApp: () => {
    set({ page: 'app', mpView: 'library', mpCurrentAlbumId: null, mpCurrentArtistName: null, mpCurrentPlaylistId: null })
  },

  signOut: async () => {
    audioManager.stop()
    await supabase.auth.signOut()
    set({ page: 'auth', mpView: 'library', mpCurrentAlbumId: null, mpCurrentArtistName: null, mpCurrentPlaylistId: null })
  },

  showToast: (msg) => {
    set({ toastMsg: msg, toastVisible: true })
    setTimeout(() => set({ toastVisible: false }), 2200)
  },

  openUploadModal:  () => set({ uploadModalOpen: true }),
  closeUploadModal: () => set({ uploadModalOpen: false }),

  mpSetView:       (v)    => set({ mpView: v, mpCurrentAlbumId: null, mpCurrentArtistName: null, mpCurrentPlaylistId: null }),
  mpOpenAlbum:     (id)   => set({ mpCurrentAlbumId: id, mpCurrentArtistName: null, mpCurrentPlaylistId: null }),
  mpOpenArtist:    (name) => set({ mpCurrentArtistName: name, mpCurrentAlbumId: null, mpCurrentPlaylistId: null }),
  mpOpenPlaylist:  (id)   => set({ mpCurrentPlaylistId: id, mpCurrentAlbumId: null, mpCurrentArtistName: null, mpView: 'playlists' }),
  mpBackToLibrary: ()     => set({ mpCurrentAlbumId: null, mpCurrentArtistName: null, mpCurrentPlaylistId: null }),
}))
