'use client'

import { motion } from 'framer-motion'
import type { VkLink } from '@/types'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'

interface VideoCardProps {
  link: VkLink
}

export default function VideoCard({ link }: VideoCardProps) {
  const { openVideoModal, openEditModal, vkDeleteLink } = useAppStore(useShallow((s) => ({
    openVideoModal: s.openVideoModal,
    openEditModal: s.openEditModal,
    vkDeleteLink: s.vkDeleteLink,
  })))

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="fade-in"
      onClick={() => openVideoModal(link.id)}
      style={{
        background: 'var(--bg2)',
        border: '.5px solid var(--b1)',
        borderRadius: 'var(--r2)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color .15s',
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--bg4)', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={link.thumb} alt={link.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
        {/* Hover overlay */}
        <div
          className="vc-overlay"
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'background .18s, opacity .18s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.55)'; e.currentTarget.style.opacity = '1' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = '0' }}
        >
          <div style={{ width: 32, height: 32, background: 'var(--ac)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '5px 0 5px 10px', borderColor: 'transparent transparent transparent #fff', marginLeft: 2 }} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px 9px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 30 }}>
          {link.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {link.type === 'yt' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'rgba(224,82,82,.12)', color: '#e05252', fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 3 }}>
              ▶ YT
            </span>
          )}
          <ActionButtons
            onEdit={(e) => { e.stopPropagation(); openEditModal(link.id) }}
            onDelete={(e) => { e.stopPropagation(); vkDeleteLink(link.id) }}
          />
        </div>
      </div>
    </motion.div>
  )
}

function ActionButtons({ onEdit, onDelete }: { onEdit: (e: React.MouseEvent) => void; onDelete: (e: React.MouseEvent) => void }) {
  return (
    <div style={{ display: 'flex', gap: 3, opacity: 0, transition: 'opacity .15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
    >
      <button
        onClick={onEdit}
        style={{ width: 20, height: 20, borderRadius: 3, border: 'none', background: 'var(--bg4)', color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg5)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg4)')}
        title="Editar"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
        </svg>
      </button>
      <button
        onClick={onDelete}
        style={{ width: 20, height: 20, borderRadius: 3, border: 'none', background: 'var(--bg4)', color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(224,82,82,.15)'; e.currentTarget.style.color = 'var(--red)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.color = 'var(--t2)' }}
        title="Deletar"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </button>
    </div>
  )
}
