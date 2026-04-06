'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import AlbumCard from './AlbumCard'
import ArtistCard from './ArtistCard'
import TrackItem from './TrackItem'
import HorizontalCarousel from './HorizontalCarousel'
import PlaylistCard from './PlaylistCard'
import UploadView from './UploadView'
import DeleteButton from './DeleteButton'
import DeleteConfirmModal from './DeleteConfirmModal'
import CreatePlaylistModal from './CreatePlaylistModal'
import PlaylistDetailView from './PlaylistDetailView'
import TrackPlaylistModal from './TrackPlaylistModal'
import TrackActionsMenu from './TrackActionsMenu'
import { adminHeaders } from '@/lib/utils'
import type { DeleteDialogState } from './DeleteConfirmModal'
import type { Album, Artist } from '@/types'

// ─── Router ───────────────────────────────────────────────────────────────────
export default function MusicModule() {
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [createDialog, setCreateDialog] = useState<{ key: number; initialTrackIds: string[] } | null>(null)
  const [createBusy, setCreateBusy] = useState(false)
  const [playlistPicker, setPlaylistPicker] = useState<{ id: string; name: string; artistName: string } | null>(null)
  const [playlistPickerBusyId, setPlaylistPickerBusyId] = useState<string | null>(null)
  const {
    mpView,
    mpCurrentAlbumId,
    mpCurrentArtistName,
    mpCurrentPlaylistId,
    albums,
    playlists,
    createPlaylist,
    mpOpenPlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
  } = useAppStore(useShallow((s) => ({
    mpView: s.mpView,
    mpCurrentAlbumId: s.mpCurrentAlbumId,
    mpCurrentArtistName: s.mpCurrentArtistName,
    mpCurrentPlaylistId: s.mpCurrentPlaylistId,
    albums: s.albums,
    playlists: s.playlists,
    createPlaylist: s.createPlaylist,
    mpOpenPlaylist: s.mpOpenPlaylist,
    addTrackToPlaylist: s.addTrackToPlaylist,
    removeTrackFromPlaylist: s.removeTrackFromPlaylist,
  })))

  const playlistTrackOptions = albums
    .flatMap((album) => album.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      dur: track.dur,
      albumName: album.name,
      albumCover: album.cover,
      artistName: album.artist,
    })))
    .sort((a, b) =>
      a.artistName.localeCompare(b.artistName) ||
      a.albumName.localeCompare(b.albumName) ||
      a.name.localeCompare(b.name),
    )

  async function confirmDeleteDialog() {
    if (!deleteDialog || deleteBusy) return
    setDeleteBusy(true)
    try {
      const ok = await deleteDialog.onConfirm()
      if (ok) setDeleteDialog(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  function closeDeleteDialog() {
    if (!deleteBusy) setDeleteDialog(null)
  }

  function openCreatePlaylist(initialTrackIds: string[] = []) {
    setCreateDialog({ key: Date.now(), initialTrackIds })
  }

  async function handleCreatePlaylist(name: string, description: string, trackIds: string[]) {
    if (createBusy) return
    setCreateBusy(true)
    try {
      const playlistId = await createPlaylist(name, description, trackIds)
      if (playlistId) {
        mpOpenPlaylist(playlistId)
        setCreateDialog(null)
      }
    } finally {
      setCreateBusy(false)
    }
  }

  async function handleTrackPlaylistToggle(playlistId: string, shouldAdd: boolean) {
    if (!playlistPicker || playlistPickerBusyId) return

    setPlaylistPickerBusyId(playlistId)
    try {
      if (shouldAdd) {
        await addTrackToPlaylist(playlistId, playlistPicker.id)
      } else {
        await removeTrackFromPlaylist(playlistId, playlistPicker.id)
      }
    } finally {
      setPlaylistPickerBusyId(null)
    }
  }

  const content = mpCurrentArtistName
    ? <ArtistDetailView artistName={mpCurrentArtistName} onRequestDelete={setDeleteDialog} onOpenTrackPlaylist={setPlaylistPicker} />
    : mpCurrentPlaylistId
    ? <PlaylistDetailView playlistId={mpCurrentPlaylistId} onRequestDelete={setDeleteDialog} onOpenTrackPlaylist={setPlaylistPicker} />
    : mpCurrentAlbumId
    ? <AlbumDetailView albumId={mpCurrentAlbumId} onRequestDelete={setDeleteDialog} onOpenTrackPlaylist={setPlaylistPicker} />
    : (
      <AnimatePresence mode="wait">
        {mpView === 'playlists' && <PlaylistsView key="playlists" onOpenCreatePlaylist={openCreatePlaylist} />}
        {mpView === 'artists'   && <ArtistsView key="artists" onRequestDelete={setDeleteDialog} />}
        {mpView === 'songs'     && <SongsView key="songs" onRequestDelete={setDeleteDialog} onOpenTrackPlaylist={setPlaylistPicker} />}
        {mpView === 'upload'    && <UploadView key="upload" />}
        {(mpView === 'library' || mpView === 'radio' || mpView === 'popular') &&
          <LibraryView key="library" onRequestDelete={setDeleteDialog} />}
      </AnimatePresence>
    )

  return (
    <>
      {content}
      <DeleteConfirmModal
        dialog={deleteDialog}
        busy={deleteBusy}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteDialog}
      />
      {createDialog && (
        <CreatePlaylistModal
          key={createDialog.key}
          open
          busy={createBusy}
          tracks={playlistTrackOptions}
          initialTrackIds={createDialog.initialTrackIds}
          onClose={() => {
            if (!createBusy) setCreateDialog(null)
          }}
          onCreate={handleCreatePlaylist}
        />
      )}
      <TrackPlaylistModal
        open={!!playlistPicker}
        busyPlaylistId={playlistPickerBusyId}
        track={playlistPicker}
        playlists={playlists}
        onClose={() => {
          if (!playlistPickerBusyId) setPlaylistPicker(null)
        }}
        onCreateNew={() => {
          if (!playlistPicker) return
          setPlaylistPicker(null)
          openCreatePlaylist([playlistPicker.id])
        }}
        onTogglePlaylist={handleTrackPlaylistToggle}
      />
    </>
  )
}

function albumDeleteDialog(album: Album, deleteAlbum: (albumId: string) => Promise<boolean>): DeleteDialogState {
  return {
    title: `Delete "${album.name}"?`,
    message: 'This removal is permanent and will delete the album record and its associated audio assets.',
    consequences: [
      `${album.tracks.length} track${album.tracks.length === 1 ? '' : 's'} in this album will be deleted.`,
      'Album cover art will be removed from storage.',
      'If this was the artist’s only remaining content, the artist record will also be removed.',
    ],
    confirmLabel: 'Delete Album',
    onConfirm: () => deleteAlbum(album.id),
  }
}

function artistDeleteDialog(artist: Artist, deleteArtist: (artistId: string) => Promise<boolean>): DeleteDialogState {
  return {
    title: `Delete artist "${artist.name}"?`,
    message: 'This is a cascade delete. The artist and every linked music asset will be removed together.',
    consequences: [
      `${artist.albumCount} album${artist.albumCount === 1 ? '' : 's'} linked to this artist will be deleted.`,
      `${artist.trackCount} track${artist.trackCount === 1 ? '' : 's'} linked to this artist will be deleted.`,
      'Artist image, album covers and audio files linked to this artist will be removed from storage.',
    ],
    confirmLabel: 'Delete Artist',
    onConfirm: () => deleteArtist(artist.id),
  }
}

function trackDeleteDialog(
  track: { id: string; name: string },
  album: Album,
  deleteTrack: (trackId: string) => Promise<boolean>,
): DeleteDialogState {
  const lastTrack = album.tracks.length === 1
  return {
    title: `Delete track "${track.name}"?`,
    message: lastTrack
      ? 'This is the last track in the album, so the album container will also be removed.'
      : `The track will be removed from "${album.name}" and from playback/library views.`,
    consequences: [
      'The audio file for this track will be removed from storage.',
      lastTrack
        ? 'Because no tracks will remain, the album and its cover will also be deleted.'
        : 'The album will stay available with its remaining tracks.',
      'If this deletion leaves the artist without albums or tracks, the artist record will also be removed.',
    ],
    confirmLabel: 'Delete Track',
    onConfirm: () => deleteTrack(track.id),
  }
}

// ─── 1. Library — Albums home ─────────────────────────────────────────────────
function LibraryView({ onRequestDelete }: { onRequestDelete: (dialog: DeleteDialogState) => void }) {
  const { albums, albumsLoading, deleteAlbum } = useAppStore(useShallow((s) => ({
    albums:        s.albums,
    albumsLoading: s.albumsLoading,
    deleteAlbum:   s.deleteAlbum,
  })))

  // Split albums into sections using real data
  const recent   = [...albums].slice(0, 8)
  const byGenre  = albums.filter((a) => a.genre === 'R&B').slice(0, 8)
  const allAlbums = [...albums].reverse().slice(0, 12)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{ flex: 1, overflowY: 'auto', padding: '36px 32px 32px' }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 32, letterSpacing: '-.6px' }}>
        Albums
        {albumsLoading && <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,.3)', marginLeft: 12 }}>Loading…</span>}
      </h1>

      {albums.length === 0 && !albumsLoading && (
        <div style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(255,255,255,.25)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
          <p style={{ fontSize: 15, fontWeight: 500 }}>No albums yet</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Upload music to get started</p>
        </div>
      )}

      {recent.length > 0 && (
        <HorizontalCarousel title="Recently Added" onSeeMore={() => {}}>
          {recent.map((a) => (
            <AlbumCard
              key={a.id}
              album={a}
              size={158}
              onDelete={() => {
                onRequestDelete(albumDeleteDialog(a, deleteAlbum))
              }}
            />
          ))}
        </HorizontalCarousel>
      )}

      {byGenre.length > 0 && (
        <HorizontalCarousel title="R&B" onSeeMore={() => {}}>
          {byGenre.map((a) => (
            <AlbumCard
              key={a.id}
              album={a}
              size={158}
              onDelete={() => {
                onRequestDelete(albumDeleteDialog(a, deleteAlbum))
              }}
            />
          ))}
        </HorizontalCarousel>
      )}

      {allAlbums.length > 0 && (
        <HorizontalCarousel title="All Albums" onSeeMore={() => {}}>
          {allAlbums.map((a) => (
            <AlbumCard
              key={a.id}
              album={a}
              size={158}
              onDelete={() => {
                onRequestDelete(albumDeleteDialog(a, deleteAlbum))
              }}
            />
          ))}
        </HorizontalCarousel>
      )}
    </motion.div>
  )
}

// ─── 2. Playlists view ────────────────────────────────────────────────────────
function PlaylistsView({ onOpenCreatePlaylist }: { onOpenCreatePlaylist: (initialTrackIds?: string[]) => void }) {
  const { playlists, playlistsLoading, mpOpenPlaylist } = useAppStore(useShallow((s) => ({
    playlists:        s.playlists,
    playlistsLoading: s.playlistsLoading,
    mpOpenPlaylist:   s.mpOpenPlaylist,
  })))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{ flex: 1, overflowY: 'auto', padding: '36px 32px 32px' }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-.6px' }}>
        Playlists
        {playlistsLoading && <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,.3)', marginLeft: 12 }}>Loading…</span>}
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 32 }}>Ordered collections of tracks already in your library</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 28 }}>
        {playlists.map((pl) => (
          <PlaylistCard key={pl.id} playlist={pl} onClick={() => mpOpenPlaylist(pl.id)} />
        ))}
        <CreatePlaylistCard onClick={() => onOpenCreatePlaylist()} />
      </div>
    </motion.div>
  )
}

function CreatePlaylistCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}
    >
      <div style={{
        width: '100%', aspectRatio: '1', borderRadius: 8,
        border: '1.5px dashed rgba(255,255,255,.15)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, marginBottom: 12, transition: 'border-color .15s, background .15s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1db954'; e.currentTarget.style.background = 'rgba(29,185,84,.06)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)'; e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', fontWeight: 500 }}>New Playlist</span>
      </div>
    </motion.button>
  )
}

// ─── 3. Artists view ──────────────────────────────────────────────────────────
function ArtistsView({ onRequestDelete }: { onRequestDelete: (dialog: DeleteDialogState) => void }) {
  const { artists, artistsLoading, mpOpenArtist, deleteArtist } = useAppStore(useShallow((s) => ({
    artists:        s.artists,
    artistsLoading: s.artistsLoading,
    mpOpenArtist:   s.mpOpenArtist,
    deleteArtist:   s.deleteArtist,
  })))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{ flex: 1, overflowY: 'auto', padding: '36px 32px 32px' }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-.6px' }}>
        Artists
        {artistsLoading && <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,.3)', marginLeft: 12 }}>Loading…</span>}
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 32 }}>{artists.length} artists in your library</p>

      {artists.length === 0 && !artistsLoading && (
        <div style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(255,255,255,.25)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎤</div>
          <p style={{ fontSize: 15, fontWeight: 500 }}>No artists yet</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Artists are created automatically when you upload music</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 24 }}>
        {artists.map((artist) => (
          <div key={artist.id}>
            <ArtistCard
              artist={artist}
              width={160}
              onClick={() => mpOpenArtist(artist.name)}
              onDelete={() => {
                onRequestDelete(artistDeleteDialog(artist, deleteArtist))
              }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,.45)', textAlign: 'center' }}>
              {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── 4. Songs view ────────────────────────────────────────────────────────────
function SongsView({
  onRequestDelete,
  onOpenTrackPlaylist,
}: {
  onRequestDelete: (dialog: DeleteDialogState) => void
  onOpenTrackPlaylist: (track: { id: string; name: string; artistName: string }) => void
}) {
  const { albums, mpLiked, mpToggleLike, mpPlayTrack, mpPlaying, mpCurrentTrackId, deleteTrack, mpOpenAlbum, mpOpenArtist } = useAppStore(useShallow((s) => ({
    albums: s.albums,
    mpLiked: s.mpLiked,
    mpToggleLike: s.mpToggleLike,
    mpPlayTrack: s.mpPlayTrack,
    mpPlaying: s.mpPlaying,
    mpCurrentTrackId: s.mpCurrentTrackId,
    deleteTrack: s.deleteTrack,
    mpOpenAlbum: s.mpOpenAlbum,
    mpOpenArtist: s.mpOpenArtist,
  })))

  const [sort, setSort] = useState<'recent' | 'az'>('recent')
  const [search, setSearch] = useState('')

  // Flatten all tracks with metadata
  const allSongs = albums.flatMap((album) =>
    album.tracks.map((track, idx) => ({ track, album, idx }))
  )

  const filtered = allSongs
    .filter(({ track, album }) =>
      !search || track.name.toLowerCase().includes(search.toLowerCase()) ||
      album.artist.toLowerCase().includes(search.toLowerCase()) ||
      album.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => sort === 'az' ? a.track.name.localeCompare(b.track.name) : 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Header */}
      <div style={{ padding: '36px 32px 0', flexShrink: 0 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 20, letterSpacing: '-.6px' }}>Songs</h1>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '7px 13px', flex: 1, maxWidth: 300, transition: 'border-color .15s' }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.3)')}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search songs..."
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#fff', width: '100%', fontFamily: 'inherit' }}
            />
          </div>

          {/* Sort buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['recent', 'az'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                style={{
                  background: sort === s ? 'rgba(29,185,84,.18)' : 'rgba(255,255,255,.07)',
                  border: sort === s ? '1px solid rgba(29,185,84,.4)' : '1px solid rgba(255,255,255,.1)',
                  color: sort === s ? '#1db954' : 'rgba(255,255,255,.55)',
                  borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .15s',
                }}
              >
                {s === 'recent' ? 'Recent' : 'A–Z'}
              </button>
            ))}
          </div>

          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.28)', marginLeft: 4 }}>
            {filtered.length} songs
          </span>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 60px 44px', gap: '0 12px', padding: '0 8px 10px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', textAlign: 'center' }}>#</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', letterSpacing: '.4px', textTransform: 'uppercase' }}>Title</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', letterSpacing: '.4px', textTransform: 'uppercase' }}>Album</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', textAlign: 'right', letterSpacing: '.4px', textTransform: 'uppercase' }}>Time</span>
          <span />
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 32px 32px' }}>
        {filtered.map(({ track, album, idx }, i) => {
          const isPlaying = mpPlaying && mpCurrentTrackId === track.id
          const isLiked = mpLiked.includes(track.id)
          return (
            <div
              key={track.id}
              onClick={() => mpPlayTrack(album.id, idx)}
              style={{
                display: 'grid', gridTemplateColumns: '32px 1fr 1fr 60px 44px', gap: '0 12px',
                padding: '7px 8px', borderRadius: 6, cursor: 'pointer',
                background: isPlaying ? 'rgba(29,185,84,.08)' : 'transparent',
                transition: 'background .12s', alignItems: 'center',
              }}
              onMouseEnter={(e) => !isPlaying && (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
              onMouseLeave={(e) => !isPlaying && (e.currentTarget.style.background = 'transparent')}
            >
              {/* Index / playing */}
              <span style={{ fontSize: 12, color: isPlaying ? '#1db954' : 'rgba(255,255,255,.3)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {isPlaying
                  ? <svg width="11" height="11" viewBox="0 0 24 24" fill="#1db954"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  : i + 1}
              </span>

              {/* Title + Artist */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: isPlaying ? '#1db954' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {track.name}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {album.artist}
                </div>
              </div>

              {/* Album */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: '#252530', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {album.cover
                    ? /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={album.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    : <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.2)' }}>{album.name.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.name}</span>
              </div>

              {/* Duration */}
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {track.dur}
              </span>

              {/* More */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <TrackActionsMenu
                  liked={isLiked}
                  onToggleLike={() => mpToggleLike(track.id)}
                  onAddToPlaylist={() => onOpenTrackPlaylist({ id: track.id, name: track.name, artistName: album.artist })}
                  onGoToAlbum={() => mpOpenAlbum(album.id)}
                  onGoToArtist={() => mpOpenArtist(album.artist)}
                  onDelete={() => {
                    onRequestDelete(trackDeleteDialog(track, album, deleteTrack))
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── 5. Album detail view ─────────────────────────────────────────────────────
function AlbumDetailView({
  albumId,
  onRequestDelete,
  onOpenTrackPlaylist,
}: {
  albumId: string
  onRequestDelete: (dialog: DeleteDialogState) => void
  onOpenTrackPlaylist: (track: { id: string; name: string; artistName: string }) => void
}) {
  const { albums, mpPlayAlbum, mpOpenArtist, mpLiked, mpToggleLike, deleteAlbum, deleteTrack, updateAlbumCover } = useAppStore(useShallow((s) => ({
    albums: s.albums,
    mpPlayAlbum: s.mpPlayAlbum,
    mpOpenArtist: s.mpOpenArtist,
    mpLiked: s.mpLiked,
    mpToggleLike: s.mpToggleLike,
    deleteAlbum: s.deleteAlbum,
    deleteTrack: s.deleteTrack,
    updateAlbumCover: s.updateAlbumCover,
  })))

  const [coverHover, setCoverHover] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  async function handleCoverChange(file: File) {
    if (coverUploading) return
    setCoverUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { ...adminHeaders() },
        body: form,
      })
      const body = await res.json()
      if (!res.ok || !body.url) return
      await updateAlbumCover(album!.id, body.url)
    } finally {
      setCoverUploading(false)
    }
  }

  const album = albums.find((a) => a.id === albumId)
  if (!album) return null

  const totalSecs = album.tracks.reduce((sum, t) => {
    const [m, s] = t.dur.split(':').map(Number)
    return sum + m * 60 + s
  }, 0)
  const totalMin = Math.floor(totalSecs / 60)
  const totalDur = totalMin >= 60
    ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`
    : `${totalMin}m`

  return (
    <motion.div
      key={albumId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{ flex: 1, overflowY: 'auto' }}
    >
      {/* ── Album header with blurred bg ── */}
      <div style={{ position: 'relative', padding: '40px 32px 28px', overflow: 'hidden' }}>
        {/* Blurred background */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
          {album.cover && /* eslint-disable-next-line @next/next/no-img-element */
            <img src={album.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(60px) brightness(.35) saturate(1.5)', transform: 'scale(1.15)' }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(26,26,31,.5) 0%, #1a1a1f 100%)' }} />
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 28, alignItems: 'flex-end' }}>
          {/* Cover — click to replace */}
          <div
            style={{ position: 'relative', width: 200, height: 200, borderRadius: 8, overflow: 'hidden', flexShrink: 0, boxShadow: '0 16px 48px rgba(0,0,0,.6)', background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onMouseEnter={() => setCoverHover(true)}
            onMouseLeave={() => setCoverHover(false)}
            onClick={() => coverInputRef.current?.click()}
          >
            {album.cover
              ? /* eslint-disable-next-line @next/next/no-img-element */
                <img src={album.cover} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <span style={{ fontSize: 64, fontWeight: 800, color: 'rgba(255,255,255,.15)' }}>{album.name.charAt(0).toUpperCase()}</span>
            }
            {/* Hover / uploading overlay */}
            {(coverHover || coverUploading) && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {coverUploading
                  ? <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  : <>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                      <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>Change Cover</span>
                    </>
                }
              </div>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverChange(f); e.target.value = '' }}
            />
          </div>

          {/* Meta */}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.55)', letterSpacing: '.6px', textTransform: 'uppercase', marginBottom: 8 }}>Album</div>
            <h1 style={{ fontSize: 38, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 14 }}>{album.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
              <button
                onClick={() => mpOpenArtist(album.artist)}
                style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', transition: 'color .15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1db954')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#fff')}
              >
                {album.artist}
              </button>
              <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 14 }}>·</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{album.year}</span>
              <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 14 }}>·</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{album.tracks.length} songs</span>
              <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 14 }}>·</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{totalDur}</span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => mpPlayAlbum(album.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1db954', color: '#fff', border: 'none', borderRadius: 24, padding: '10px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .1s, opacity .15s', letterSpacing: '.3px' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Play
              </button>
              <button
                style={{ background: 'none', border: '1.5px solid rgba(255,255,255,.25)', color: 'rgba(255,255,255,.75)', borderRadius: 24, padding: '9px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color .15s, color .15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.25)'; e.currentTarget.style.color = 'rgba(255,255,255,.75)' }}
              >
                + Follow
              </button>
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: '1.5px solid rgba(255,255,255,.25)', color: 'rgba(255,255,255,.75)', borderRadius: 24, padding: '9px 18px', fontSize: 13, cursor: coverUploading ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'border-color .15s, color .15s', opacity: coverUploading ? .6 : 1 }}
                onMouseEnter={(e) => { if (!coverUploading) { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.25)'; e.currentTarget.style.color = 'rgba(255,255,255,.75)' }}
              >
                {coverUploading
                  ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                }
                {coverUploading ? 'Uploading…' : 'Change Cover'}
              </button>
              <DeleteButton
                variant="pill"
                label="Delete Album"
                title={`Delete album ${album.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onRequestDelete(albumDeleteDialog(album, deleteAlbum))
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Track list ── */}
      <div style={{ padding: '0 32px 40px', background: '#1a1a1f' }}>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 32px 60px 40px', gap: '0 12px', padding: '0 8px 10px', borderBottom: '1px solid rgba(255,255,255,.07)', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', textAlign: 'center' }}>#</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Title</span>
          <span />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '.4px' }}>Time</span>
          <span />
        </div>

        {album.tracks.map((track, i) => (
          <AlbumTrackRow
            key={track.id}
            track={track}
            index={i}
            album={album}
            liked={mpLiked.includes(track.id)}
            onLike={() => mpToggleLike(track.id)}
            onAddToPlaylist={() => onOpenTrackPlaylist({ id: track.id, name: track.name, artistName: album.artist })}
            onGoToArtist={() => mpOpenArtist(album.artist)}
            onDelete={() => {
              onRequestDelete(trackDeleteDialog(track, album, deleteTrack))
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}

function AlbumTrackRow({ track, index, album, liked, onLike, onAddToPlaylist, onGoToArtist, onDelete }: {
  track: { id: string; name: string; dur: string }
  index: number
  album: Album
  liked: boolean
  onLike: () => void
  onAddToPlaylist: () => void
  onGoToArtist: () => void
  onDelete: () => void | Promise<void>
}) {
  const { mpPlayTrack, mpPlaying, mpCurrentTrackId } = useAppStore(useShallow((s) => ({
    mpPlayTrack: s.mpPlayTrack,
    mpPlaying: s.mpPlaying,
    mpCurrentTrackId: s.mpCurrentTrackId,
  })))

  const isPlaying = mpPlaying && mpCurrentTrackId === track.id

  return (
    <div
      onClick={() => mpPlayTrack(album.id, index)}
      style={{
        display: 'grid', gridTemplateColumns: '32px 1fr 32px 60px 40px', gap: '0 12px',
        padding: '8px 8px', borderRadius: 6, cursor: 'pointer', alignItems: 'center',
        background: isPlaying ? 'rgba(29,185,84,.07)' : 'transparent',
        transition: 'background .12s',
      }}
      onMouseEnter={(e) => !isPlaying && (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
      onMouseLeave={(e) => !isPlaying && (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontSize: 13, color: isPlaying ? '#1db954' : 'rgba(255,255,255,.3)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
        {isPlaying
          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="#1db954"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          : index + 1}
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: isPlaying ? '#1db954' : '#fff' }}>{track.name}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>{album.artist}</div>
      </div>
      <span />
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{track.dur}</span>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <TrackActionsMenu
          liked={liked}
          onToggleLike={onLike}
          onAddToPlaylist={onAddToPlaylist}
          onGoToArtist={onGoToArtist}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}

// ─── 6. Artist detail view ────────────────────────────────────────────────────
function ArtistDetailView({
  artistName,
  onRequestDelete,
  onOpenTrackPlaylist,
}: {
  artistName: string
  onRequestDelete: (dialog: DeleteDialogState) => void
  onOpenTrackPlaylist: (track: { id: string; name: string; artistName: string }) => void
}) {
  const { albums, artists, mpOpenAlbum, deleteArtist, deleteTrack, mpToggleLike, mpLiked, updateArtistImage } = useAppStore(useShallow((s) => ({
    albums:      s.albums,
    artists:     s.artists,
    mpOpenAlbum: s.mpOpenAlbum,
    deleteArtist: s.deleteArtist,
    deleteTrack: s.deleteTrack,
    mpToggleLike: s.mpToggleLike,
    mpLiked: s.mpLiked,
    updateArtistImage: s.updateArtistImage,
  })))

  const [activeTab, setActiveTab] = useState(0)
  const [heroHover, setHeroHover] = useState(false)
  const [heroUploading, setHeroUploading] = useState(false)
  const heroInputRef = useRef<HTMLInputElement>(null)

  async function handleHeroChange(file: File) {
    if (heroUploading) return
    const artist = artists.find((a) => a.name === artistName)
    if (!artist) return
    setHeroUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { ...adminHeaders() },
        body: form,
      })
      const body = await res.json()
      if (!res.ok || !body.url) return
      await updateArtistImage(artist.id, body.url)
    } finally {
      setHeroUploading(false)
    }
  }
  const tabs = ['Overview', 'Latest', 'Related', 'About']

  const artistAlbums  = albums.filter((a) => a.artist === artistName)
  const artistData    = artists.find((a) => a.name === artistName)
  const heroImage     = artistData?.image || artistAlbums[0]?.cover || ''

  // Popular tracks = first 5 from all albums of this artist
  const popularTracks = artistAlbums.flatMap((al) => al.tracks.map((t, i) => ({ track: t, album: al, idx: i }))).slice(0, 5)

  const relatedArtists: Artist[] = artists.filter((a) => a.name !== artistName).slice(0, 3)

  return (
    <motion.div
      key={artistName}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{ flex: 1, overflowY: 'auto' }}
    >
      {/* ── Hero ── */}
      <div
        style={{ position: 'relative', height: 300, overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(160deg, #2e2840 0%, #1a1a2e 100%)', cursor: 'pointer' }}
        onMouseEnter={() => setHeroHover(true)}
        onMouseLeave={() => setHeroHover(false)}
        onClick={() => heroInputRef.current?.click()}
      >
        {heroImage && /* eslint-disable-next-line @next/next/no-img-element */
          <img src={heroImage} alt={artistName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.1) 0%, rgba(0,0,0,.5) 60%, #1a1a1f 100%)' }} />
        {/* Camera overlay */}
        {(heroHover || heroUploading) && (
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2, background: 'rgba(0,0,0,.55)', borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {heroUploading
              ? <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
            }
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{heroUploading ? 'Uploading…' : 'Change Photo'}</span>
          </div>
        )}
        <input
          ref={heroInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeroChange(f); e.target.value = '' }}
        />

        {/* Artist name */}
        <div style={{ position: 'absolute', bottom: 22, left: 28 }}>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1, textShadow: '0 2px 20px rgba(0,0,0,.6)' }}>
            {artistName}
          </h1>
          {artistData && (
            <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={(e) => { e.stopPropagation(); heroInputRef.current?.click() }}
                disabled={heroUploading}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,.45)', border: '1.5px solid rgba(255,255,255,.35)', color: '#fff', borderRadius: 24, padding: '7px 16px', fontSize: 13, cursor: heroUploading ? 'default' : 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(6px)', opacity: heroUploading ? .7 : 1 }}
              >
                {heroUploading
                  ? <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                }
                {heroUploading ? 'Uploading…' : 'Change Photo'}
              </button>
              <DeleteButton
                variant="pill"
                label="Delete Artist"
                title={`Delete artist ${artistData.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onRequestDelete(artistDeleteDialog(artistData, deleteArtist))
                }}
              />
            </div>
          )}
        </div>

        {/* Related artists (top-right) */}
        <div style={{ position: 'absolute', top: 20, right: 28, textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,.6)', letterSpacing: '.6px', textTransform: 'uppercase', marginBottom: 8 }}>
            Related Artists
          </div>
          <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
            {relatedArtists.map((a) => (
              <div key={a.id} title={a.name} style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,.3)', flexShrink: 0, cursor: 'pointer', background: '#2e2840', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {a.image
                  ? /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={a.image} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>{a.name.charAt(0).toUpperCase()}</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.08)', padding: '0 28px', background: '#1a1a1f', flexShrink: 0 }}>
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '14px 18px', fontSize: 13,
              fontWeight: activeTab === i ? 600 : 400,
              color: activeTab === i ? '#fff' : 'rgba(255,255,255,.38)',
              borderBottom: activeTab === i ? '2px solid #1db954' : '2px solid transparent',
              marginBottom: -1, transition: 'color .12s', fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => activeTab !== i && (e.currentTarget.style.color = 'rgba(255,255,255,.75)')}
            onMouseLeave={(e) => activeTab !== i && (e.currentTarget.style.color = 'rgba(255,255,255,.38)')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ display: 'flex', gap: 40, padding: '28px 28px 40px', alignItems: 'flex-start', background: '#1a1a1f' }}>
        {/* Left: Popular tracks */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <SectionHeader title="Popular" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {popularTracks.map(({ track, album, idx }) => (
              <TrackItem
                key={track.id}
                track={track}
                index={idx}
                album={album}
                liked={mpLiked.includes(track.id)}
                onToggleLike={() => mpToggleLike(track.id)}
                onAddToPlaylist={() => onOpenTrackPlaylist({ id: track.id, name: track.name, artistName: album.artist })}
                onGoToAlbum={() => mpOpenAlbum(album.id)}
                onDelete={() => {
                  onRequestDelete(trackDeleteDialog(track, album, deleteTrack))
                }}
              />
            ))}
          </div>
        </div>

        {/* Right: Albums + Playlists */}
        <div style={{ width: 260, flexShrink: 0 }}>
          {/* Albums grid */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Albums" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {artistAlbums.map((a) => (
                <div key={a.id} onClick={() => mpOpenAlbum(a.id)} style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '.8')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <div style={{ aspectRatio: '1', borderRadius: 5, overflow: 'hidden', marginBottom: 7, background: '#2a2a32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {a.cover
                      ? /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={a.cover} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                      : <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(255,255,255,.15)' }}>{a.name.charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)' }}>{a.year}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Playlists */}
          <div>
            <SectionHeader title="Playlists" />
            {[
              { name: `Best of ${artistName}`, img: artistAlbums[0]?.cover },
              { name: `${artistName} Essentials`, img: artistAlbums[1]?.cover ?? artistAlbums[0]?.cover },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'center', cursor: 'pointer', padding: '6px 0' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <div style={{ width: 50, height: 50, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#2a2a32' }}>
                  {p.img && <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />} {/* eslint-disable-line @next/next/no-img-element */}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)' }}>Playlist</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── More by artist: other albums carousel ── */}
      {artistAlbums.length > 2 && (
        <div style={{ padding: '0 28px 40px', background: '#1a1a1f' }}>
          <HorizontalCarousel title={`More by ${artistName}`}>
            {artistAlbums.map((a) => <AlbumCard key={a.id} album={a} size={148} />)}
          </HorizontalCarousel>
        </div>
      )}
    </motion.div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{title}</h3>
      <button style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.32)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.5px', textTransform: 'uppercase', transition: 'color .12s' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.75)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.32)')}
      >See more</button>
    </div>
  )
}
