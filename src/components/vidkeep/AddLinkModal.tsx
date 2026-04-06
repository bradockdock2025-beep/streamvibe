'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import { ytId } from '@/lib/utils'

export default function AddLinkModal() {
  const {
    addModalOpen, addModalEditId, addModalAutoTitle,
    vkFolders, vkLinks, vkFolder,
    closeAddModal, vkAddLink, vkEditLink, setAddModalAutoTitle, showToast,
  } = useAppStore(useShallow((s) => ({
    addModalOpen: s.addModalOpen,
    addModalEditId: s.addModalEditId,
    addModalAutoTitle: s.addModalAutoTitle,
    vkFolders: s.vkFolders,
    vkLinks: s.vkLinks,
    vkFolder: s.vkFolder,
    closeAddModal: s.closeAddModal,
    vkAddLink: s.vkAddLink,
    vkEditLink: s.vkEditLink,
    setAddModalAutoTitle: s.setAddModalAutoTitle,
    showToast: s.showToast,
  })))

  const [url, setUrl] = useState('')
  const [fid, setFid] = useState<string>('')
  const [customTitle, setCustomTitle] = useState('')
  const [fetching, setFetching] = useState(false)
  const [preview, setPreview] = useState<{ img: string; title: string; sub: string } | null>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  const editLink = addModalEditId ? vkLinks.find((l) => l.id === addModalEditId) : null
  const isEdit = !!editLink

  useEffect(() => {
    if (!addModalOpen) return
    if (isEdit && editLink) {
      setUrl(editLink.url)
      setFid(editLink.fid || '')
      setCustomTitle(editLink.title)
      if (editLink.type === 'yt' && editLink.vid) {
        setPreview({ img: editLink.thumb, title: editLink.title, sub: `youtube.com · ${editLink.vid}` })
      } else {
        setPreview(null)
      }
    } else {
      setUrl('')
      setFid(vkFolder !== 'all' ? vkFolder : '')
      setCustomTitle('')
      setPreview(null)
    }
    setFetching(false)
    setTimeout(() => urlInputRef.current?.focus(), 120)
  }, [addModalOpen, addModalEditId]) // eslint-disable-line react-hooks/exhaustive-deps

  function onUrlChange(v: string) {
    setUrl(v)
    const vid = ytId(v)
    if (vid) {
      setPreview({ img: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`, title: 'YouTube detectado — clique Buscar', sub: `youtube.com · ${vid}` })
    } else {
      setPreview(null)
    }
  }

  function fetchTitle() {
    if (!url.trim()) { showToast('Cole uma URL primeiro'); return }
    const vid = ytId(url)
    setFetching(true)
    setPreview(null)
    setTimeout(() => {
      const titles = ['Entendendo Transformers', 'Build Full Stack em 1 hora', 'CSS Grid Mastery', 'React Guide 2025', 'ML para Todos']
      const t = vid ? titles[Math.floor(Math.random() * titles.length)] : 'Link detectado'
      setAddModalAutoTitle(t)
      setFetching(false)
      setPreview({ img: vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : '', title: t, sub: vid ? `youtube.com · ${vid}` : 'link externo' })
      if (!customTitle) setCustomTitle(t)
      showToast('Título detectado!')
    }, 800)
  }

  function save() {
    if (!url.trim()) { showToast('URL obrigatória'); return }
    if (isEdit && editLink) {
      vkEditLink(editLink.id, url, fid || null, customTitle || addModalAutoTitle || 'Link')
    } else {
      vkAddLink(url, fid || null, customTitle, addModalAutoTitle)
    }
    closeAddModal()
  }

  return (
    <AnimatePresence>
      {addModalOpen && (
        <Overlay onClose={closeAddModal}>
          <ModalBox>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '.5px solid var(--b1)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 500 }}>{isEdit ? 'Editar link' : 'Adicionar link'}</h3>
              <CloseBtn onClick={closeAddModal} />
            </div>

            {/* Body */}
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              <FormGroup label="URL do vídeo">
                <div style={{ display: 'flex', gap: 5 }}>
                  <Input
                    ref={urlInputRef}
                    type="url"
                    value={url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={fetchTitle}
                    style={{ background: 'var(--bg3)', border: '.5px solid var(--b2)', borderRadius: 'var(--r)', padding: '7px 10px', fontSize: 11, color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', transition: 'background .12s', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.borderColor = 'var(--ac)'; e.currentTarget.style.color = 'var(--ach)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.color = 'var(--t2)' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.85"/></svg>
                    Buscar
                  </button>
                </div>

                {/* Fetching indicator */}
                {fetching && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--t3)', marginTop: 7 }}>
                    <div style={{ width: 11, height: 11, border: '1.5px solid var(--b2)', borderTopColor: 'var(--ac)', borderRadius: '50%' }} className="spin-anim" />
                    <span>Buscando...</span>
                  </div>
                )}

                {/* Preview */}
                {preview && !fetching && (
                  <div style={{ display: 'flex', gap: 9, alignItems: 'center', background: 'var(--bg3)', borderRadius: 'var(--r)', padding: 9, marginTop: 7 }}>
                    {preview.img && (
                      <div style={{ width: 56, minWidth: 56, height: 32, borderRadius: 3, background: 'var(--bg4)', overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--t1)', lineHeight: 1.4 }}>{preview.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{preview.sub}</div>
                    </div>
                  </div>
                )}
              </FormGroup>

              <FormGroup label="Pasta">
                <select
                  value={fid}
                  onChange={(e) => setFid(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg3)', border: '.5px solid var(--b2)', borderRadius: 'var(--r)', padding: '8px 10px', color: 'var(--t1)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="">Sem pasta</option>
                  {vkFolders.map((f) => (
                    <option key={f.id} value={f.id} style={{ background: 'var(--bg3)' }}>{f.name}</option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="Título personalizado (opcional)">
                <Input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Deixe vazio para usar o detectado"
                />
              </FormGroup>
            </div>

            {/* Footer */}
            <div style={{ padding: '11px 16px', borderTop: '.5px solid var(--b1)', display: 'flex', justifyContent: 'flex-end', gap: 7 }}>
              <SecondaryBtn onClick={closeAddModal}>Cancelar</SecondaryBtn>
              <PrimaryBtn onClick={save}>Salvar</PrimaryBtn>
            </div>
          </ModalBox>
        </Overlay>
      )}
    </AnimatePresence>
  )
}

// ─── Shared modal primitives ─────────────────────────────────────────────────
export function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.82)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </motion.div>
  )
}

export function ModalBox({ children, maxWidth = 440 }: { children: React.ReactNode; maxWidth?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.97, y: 10 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.97, y: 10 }}
      transition={{ duration: 0.2 }}
      style={{ background: 'var(--bg2)', border: '.5px solid var(--b2)', borderRadius: 'var(--r2)', width: '88%', maxWidth, maxHeight: '88%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  )
}

export function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ width: 24, height: 24, background: 'var(--bg3)', border: '.5px solid var(--b2)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, color: 'var(--t2)', fontFamily: 'inherit', transition: 'background .12s' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.color = 'var(--t1)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--t2)' }}
    >
      ×
    </button>
  )
}

export function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 500, color: 'var(--t3)', letterSpacing: '.6px', textTransform: 'uppercase', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

import { forwardRef } from 'react'
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return (
    <input
      ref={ref}
      {...props}
      style={{ width: '100%', background: 'var(--bg3)', border: '.5px solid var(--b2)', borderRadius: 'var(--r)', padding: '8px 10px', color: 'var(--t1)', fontFamily: 'inherit', fontSize: 12, outline: 'none', transition: 'border-color .15s', ...props.style }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--ac)'; props.onFocus?.(e) }}
      onBlur={(e) => { e.target.style.borderColor = 'var(--b2)'; props.onBlur?.(e) }}
    />
  )
})

export function SecondaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'var(--bg3)', border: '.5px solid var(--b2)', color: 'var(--t2)', borderRadius: 'var(--r)', padding: '7px 13px', fontSize: 12, cursor: 'pointer', transition: 'background .12s', fontFamily: 'inherit' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.color = 'var(--t1)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--t2)' }}
    >
      {children}
    </button>
  )
}

export function PrimaryBtn({ onClick, children, teal }: { onClick: () => void; children: React.ReactNode; teal?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ background: teal ? 'var(--teal)' : 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r)', padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'opacity .12s', fontFamily: 'inherit' }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '.88')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  )
}
