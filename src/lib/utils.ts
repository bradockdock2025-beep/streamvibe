import { getAuthToken } from './auth-client'

export function parseDur(s: string): number {
  const [m, sec] = s.split(':').map(Number)
  return m * 60 + sec
}

export function fmtDur(s: number): string {
  return `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`
}

export function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

let counter = 0
export function uid(): string {
  return `${Date.now()}_${++counter}`
}

/**
 * Returns the Authorization header for write API routes.
 * Uses the Supabase JWT stored in auth-client — never exposes secrets to the client.
 */
export function adminHeaders(): HeadersInit {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
