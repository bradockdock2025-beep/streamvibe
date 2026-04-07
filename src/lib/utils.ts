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
 * Works in both Client Components (NEXT_PUBLIC_ADMIN_SECRET) and server-side code.
 */
export function adminHeaders(): HeadersInit {
  const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET
  return secret ? { Authorization: `Bearer ${secret}` } : {}
}
