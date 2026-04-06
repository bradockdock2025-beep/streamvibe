'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'

export default function NewFolderModal() {
  const { newFolderModalOpen, closeNewFolderModal, vkAddFolder, showToast } = useAppStore(useShallow((s) => ({
    newFolderModalOpen: s.newFolderModalOpen,
    closeNewFolderModal: s.closeNewFolderModal,
    vkAddFolder: s.vkAddFolder,
    showToast: s.showToast,
  })))

  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (newFolderModalOpen) {
      setName('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [newFolderModalOpen])

  function save() {
    if (!name.trim()) { showToast('Nome obrigatório'); return }
    vkAddFolder(name.trim())
    closeNewFolderModal()
  }

  return (
    <AnimatePresence>
      {newFolderModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeNewFolderModal}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <motion.div
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--bg2)', border: '.5px solid var(--b2)', borderRadius: 'var(--r2)', width: '88%', maxWidth: 300, padding: 18 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 500 }}>Nova pasta</h3>
              <button
                onClick={closeNewFolderModal}
                style={{ width: 24, height: 24, background: 'var(--bg3)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15, color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
              >×</button>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 500, color: 'var(--t3)', letterSpacing: '.6px', textTransform: 'uppercase', marginBottom: 4 }}>Nome</label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                placeholder="Ex: React, Design..."
                style={{ width: '100%', background: 'var(--bg3)', border: '.5px solid var(--b2)', borderRadius: 'var(--r)', padding: '8px 10px', color: 'var(--t1)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--ac)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--b2)')}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button onClick={closeNewFolderModal} style={{ background: 'var(--bg3)', border: '.5px solid var(--b2)', color: 'var(--t2)', borderRadius: 'var(--r)', padding: '7px 13px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={save} style={{ background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r)', padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Criar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
