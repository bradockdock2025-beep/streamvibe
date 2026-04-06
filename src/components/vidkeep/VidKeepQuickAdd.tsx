'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import { ytId } from '@/lib/utils'

export default function VidKeepQuickAdd() {
  const { vkAddLink, vkFolder, openAddModal } = useAppStore(useShallow((s) => ({
    vkAddLink: s.vkAddLink,
    vkFolder: s.vkFolder,
    openAddModal: s.openAddModal,
  })))

  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<{ vid: string; thumb: string } | null>(null)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function onChange(v: string) {
    setUrl(v)
    const vid = ytId(v)
    setPreview(vid ? { vid, thumb: `https://img.youtube.com/vi/${vid}/mqdefault.jpg` } : null)
  }

  function save() {
    if (!url.trim()) return
    const fid = vkFolder !== 'all' ? vkFolder : null
    vkAddLink(url, fid, '', '')
    setUrl('')
    setPreview(null)
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') { setUrl(''); setPreview(null); inputRef.current?.blur() }
  }

  const hasUrl = url.trim().length > 0
  const isExpanded = focused || hasUrl

  return (
    <motion.div
      layout
      style={{
        background: 'var(--bg2)',
        border: `.5px solid ${isExpanded ? 'var(--ac)' : 'var(--b2)'}`,
        borderRadius: 'var(--r2)',
        overflow: 'hidden',
        transition: 'border-color .18s',
        marginBottom: 20,
      }}
    >
      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        {/* Link icon */}
        <div style={{ flexShrink: 0, opacity: isExpanded ? 1 : 0.4, transition: 'opacity .15s' }}>
          <LinkIcon active={isExpanded} />
        </div>

        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Cole um link de vídeo aqui…"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 13, color: 'var(--t1)', fontFamily: 'inherit',
          }}
        />

        {/* Actions — only visible when typing */}
        <AnimatePresence>
          {hasUrl && (
            <motion.div
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
            >
              {/* More options */}
              <button
                onMouseDown={(e) => { e.preventDefault(); openAddModal() }}
                style={{
                  background: 'none', border: 'none', fontSize: 11,
                  color: 'var(--t3)', cursor: 'pointer', padding: '0 4px',
                  fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'color .12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ach)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
              >
                Mais opções
              </button>

              {/* Save button */}
              <button
                onMouseDown={(e) => { e.preventDefault(); save() }}
                style={{
                  background: 'var(--ac)', color: '#fff', border: 'none',
                  borderRadius: 'var(--r)', padding: '5px 12px',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'opacity .12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '.88')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Salvar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle hint (keyboard shortcut) */}
        {!hasUrl && !focused && (
          <span style={{ fontSize: 10, color: 'var(--t3)', flexShrink: 0, opacity: .6 }}>
            ↵ Enter para salvar
          </span>
        )}
      </div>

      {/* YouTube preview strip */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '0 14px 10px',
              borderTop: '.5px solid var(--b1)',
              paddingTop: 10,
            }}>
              {/* Thumbnail */}
              <div style={{ width: 64, height: 36, borderRadius: 4, overflow: 'hidden', background: 'var(--bg4)', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: '#e05252', background: 'rgba(224,82,82,.12)', padding: '2px 5px', borderRadius: 3 }}>▶ YT</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>youtube.com · {preview.vid}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>
                  Prima <kbd style={{ background: 'var(--bg4)', border: '.5px solid var(--b3)', borderRadius: 3, padding: '1px 4px', fontSize: 10, fontFamily: 'inherit' }}>Enter</kbd> para guardar rapidamente ou <span style={{ color: 'var(--ach)', cursor: 'pointer' }} onClick={() => openAddModal()}>Mais opções</span> para pasta e título.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function LinkIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--ach)' : 'var(--t3)'}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'stroke .18s' }}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  )
}
