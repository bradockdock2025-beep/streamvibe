'use client'

import { motion } from 'framer-motion'
import type { Album } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import DeleteButton from './DeleteButton'

interface AlbumCardProps {
  album: Album
  size?: number
  onDelete?: () => void | Promise<void>
  deleting?: boolean
}

function CoverPlaceholder({ size, name }: { size: number; name: string }) {
  const letter = name?.charAt(0)?.toUpperCase() || '?'
  return (
    <div style={{
      width: size, height: size,
      background: 'linear-gradient(135deg, #2a2a3a 0%, #1a1a28 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 800, color: 'rgba(255,255,255,.12)', userSelect: 'none' }}>
        {letter}
      </span>
    </div>
  )
}

export default function AlbumCard({ album, size = 150, onDelete, deleting = false }: AlbumCardProps) {
  const mpOpenAlbum = useAppStore((s) => s.mpOpenAlbum)

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={() => mpOpenAlbum(album.id)}
      style={{ flexShrink: 0, width: size, cursor: 'pointer' }}
    >
      {/* Cover */}
      <div style={{ width: size, height: size, borderRadius: 6, overflow: 'hidden', background: '#2a2a2a', marginBottom: 10, position: 'relative' }}>
        {album.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={album.cover}
            alt={album.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        ) : (
          <CoverPlaceholder size={size} name={album.name} />
        )}

        {/* Play overlay */}
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all .2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.45)'; e.currentTarget.style.opacity = '1' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = '0' }}
        >
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1db954', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,.4)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>

        {onDelete && (
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
            <DeleteButton
              onClick={(event) => {
                event.stopPropagation()
                void onDelete()
              }}
              title={`Delete album ${album.name}`}
              busy={deleting}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>
        {album.name}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {album.artist}
      </div>
    </motion.div>
  )
}
