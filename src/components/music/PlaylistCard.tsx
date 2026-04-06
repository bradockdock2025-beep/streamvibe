'use client'

import { motion } from 'framer-motion'
import type { Playlist } from '@/types'

interface PlaylistCardProps {
  playlist: Playlist
  onClick?: () => void
}

export default function PlaylistCard({ playlist, onClick }: PlaylistCardProps) {
  const covers = playlist.covers.slice(0, 4)

  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      style={{ cursor: 'pointer', width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}
    >
      {/* Cover mosaic */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', marginBottom: 12, background: '#252530' }}>
        {covers.length === 0 ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.16)', fontSize: 56, fontWeight: 800 }}>
            {playlist.name.charAt(0).toUpperCase()}
          </div>
        ) : covers.length === 1 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={covers[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', width: '100%', height: '100%' }}>
            {covers.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
            ))}
          </div>
        )}
        {/* Play overlay */}
        <div
          className="playlist-play-overlay"
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'all .2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.45)'; e.currentTarget.style.opacity = '1' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = '0' }}
        >
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1db954', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,.4)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {playlist.name}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.42)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {playlist.description}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.28)' }}>
        {playlist.trackCount} songs · {playlist.totalDur}
      </div>
    </motion.button>
  )
}
