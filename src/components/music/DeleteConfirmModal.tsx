'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface DeleteDialogState {
  title: string
  message: string
  consequences: string[]
  confirmLabel: string
  onConfirm: () => Promise<boolean>
}

interface DeleteConfirmModalProps {
  dialog: DeleteDialogState | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function DeleteConfirmModal({
  dialog,
  busy,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  useEffect(() => {
    if (!dialog) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialog, busy, onCancel])

  return (
    <AnimatePresence>
      {dialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => {
            if (!busy) onCancel()
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4,4,8,.78)',
            backdropFilter: 'blur(10px)',
            zIndex: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <motion.div
            initial={{ scale: 0.97, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 460,
              background: 'linear-gradient(180deg, rgba(25,25,32,.98) 0%, rgba(18,18,24,.98) 100%)',
              border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 18,
              boxShadow: '0 28px 80px rgba(0,0,0,.55)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 999,
                background: 'rgba(224,82,82,.12)',
                border: '1px solid rgba(224,82,82,.26)',
                color: '#ff9d9d',
                padding: '6px 10px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.4px',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff7272' }} />
                Destructive Action
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-.4px', margin: 0, marginBottom: 8 }}>
                {dialog.title}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,.64)', margin: 0 }}>
                {dialog.message}
              </p>
            </div>

            {dialog.consequences.length > 0 && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.42)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 10 }}>
                  This Will Also Happen
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dialog.consequences.map((item) => (
                    <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: '#ff8f8f', lineHeight: 1, marginTop: 2 }}>•</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,.74)', lineHeight: 1.55 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={onCancel}
                disabled={busy}
                style={{
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(255,255,255,.1)',
                  color: 'rgba(255,255,255,.78)',
                  borderRadius: 10,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: busy ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: busy ? 0.65 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                style={{
                  background: 'linear-gradient(180deg, #ff6f6f 0%, #d94747 100%)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: busy ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  minWidth: 124,
                  boxShadow: '0 10px 22px rgba(217,71,71,.26)',
                  opacity: busy ? 0.8 : 1,
                }}
              >
                {busy ? 'Deleting…' : dialog.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
