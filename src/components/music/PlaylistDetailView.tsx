'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import DeleteButton from './DeleteButton'
import TrackActionsMenu from './TrackActionsMenu'
import type { DeleteDialogState } from './DeleteConfirmModal'

export default function PlaylistDetailView({
  playlistId,
  onRequestDelete,
  onOpenTrackPlaylist,
}: {
  playlistId: string
  onRequestDelete: (dialog: DeleteDialogState) => void
  onOpenTrackPlaylist: (track: { id: string; name: string; artistName: string }) => void
}) {
  const {
    playlists,
    albums,
    mpPlayPlaylist,
    mpCurrentTrackId,
    mpPlaying,
    mpLiked,
    mpToggleLike,
    removeTrackFromPlaylist,
    reorderPlaylistTracks,
    deletePlaylist,
    deleteTrack,
    mpOpenAlbum,
    mpOpenArtist,
    mpSetView,
  } = useAppStore(useShallow((s) => ({
    playlists: s.playlists,
    albums: s.albums,
    mpPlayPlaylist: s.mpPlayPlaylist,
    mpCurrentTrackId: s.mpCurrentTrackId,
    mpPlaying: s.mpPlaying,
    mpLiked: s.mpLiked,
    mpToggleLike: s.mpToggleLike,
    removeTrackFromPlaylist: s.removeTrackFromPlaylist,
    reorderPlaylistTracks: s.reorderPlaylistTracks,
    deletePlaylist: s.deletePlaylist,
    deleteTrack: s.deleteTrack,
    mpOpenAlbum: s.mpOpenAlbum,
    mpOpenArtist: s.mpOpenArtist,
    mpSetView: s.mpSetView,
  })))
  const [busyTrackId, setBusyTrackId] = useState<string | null>(null)

  const playlist = playlists.find((item) => item.id === playlistId)
  if (!playlist) return null
  const currentPlaylist = playlist

  async function moveTrack(trackId: string, direction: -1 | 1) {
    const fromIndex = currentPlaylist.tracks.findIndex((entry) => entry.track.id === trackId)
    const toIndex = fromIndex + direction
    if (fromIndex < 0 || toIndex < 0 || toIndex >= currentPlaylist.tracks.length || busyTrackId) return

    const orderedTrackIds = currentPlaylist.tracks.map((entry) => entry.track.id)
    const [movedTrackId] = orderedTrackIds.splice(fromIndex, 1)
    orderedTrackIds.splice(toIndex, 0, movedTrackId)

    setBusyTrackId(trackId)
    try {
      await reorderPlaylistTracks(currentPlaylist.id, orderedTrackIds)
    } finally {
      setBusyTrackId(null)
    }
  }

  async function removeTrack(trackId: string) {
    if (busyTrackId) return
    setBusyTrackId(trackId)
    try {
      await removeTrackFromPlaylist(currentPlaylist.id, trackId)
    } finally {
      setBusyTrackId(null)
    }
  }

  function requestDeleteTrack(trackId: string, trackName: string, albumId: string) {
    const album = albums.find((item) => item.id === albumId)
    const lastTrack = album?.tracks.length === 1

    onRequestDelete({
      title: `Delete track "${trackName}"?`,
      message: lastTrack
        ? 'This is the last track in the album, so the album container will also be removed.'
        : album
        ? `The track will be removed from "${album.name}" and from playback/library views.`
        : 'The track will be removed from the library and from any linked playlists.',
      consequences: [
        'The audio file for this track will be removed from storage.',
        lastTrack
          ? 'Because no tracks will remain, the album and its cover will also be deleted.'
          : 'Any playlists that include this track will lose the link automatically.',
        'If this deletion leaves the artist without albums or tracks, the artist record will also be removed.',
      ],
      confirmLabel: 'Delete Track',
      onConfirm: () => deleteTrack(trackId),
    })
  }

  const createdLabel = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(currentPlaylist.createdAt))

  return (
    <motion.div
      key={playlistId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{ flex: 1, overflowY: 'auto' }}
    >
      <div style={{ position: 'relative', padding: '40px 32px 28px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(29,185,84,.22) 0%, rgba(20,20,24,.94) 42%, #17181f 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 28, alignItems: 'flex-end' }}>
          <div style={{ width: 200, height: 200, borderRadius: 12, overflow: 'hidden', flexShrink: 0, boxShadow: '0 16px 48px rgba(0,0,0,.48)', background: '#252631', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
            {playlist.covers.length > 0 ? (
              playlist.covers.map((cover, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${cover}-${index}`} src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              ))
            ) : (
              <div style={{ gridColumn: '1 / span 2', gridRow: '1 / span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.16)', fontSize: 64, fontWeight: 800 }}>
                {playlist.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)', letterSpacing: '.6px', textTransform: 'uppercase', marginBottom: 8 }}>
              Playlist
            </div>
            <h1 style={{ fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1.06, marginBottom: 12 }}>
              {playlist.name}
            </h1>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.62)', lineHeight: 1.7, maxWidth: 680, marginBottom: 18 }}>
              {playlist.description || 'Ordered collection of tracks already saved in the library.'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{playlist.trackCount} songs</span>
              <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 14 }}>·</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{playlist.totalDur}</span>
              <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 14 }}>·</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Created {createdLabel}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => mpPlayPlaylist(playlist.id)}
                disabled={playlist.trackCount === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: playlist.trackCount === 0 ? 'rgba(29,185,84,.28)' : '#1db954', color: '#fff', border: 'none', borderRadius: 24, padding: '10px 26px', fontSize: 14, fontWeight: 700, cursor: playlist.trackCount === 0 ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'transform .1s, opacity .15s', letterSpacing: '.3px', opacity: playlist.trackCount === 0 ? 0.7 : 1 }}
                onMouseEnter={(event) => playlist.trackCount > 0 && (event.currentTarget.style.transform = 'scale(1.04)')}
                onMouseLeave={(event) => (event.currentTarget.style.transform = 'scale(1)')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Play
              </button>
              <button
                onClick={() => mpSetView('songs')}
                style={{ background: 'none', border: '1.5px solid rgba(255,255,255,.25)', color: 'rgba(255,255,255,.75)', borderRadius: 24, padding: '9px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color .15s, color .15s' }}
                onMouseEnter={(event) => { event.currentTarget.style.borderColor = '#fff'; event.currentTarget.style.color = '#fff' }}
                onMouseLeave={(event) => { event.currentTarget.style.borderColor = 'rgba(255,255,255,.25)'; event.currentTarget.style.color = 'rgba(255,255,255,.75)' }}
              >
                Browse Songs
              </button>
              <DeleteButton
                variant="pill"
                label="Delete Playlist"
                title={`Delete playlist ${playlist.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onRequestDelete({
                    title: `Delete playlist "${playlist.name}"?`,
                    message: 'This removes the playlist container and its links. The original songs remain in your library.',
                    consequences: [
                      `${playlist.trackCount} playlist link${playlist.trackCount === 1 ? '' : 's'} will be removed.`,
                      'Tracks, albums and artists remain untouched.',
                      'This action cannot be undone.',
                    ],
                    confirmLabel: 'Delete Playlist',
                    onConfirm: () => deletePlaylist(playlist.id),
                  })
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 32px 40px', background: '#1a1a1f' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1.6fr 1fr 70px 108px', gap: '0 12px', padding: '0 8px 10px', borderBottom: '1px solid rgba(255,255,255,.07)', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', textAlign: 'center' }}>#</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Title</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Album</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '.4px' }}>Time</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '.4px' }}>Actions</span>
        </div>

        {playlist.tracks.length === 0 && (
          <div style={{ padding: '36px 8px', color: 'rgba(255,255,255,.36)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              This playlist is empty
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              Open any track menu and use `Add To Playlist` to link songs here.
            </div>
          </div>
        )}

        {playlist.tracks.map((entry, index) => {
          const isPlaying = mpPlaying && mpCurrentTrackId === entry.track.id
          const liked = mpLiked.includes(entry.track.id)
          const busy = busyTrackId === entry.track.id

          return (
            <div
              key={entry.id}
              onClick={() => mpPlayPlaylist(playlist.id, index)}
              style={{
                display: 'grid',
                gridTemplateColumns: '36px 1.6fr 1fr 70px 108px',
                gap: '0 12px',
                padding: '9px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                alignItems: 'center',
                background: isPlaying ? 'rgba(29,185,84,.07)' : 'transparent',
                transition: 'background .12s',
              }}
              onMouseEnter={(event) => !isPlaying && (event.currentTarget.style.background = 'rgba(255,255,255,.04)')}
              onMouseLeave={(event) => !isPlaying && (event.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 13, color: isPlaying ? '#1db954' : 'rgba(255,255,255,.3)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {isPlaying
                  ? <svg width="11" height="11" viewBox="0 0 24 24" fill="#1db954"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  : index + 1}
              </span>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: isPlaying ? '#1db954' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.track.name}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.artist.name}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, overflow: 'hidden', background: '#262833', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {entry.album.cover
                    ? /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={entry.album.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    : <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.22)' }}>{entry.album.name.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.album.name}
                  </div>
                </div>
              </div>

              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {entry.track.dur}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <IconButton
                  title="Move up"
                  onClick={() => moveTrack(entry.track.id, -1)}
                  disabled={index === 0 || busy}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                </IconButton>
                <IconButton
                  title="Move down"
                  onClick={() => moveTrack(entry.track.id, 1)}
                  disabled={index === playlist.tracks.length - 1 || busy}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </IconButton>
                <TrackActionsMenu
                  liked={liked}
                  onToggleLike={() => mpToggleLike(entry.track.id)}
                  onAddToPlaylist={() => onOpenTrackPlaylist({ id: entry.track.id, name: entry.track.name, artistName: entry.artist.name })}
                  onGoToAlbum={() => mpOpenAlbum(entry.album.id)}
                  onGoToArtist={() => mpOpenArtist(entry.artist.name)}
                  onRemoveFromPlaylist={busy ? undefined : () => removeTrack(entry.track.id)}
                  onDelete={() => requestDeleteTrack(entry.track.id, entry.track.name, entry.track.albumId)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function IconButton({
  children,
  title,
  onClick,
  disabled = false,
  active = false,
  danger = false,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void | Promise<void>
  disabled?: boolean
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation()
        void onClick()
      }}
      title={title}
      disabled={disabled}
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        border: 'none',
        background: active ? 'rgba(29,185,84,.14)' : 'rgba(255,255,255,.05)',
        color: active ? '#1db954' : danger ? 'rgba(255,143,143,.82)' : 'rgba(255,255,255,.54)',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        transition: 'background .12s, color .12s, opacity .12s',
      }}
      onMouseEnter={(event) => {
        if (disabled) return
        event.currentTarget.style.background = active ? 'rgba(29,185,84,.18)' : 'rgba(255,255,255,.11)'
        if (!active && !danger) event.currentTarget.style.color = '#fff'
        if (danger) event.currentTarget.style.color = '#ffc0c0'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = active ? 'rgba(29,185,84,.14)' : 'rgba(255,255,255,.05)'
        event.currentTarget.style.color = active ? '#1db954' : danger ? 'rgba(255,143,143,.82)' : 'rgba(255,255,255,.54)'
      }}
    >
      {children}
    </button>
  )
}
