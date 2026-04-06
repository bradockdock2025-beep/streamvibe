'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'

export default function Toast() {
  const { toastMsg, toastVisible } = useAppStore(useShallow((s) => ({
    toastMsg: s.toastMsg,
    toastVisible: s.toastVisible,
  })))

  return (
    <AnimatePresence>
      {toastVisible && (
        <motion.div
          key={toastMsg}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22 }}
          style={{
            position: 'absolute',
            bottom: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg3)',
            border: '.5px solid var(--b2)',
            borderRadius: 'var(--r)',
            padding: '7px 14px',
            fontSize: 11,
            color: 'var(--t1)',
            zIndex: 200,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {toastMsg}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
