'use client'

import { motion } from 'framer-motion'
import type { Artist } from '@/types'
import DeleteButton from './DeleteButton'

interface ArtistCardProps {
  artist: Artist
  onClick?: () => void
  width?: number
  onDelete?: () => void | Promise<void>
  deleting?: boolean
}

function ArtistPlaceholder({ width, name }: { width: number; name: string }) {
  const letter = name?.charAt(0)?.toUpperCase() || '?'
  const height = Math.round(width * 1.35)
  return (
    <div style={{
      width, height,
      background: 'linear-gradient(160deg, #2e2840 0%, #1a1a2e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: width * 0.42, fontWeight: 800, color: 'rgba(255,255,255,.1)', userSelect: 'none' }}>
        {letter}
      </span>
    </div>
  )
}

export default function ArtistCard({ artist, onClick, width = 188, onDelete, deleting = false }: ArtistCardProps) {
  const height = Math.round(width * 1.35)

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      onClick={onClick}
      transition={{ duration: 0.15 }}
      style={{ flexShrink: 0, width, cursor: 'pointer', position: 'relative', borderRadius: 8, overflow: 'hidden' }}
    >
      <div style={{ width, height, background: '#222230', position: 'relative', overflow: 'hidden' }}>
        {artist.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.image}
            alt={artist.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        ) : (
          <ArtistPlaceholder width={width} name={artist.name} />
        )}

        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.18) 45%, transparent 100%)' }} />

        {/* Artist name */}
        <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,.5)' }}>
            {artist.name}
          </div>
        </div>

        {onDelete && (
          <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
            <DeleteButton
              onClick={(event) => {
                event.stopPropagation()
                void onDelete()
              }}
              title={`Delete artist ${artist.name}`}
              busy={deleting}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}
