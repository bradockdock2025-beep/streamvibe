'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'

export default function VideoModal() {
  const { videoModalOpen, videoModalLink, closeVideoModal } = useAppStore(useShallow((s) => ({
    videoModalOpen: s.videoModalOpen,
    videoModalLink: s.videoModalLink,
    closeVideoModal: s.closeVideoModal,
  })))

  const link = videoModalLink

  return (
    <AnimatePresence>
      {videoModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeVideoModal}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.94)', zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '88%', maxWidth: 680 }}
          >
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {link?.title}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {link?.type === 'yt' && link?.vid && (
                  <a
                    href={`https://youtube.com/watch?v=${link.vid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: 'rgba(255,255,255,.1)', border: '.5px solid rgba(255,255,255,.18)', color: '#fff', borderRadius: 'var(--r)', padding: '5px 11px', fontSize: 11, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', transition: 'background .15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.18)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
                  >
                    ↗ YouTube
                  </a>
                )}
                <button
                  onClick={closeVideoModal}
                  style={{ width: 26, height: 26, background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, transition: 'background .15s', fontFamily: 'inherit' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Video frame */}
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 'var(--r2)', overflow: 'hidden' }}>
              {link?.type === 'yt' && link?.vid ? (
                <iframe
                  src={`https://www.youtube.com/embed/${link.vid}?autoplay=1&rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)' }}>
                  <p style={{ color: 'var(--t3)', fontSize: 13 }}>Link externo</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
