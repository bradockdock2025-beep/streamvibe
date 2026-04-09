'use client'

import { useEffect, useState } from 'react'
import { adminHeaders } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string
  email: string
  createdAt: string
  lastSignInAt: string | null
  role: string
  banned: boolean
}

interface UserDetail {
  id: string
  email: string
  createdAt: string
  lastSignInAt: string | null
  role: string
  banned: boolean
  totalPlaysAllTime: number
  playsLast30d: number
  uniqueTracks30d: number
  daysActive30d: number
  playsTimeline: { date: string; count: number }[]
  topTracks: { id: string; name: string; plays: number; artistName: string }[]
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminUsersSection() {
  const [rows, setRows]           = useState<UserRow[]>([])
  const [err, setErr]             = useState<string | null>(null)
  const [q, setQ]                 = useState('')
  const [selected, setSelected]   = useState<string | null>(null)
  const [detail, setDetail]       = useState<UserDetail | null>(null)
  const [detailErr, setDetailErr] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/users', { headers: adminHeaders() })
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
        if (!cancelled) setRows((body.users ?? []) as UserRow[])
      })
      .catch((e: unknown) => { if (!cancelled) setErr(e instanceof Error ? e.message : 'Erro') })
    return () => { cancelled = true }
  }, [])

  function openDetail(userId: string) {
    setSelected(userId)
    setDetail(null)
    setDetailErr(null)
    setDetailLoading(true)
    fetch(`/api/admin/users/${userId}`, { headers: adminHeaders() })
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
        setDetail(body as UserDetail)
      })
      .catch((e: unknown) => { setDetailErr(e instanceof Error ? e.message : 'Erro') })
      .finally(() => setDetailLoading(false))
  }

  function closeDetail() {
    setSelected(null)
    setDetail(null)
    setDetailErr(null)
  }

  const filtered = rows.filter((u) => {
    const s = q.trim().toLowerCase()
    return !s || u.email.toLowerCase().includes(s)
  })

  if (err) {
    return (
      <div style={{ padding: 20, background: 'rgba(224,82,82,.08)', border: '1px solid rgba(224,82,82,.2)', borderRadius: 8 }}>
        <p style={{ color: 'var(--red)', fontSize: 13 }}>{err}</p>
      </div>
    )
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <UserDetailView
        detail={detail}
        loading={detailLoading}
        err={detailErr}
        onBack={closeDetail}
      />
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Pesquisar por e-mail…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 33px',
              background: 'var(--bg3)', border: '1px solid var(--b2)',
              borderRadius: 8, color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit',
              outline: 'none', transition: 'border-color .15s',
            }}
            onFocus={(e)  => { e.currentTarget.style.borderColor = 'var(--ac)' }}
            onBlur={(e)   => { e.currentTarget.style.borderColor = 'var(--b2)' }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', flexShrink: 0 }}>
          {filtered.length} de {rows.length} utilizadores
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg4)', borderBottom: '1px solid var(--b2)' }}>
              {['E-mail', 'Papel', 'Criado', 'Último login', 'Estado', 'Analytics'].map((h) => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left',
                  fontSize: 11, fontWeight: 600, color: 'var(--t3)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--t3)' }}>
                  A carregar utilizadores…
                </td>
              </tr>
            )}
            {filtered.map((u, i) => (
              <UserTableRow
                key={u.id}
                user={u}
                isLast={i === filtered.length - 1}
                onViewAnalytics={() => openDetail(u.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Table row ────────────────────────────────────────────────────────────────

function UserTableRow({
  user, isLast, onViewAnalytics,
}: {
  user: UserRow; isLast: boolean; onViewAnalytics: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const initials = user.email.slice(0, 2).toUpperCase()

  return (
    <tr
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--b1)',
        background: hovered ? 'rgba(255,255,255,.025)' : 'transparent',
        transition: 'background .1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Email */}
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, hsl(${strHash(user.email) % 360}, 55%, 45%), hsl(${(strHash(user.email) + 120) % 360}, 55%, 35%))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>
          <span style={{ color: 'var(--t1)', fontSize: 13 }}>{user.email}</span>
        </div>
      </td>
      {/* Role */}
      <td style={{ padding: '10px 14px' }}>
        <RoleBadge role={user.role} />
      </td>
      {/* Created */}
      <td style={{ padding: '10px 14px', color: 'var(--t3)', whiteSpace: 'nowrap' }}>
        {user.createdAt?.slice(0, 10) ?? '—'}
      </td>
      {/* Last login */}
      <td style={{ padding: '10px 14px', color: 'var(--t3)', whiteSpace: 'nowrap' }}>
        {user.lastSignInAt?.slice(0, 10) ?? '—'}
      </td>
      {/* Status */}
      <td style={{ padding: '10px 14px' }}>
        <StatusBadge banned={user.banned} />
      </td>
      {/* Analytics */}
      <td style={{ padding: '10px 14px' }}>
        <button
          onClick={onViewAnalytics}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 6,
            border: '1px solid var(--b3)',
            background: hovered ? 'var(--acd)' : 'var(--bg4)',
            color: hovered ? 'var(--ach)' : 'var(--t2)',
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all .15s',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Ver analytics
        </button>
      </td>
    </tr>
  )
}

// ─── User detail view ─────────────────────────────────────────────────────────

function UserDetailView({
  detail, loading, err, onBack,
}: {
  detail: UserDetail | null; loading: boolean; err: string | null; onBack: () => void
}) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button onClick={onBack} style={backBtnStyle}>← Todos os utilizadores</button>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ height: 80, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--b2)', opacity: 0.5 }} />
        ))}
      </div>
    )
  }

  if (err || !detail) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button onClick={onBack} style={backBtnStyle}>← Todos os utilizadores</button>
        <div style={{ padding: 20, background: 'rgba(224,82,82,.08)', border: '1px solid rgba(224,82,82,.2)', borderRadius: 8 }}>
          <p style={{ color: 'var(--red)', fontSize: 13 }}>{err ?? 'Utilizador não encontrado'}</p>
        </div>
      </div>
    )
  }

  const maxDay   = Math.max(1, ...detail.playsTimeline.map((d) => d.count))
  const maxTrack = Math.max(1, ...detail.topTracks.map((t) => t.plays))
  const initials = detail.email.slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Back */}
      <button onClick={onBack} style={backBtnStyle}>
        ← Todos os utilizadores
      </button>

      {/* User header card */}
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 12,
        padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, hsl(${strHash(detail.email) % 360}, 55%, 45%), hsl(${(strHash(detail.email) + 120) % 360}, 55%, 35%))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#fff',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>{detail.email}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <RoleBadge role={detail.role} />
            <StatusBadge banned={detail.banned} />
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>
              Criado: {detail.createdAt?.slice(0, 10) ?? '—'}
            </span>
            {detail.lastSignInAt && (
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                Último login: {detail.lastSignInAt.slice(0, 10)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        <MiniKpi label="Plays (total)" value={fmt(detail.totalPlaysAllTime)} color="var(--ach)" />
        <MiniKpi label="Plays (30d)" value={fmt(detail.playsLast30d)} color="#74b9ff" />
        <MiniKpi label="Músicas únicas (30d)" value={fmt(detail.uniqueTracks30d)} color="var(--teal)" />
        <MiniKpi label="Dias ativos (30d)" value={String(detail.daysActive30d)} color="#fdcb6e" />
      </div>

      {/* Mini timeline */}
      <div>
        <h4 style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Actividade — últimos 30 dias
        </h4>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 2,
          height: 80, padding: '8px 12px 0',
          background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--b2)',
        }}>
          {detail.playsTimeline.map((d, i) => {
            const pct = Math.max(4, (d.count / maxDay) * 100)
            return (
              <div
                key={i}
                title={`${d.date}: ${d.count} plays`}
                style={{
                  flex: '1 0 5px', minWidth: 3,
                  height: `${pct}%`,
                  background: d.count > 0
                    ? 'linear-gradient(180deg, var(--ach), var(--ac))'
                    : 'var(--b2)',
                  borderRadius: '2px 2px 1px 1px',
                  alignSelf: 'flex-end',
                }}
              />
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, padding: '0 2px' }}>
          <span style={{ fontSize: 10, color: 'var(--t3)' }}>{detail.playsTimeline[0]?.date?.slice(5)}</span>
          <span style={{ fontSize: 10, color: 'var(--t3)' }}>hoje</span>
        </div>
      </div>

      {/* Top tracks */}
      {detail.topTracks.length > 0 && (
        <div>
          <h4 style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Top músicas (30 dias)
          </h4>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {detail.topTracks.map((t, i) => (
              <div key={t.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                    background: i === 0 ? 'rgba(253,203,110,.15)' : 'rgba(255,255,255,.05)',
                    color: i === 0 ? '#fdcb6e' : 'var(--t3)',
                  }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{t.artistName}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ach)', flexShrink: 0 }}>
                    {t.plays}×
                  </span>
                </div>
                <div style={{ marginTop: 5, height: 3, background: 'var(--b2)', borderRadius: 2 }}>
                  <div style={{ width: `${(t.plays / maxTrack) * 100}%`, height: '100%', background: 'var(--ach)', borderRadius: 2, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function strHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: isAdmin ? 'var(--acd)' : 'rgba(255,255,255,.06)',
      color: isAdmin ? 'var(--ach)' : 'var(--t3)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {role}
    </span>
  )
}

function StatusBadge({ banned }: { banned: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: banned ? 'rgba(224,82,82,.12)' : 'rgba(29,185,84,.12)',
      color: banned ? 'var(--red)' : 'var(--teal)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: banned ? 'var(--red)' : 'var(--teal)',
        display: 'inline-block',
      }} />
      {banned ? 'bloqueado' : 'ativo'}
    </span>
  )
}

function MiniKpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 8 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}

const backBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--t3)', fontSize: 13, fontFamily: 'inherit',
  padding: 0, transition: 'color .15s',
}
