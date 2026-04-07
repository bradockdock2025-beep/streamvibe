'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

export default function AuthPage() {
  const openMusicApp = useAppStore((s) => s.openMusicApp)
  const [email, setEmail] = useState('usuario@exemplo.com')
  const [password, setPassword] = useState('12345678')

  return (
    <motion.div
      className="h-full flex flex-col items-center justify-center"
      style={{ background: 'var(--bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{ fontFamily: 'var(--font-space-mono, monospace)', fontSize: 24, letterSpacing: -1, marginBottom: 5 }}
      >
        VIBE<b style={{ color: 'var(--ach)' }}>STREAM</b>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 32 }}
      >
        Seu espaço pessoal de conteúdo
      </motion.p>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          background: 'var(--bg2)',
          border: '.5px solid var(--b2)',
          borderRadius: 'var(--r2)',
          padding: '26px',
          width: 320,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 18 }}>Entrar</h2>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 500, color: 'var(--t3)', letterSpacing: '.7px', textTransform: 'uppercase', marginBottom: 4 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', background: 'var(--bg3)', border: '.5px solid var(--b2)', borderRadius: 'var(--r)', padding: '8px 11px', color: 'var(--t1)', fontSize: 13, outline: 'none', transition: 'border-color .15s' }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--ac)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--b2)')}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 500, color: 'var(--t3)', letterSpacing: '.7px', textTransform: 'uppercase', marginBottom: 4 }}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', background: 'var(--bg3)', border: '.5px solid var(--b2)', borderRadius: 'var(--r)', padding: '8px 11px', color: 'var(--t1)', fontSize: 13, outline: 'none', transition: 'border-color .15s' }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--ac)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--b2)')}
            onKeyDown={(e) => e.key === 'Enter' && openMusicApp()}
          />
        </div>

        <button
          onClick={openMusicApp}
          style={{ width: '100%', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r)', padding: '10px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'opacity .15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '.88')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Entrar
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
          <div style={{ flex: 1, height: '.5px', background: 'var(--b2)' }} />
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>ou</span>
          <div style={{ flex: 1, height: '.5px', background: 'var(--b2)' }} />
        </div>

        <button
          onClick={openMusicApp}
          style={{ width: '100%', background: 'var(--bg3)', border: '.5px solid var(--b2)', borderRadius: 'var(--r)', padding: '9px', fontSize: 12, color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'background .15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg4)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
        >
          <GoogleIcon />
          Continuar com Google
        </button>
      </motion.div>
    </motion.div>
  )
}

function GoogleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}
