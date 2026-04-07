'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'

type Mode = 'login' | 'signup'
type Step = 'email' | 'otp'

const ACCENT     = '#6c5ce7'
const ACCENT_DIM = 'rgba(108,92,231,.45)'
const BG         = '#0c0c0e'
const BORDER     = '#2a2a32'
const T1         = '#ededf0'
const T2         = '#9898a8'
const T3         = '#55556a'
const OTP_LEN    = 8
const RESEND_CD  = 60  // seconds

export default function AuthPage() {
  const setUser      = useAppStore((s) => s.setUser)
  const openMusicApp = useAppStore((s) => s.openMusicApp)

  const [mode,      setMode]      = useState<Mode>('login')
  const [step,      setStep]      = useState<Step>('email')
  const [email,     setEmail]     = useState('')
  const [otp,       setOtp]       = useState(Array(OTP_LEN).fill(''))
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [countdown, setCountdown] = useState(0)

  const otpRefs    = useRef<(HTMLInputElement | null)[]>([])
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setError('') }, [email, mode])

  // Countdown timer for resend
  const startCountdown = useCallback(() => {
    setCountdown(RESEND_CD)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0 }
        return c - 1
      })
    }, 1000)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // ── Send OTP ──────────────────────────────────────────────────────────────
  async function sendOtp() {
    if (!email.trim()) { setError('Enter your email to continue.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: mode === 'signup' },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('otp')
    setOtp(Array(OTP_LEN).fill(''))
    startCountdown()
    setTimeout(() => otpRefs.current[0]?.focus(), 140)
  }

  // ── Verify OTP ────────────────────────────────────────────────────────────
  async function verifyWithToken(token: string) {
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: 'email',
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    const u = data.user
    if (!u) { setError('Verification failed. Try again.'); return }
    const name     = u.user_metadata?.full_name || u.email?.split('@')[0] || 'User'
    const initials = name.slice(0, 2).toUpperCase()
    setUser({ name, email: u.email ?? '', initials })
    openMusicApp()
  }

  async function verifyOtp() {
    const token = otp.join('')
    if (token.length < OTP_LEN) { setError(`Enter the ${OTP_LEN}-digit code.`); return }
    verifyWithToken(token)
  }

  // ── Resend ────────────────────────────────────────────────────────────────
  async function resend() {
    if (countdown > 0) return
    await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: mode === 'signup' },
    })
    setOtp(Array(OTP_LEN).fill(''))
    setError('')
    startCountdown()
    setTimeout(() => otpRefs.current[0]?.focus(), 80)
  }

  // ── OTP handlers ──────────────────────────────────────────────────────────
  function handleOtpChange(i: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next  = [...otp]; next[i] = digit; setOtp(next)
    if (digit && i < OTP_LEN - 1) otpRefs.current[i + 1]?.focus()
    if (next.every((d) => d !== '')) verifyWithToken(next.join(''))
  }

  function handleOtpKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
    if (e.key === 'Enter') verifyOtp()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN)
    if (!text) return
    const next = Array(OTP_LEN).fill('')
    text.split('').forEach((c, i) => { next[i] = c })
    setOtp(next)
    otpRefs.current[Math.min(text.length, OTP_LEN - 1)]?.focus()
    if (text.length === OTP_LEN) verifyWithToken(text)
  }

  function switchMode(m: Mode) {
    setMode(m); setStep('email'); setError(''); setOtp(Array(OTP_LEN).fill(''))
  }

  function goBackToEmail() {
    setStep('email'); setError('')
    if (timerRef.current) clearInterval(timerRef.current)
    setCountdown(0)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: BG, padding: '24px 24px', overflowY: 'auto',
    }}>
      <AnimatePresence mode="wait">

        {/* ── Email step ── */}
        {step === 'email' && (
          <motion.div
            key={`email-${mode}`}
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            {/* Back */}
            <button
              onClick={() => switchMode(mode === 'login' ? 'login' : 'login')}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: T2, fontSize: 15, display: 'flex', alignItems: 'center', gap: 5, padding: 0, marginBottom: 28, fontWeight: 500 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ pointerEvents: 'none' }}><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>

            <SunIcon />

            <h1 style={{ fontSize: 36, fontWeight: 900, color: T1, letterSpacing: '-1.5px', textAlign: 'center', margin: '22px 0 0', lineHeight: 1.12, whiteSpace: 'pre-line' }}>
              {mode === 'login' ? 'Access your\naccount' : 'Create your\naccount'}
            </h1>

            <p style={{ fontSize: 17, fontWeight: 700, color: T1, marginTop: 18 }}>
              Get a code by email
            </p>
            <p style={{ fontSize: 14, color: T2, marginTop: 6, textAlign: 'center', lineHeight: 1.55 }}>
              {mode === 'login'
                ? "We'll send a temporary code to confirm access."
                : "We'll send a temporary code to confirm your registration."}
            </p>

            <div style={{ width: '100%', marginTop: 32 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: T1, display: 'block', marginBottom: 14 }}>
                Email
              </label>
              <input
                type="email" value={email} autoFocus
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                placeholder="you@example.com"
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  borderBottom: `1.5px solid ${error ? '#e05252' : BORDER}`,
                  outline: 'none', fontSize: 16, color: T1,
                  padding: '10px 0', boxSizing: 'border-box', transition: 'border-color .15s',
                }}
                onFocus={(e) => (e.target.style.borderBottomColor = error ? '#e05252' : ACCENT)}
                onBlur={(e) => (e.target.style.borderBottomColor = error ? '#e05252' : BORDER)}
              />
              <p style={{ fontSize: 12, color: error ? '#e05252' : T3, marginTop: 8, minHeight: 18 }}>
                {error || 'Enter your email to continue.'}
              </p>
            </div>

            <button
              onClick={sendOtp} disabled={loading}
              style={{
                width: '100%', marginTop: 20, padding: '16px',
                background: loading ? ACCENT_DIM : ACCENT,
                color: '#fff', border: 'none', borderRadius: 14,
                fontSize: 15, fontWeight: 600,
                cursor: loading ? 'default' : 'pointer', transition: 'opacity .15s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {loading ? 'Sending…' : 'Get code'}
            </button>

            <p style={{ fontSize: 13, color: T2, marginTop: 28 }}>
              {mode === 'login' ? (
                <>Don&apos;t have an account?{' '}
                  <span onClick={() => switchMode('signup')} style={{ color: '#a29bfe', fontWeight: 600, cursor: 'pointer' }}>
                    Create account
                  </span>
                </>
              ) : (
                <>Already have an account?{' '}
                  <span onClick={() => switchMode('login')} style={{ color: '#a29bfe', fontWeight: 600, cursor: 'pointer' }}>
                    Log in
                  </span>
                </>
              )}
            </p>
          </motion.div>
        )}

        {/* ── OTP step ── */}
        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            {/* Top back */}
            <button
              onClick={goBackToEmail}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: T2, fontSize: 15, display: 'flex', alignItems: 'center', gap: 5, padding: 0, marginBottom: 20, fontWeight: 500 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ pointerEvents: 'none' }}><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>

            <MailIcon />

            <h1 style={{ fontSize: 36, fontWeight: 900, color: T1, letterSpacing: '-1.5px', textAlign: 'center', margin: '22px 0 0' }}>
              Check your email
            </h1>
            <p style={{ fontSize: 17, fontWeight: 700, color: T1, marginTop: 14 }}>
              Enter your verification code
            </p>
            <p style={{ fontSize: 14, color: T2, marginTop: 8, textAlign: 'center', lineHeight: 1.55 }}>
              We sent a {OTP_LEN}-digit code to{' '}
              <strong style={{ color: T1, fontWeight: 600 }}>{email}</strong>
            </p>

            {/* OTP underline inputs */}
            <div style={{ display: 'flex', gap: 10, marginTop: 36, width: '100%', justifyContent: 'center' }} onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: 52 }}>
                  <input
                    ref={(el) => { otpRefs.current[i] = el }}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)}
                    style={{
                      width: '100%', background: 'transparent', border: 'none', outline: 'none',
                      fontSize: 24, fontWeight: 700, color: T1,
                      textAlign: 'center', padding: '4px 0 10px',
                      caretColor: ACCENT,
                    }}
                    onFocus={(e) => {
                      const bar = e.target.nextSibling as HTMLElement
                      if (bar) bar.style.background = error ? '#e05252' : ACCENT
                    }}
                    onBlur={(e) => {
                      const bar = e.target.nextSibling as HTMLElement
                      if (bar) bar.style.background = error ? '#e05252' : digit ? ACCENT : BORDER
                    }}
                  />
                  {/* Underline bar */}
                  <div style={{
                    height: 2, width: '100%', borderRadius: 2,
                    background: error ? '#e05252' : digit ? ACCENT : BORDER,
                    transition: 'background .15s',
                  }} />
                </div>
              ))}
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#e53e3e', marginTop: 14, textAlign: 'center' }}>{error}</p>
            )}

            <button
              onClick={verifyOtp} disabled={loading}
              style={{
                width: '100%', marginTop: 32, padding: '14px',
                background: loading ? ACCENT_DIM : ACCENT,
                color: '#fff', border: 'none', borderRadius: 14,
                fontSize: 15, fontWeight: 600,
                cursor: loading ? 'default' : 'pointer', transition: 'opacity .15s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '.88')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {loading ? 'Verifying…' : 'Verify code'}
            </button>

            {/* Resend with countdown */}
            <p style={{ fontSize: 13, color: T3, marginTop: 22 }}>
              Didn&apos;t receive it?{' '}
              {countdown > 0 ? (
                <span style={{ color: T3, fontWeight: 500 }}>Resend in {countdown}s</span>
              ) : (
                <span onClick={resend} style={{ color: '#a29bfe', fontWeight: 600, cursor: 'pointer' }}>
                  Resend code
                </span>
              )}
            </p>

            {/* Bottom back link */}
            <button
              onClick={goBackToEmail}
              style={{ marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', color: T3, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ pointerEvents: 'none' }}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function SunIcon() {
  return (
    <div style={{
      width: 74, height: 74, borderRadius: 20,
      background: 'linear-gradient(140deg, #8a7ff0 0%, #6c5ce7 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 10px 36px rgba(90,79,207,.28)',
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.95)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <line x1="12" y1="2" x2="12" y2="4"/>
        <line x1="12" y1="20" x2="12" y2="22"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="2" y1="12" x2="4" y2="12"/>
        <line x1="20" y1="12" x2="22" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    </div>
  )
}

function MailIcon() {
  return (
    <div style={{
      width: 74, height: 74, borderRadius: 20,
      background: 'linear-gradient(140deg, #8a7ff0 0%, #6c5ce7 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 10px 36px rgba(90,79,207,.28)',
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.95)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <polyline points="2,4 12,13 22,4"/>
      </svg>
    </div>
  )
}
