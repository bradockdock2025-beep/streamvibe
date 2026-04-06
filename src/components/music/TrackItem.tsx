'use client'

import type { Track, Album } from '@/types'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import TrackActionsMenu from './TrackActionsMenu'

interface TrackItemProps {
  track: Track
  index: number
  album: Album
  liked?: boolean
  onToggleLike?: () => void | Promise<void>
  onAddToPlaylist?: () => void
  onGoToAlbum?: () => void | Promise<void>
  onGoToArtist?: () => void | Promise<void>
  onRemoveFromPlaylist?: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
  deleting?: boolean
}

export default function TrackItem({
  track,
  index,
  album,
  liked = false,
  onToggleLike,
  onAddToPlaylist,
  onGoToAlbum,
  onGoToArtist,
  onRemoveFromPlaylist,
  onDelete,
  deleting = false,
}: TrackItemProps) {
  const { mpPlayTrack, mpPlaying, mpTrackIdx, mpCurrentAlbumId } = useAppStore(useShallow((s) => ({
    mpPlayTrack: s.mpPlayTrack,
    mpPlaying: s.mpPlaying,
    mpTrackIdx: s.mpTrackIdx,
    mpCurrentAlbumId: s.mpCurrentAlbumId,
  })))

  const isPlaying = mpPlaying && mpCurrentAlbumId === album.id && mpTrackIdx === index

  return (
    <div
      onClick={() => mpPlayTrack(album.id, index)}
      className="track-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '9px 12px', borderRadius: 6, cursor: 'pointer',
        background: isPlaying ? 'rgba(255,255,255,.06)' : 'transparent',
        transition: 'background .12s',
      }}
      onMouseEnter={(e) => !isPlaying && (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
      onMouseLeave={(e) => !isPlaying && (e.currentTarget.style.background = 'transparent')}
    >
      {/* Number / Play indicator */}
      <div style={{ width: 22, textAlign: 'right', flexShrink: 0 }}>
        {isPlaying ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#1db954"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        ) : (
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', fontVariantNumeric: 'tabular-nums' }}>{index + 1}</span>
        )}
      </div>

      {/* Title + Artist */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: isPlaying ? '#1db954' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.name}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {album.artist}
        </div>
      </div>

      {/* Duration */}
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        {track.dur}
      </span>

      <TrackActionsMenu
        liked={liked}
        onToggleLike={onToggleLike}
        onAddToPlaylist={onAddToPlaylist}
        onGoToAlbum={onGoToAlbum}
        onGoToArtist={onGoToArtist}
        onRemoveFromPlaylist={onRemoveFromPlaylist}
        onDelete={deleting ? undefined : onDelete}
      />
    </div>
  )
}
