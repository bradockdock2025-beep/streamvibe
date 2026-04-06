'use client'

import { motion } from 'framer-motion'
import type { VkFolder, VkLink } from '@/types'

interface FolderCardProps {
  folder: VkFolder
  links: VkLink[]
  onClick: () => void
}

export default function FolderCard({ folder, links, onClick }: FolderCardProps) {
  return (
    <motion.div
      whileHover={{ y: -1, borderColor: 'var(--b2)' }}
      onClick={onClick}
      className="fade-in"
      style={{
        background: 'var(--bg2)',
        border: '.5px solid var(--b1)',
        borderRadius: 'var(--r2)',
        padding: 11,
        cursor: 'pointer',
        transition: 'border-color .15s',
      }}
    >
      {/* Thumbnails strip */}
      <div style={{ display: 'flex', gap: 2, height: 34, borderRadius: 4, overflow: 'hidden', marginBottom: 9 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1, background: 'var(--bg4)', overflow: 'hidden' }}>
            {links[i] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={links[i].thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
        {folder.name}
      </div>
      <div style={{ fontSize: 10, color: 'var(--t3)' }}>{links.length} vídeos</div>
    </motion.div>
  )
}
