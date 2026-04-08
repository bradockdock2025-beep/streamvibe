'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function UploadModal() {
  const { state: pushState, subscribe, unsubscribe } = usePushNotifications()

  const { uploadModalOpen, closeUploadModal, uploadFiles, simulateUpload, removeUploadFile, showToast } = useAppStore(useShallow((s) => ({
    uploadModalOpen: s.uploadModalOpen,
    closeUploadModal: s.closeUploadModal,
    uploadFiles: s.uploadFiles,
    simulateUpload: s.simulateUpload,
    removeUploadFile: s.removeUploadFile,
    showToast: s.showToast,
  })))

  function confirm() {
    closeUploadModal()
    showToast('Músicas adicionadas à biblioteca!')
  }

  return (
    <AnimatePresence>
      {uploadModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeUploadModal}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.82)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <motion.div
            initial={{ scale: 0.97, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--bg2)', border: '.5px solid var(--b2)', borderRadius: 'var(--r2)', width: '88%', maxWidth: 400, maxHeight: '88%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '.5px solid var(--b1)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 500 }}>Upload de músicas</h3>
              <button onClick={closeUploadModal} style={{ width: 24, height: 24, background: 'var(--bg3)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15, color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              {/* Drop zone */}
              <div
                onClick={simulateUpload}
                style={{ border: '1.5px dashed var(--b3)', borderRadius: 'var(--r2)', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'border-color .15s, background .15s', marginBottom: 16 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.background = 'var(--teald)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.background = 'transparent' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round">
                  <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
                <p style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center' }}>Arraste ficheiros de áudio aqui</p>
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>MP3, FLAC, WAV, M4A suportados</span>
              </div>

              {/* File list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {uploadFiles.map((f) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg3)', borderRadius: 'var(--r)', padding: '8px 10px' }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--teald)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--t3)' }}>{f.size}</div>
                      {!f.done ? (
                        <div style={{ height: 2, background: 'var(--b2)', borderRadius: 1, marginTop: 5, overflow: 'hidden' }}>
                          <motion.div
                            animate={{ width: `${f.progress}%` }}
                            transition={{ duration: 0.15 }}
                            style={{ height: '100%', background: 'var(--teal)', borderRadius: 1 }}
                          />
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: 'var(--teal)', marginTop: 3 }}>✓ Concluído</div>
                      )}
                    </div>
                    <button
                      onClick={() => removeUploadFile(f.id)}
                      style={{ width: 20, height: 20, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .12s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Push notification toggle */}
            {pushState !== 'unsupported' && pushState !== 'denied' && (
              <div style={{ padding: '10px 16px', borderTop: '.5px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={pushState === 'subscribed' ? 'var(--teal)' : 'var(--t3)'} strokeWidth="2" strokeLinecap="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span style={{ flex: 1, fontSize: 11, color: 'var(--t2)' }}>
                  {pushState === 'subscribed' ? 'Notificações activas' : 'Notificar quando upload terminar'}
                </span>
                <button
                  onClick={pushState === 'subscribed' ? unsubscribe : subscribe}
                  disabled={pushState === 'loading'}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 'var(--r)',
                    border: '.5px solid var(--b2)', cursor: pushState === 'loading' ? 'default' : 'pointer',
                    background: pushState === 'subscribed' ? 'var(--teald)' : 'var(--bg3)',
                    color: pushState === 'subscribed' ? 'var(--teal)' : 'var(--t2)',
                    fontFamily: 'inherit', opacity: pushState === 'loading' ? 0.5 : 1,
                    transition: 'all .15s',
                  }}
                >
                  {pushState === 'loading' ? '…' : pushState === 'subscribed' ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: '11px 16px', borderTop: '.5px solid var(--b1)', display: 'flex', justifyContent: 'flex-end', gap: 7 }}>
              <button onClick={closeUploadModal} style={{ background: 'var(--bg3)', border: '.5px solid var(--b2)', color: 'var(--t2)', borderRadius: 'var(--r)', padding: '7px 13px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Fechar</button>
              <button onClick={confirm} style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 'var(--r)', padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Confirmar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
