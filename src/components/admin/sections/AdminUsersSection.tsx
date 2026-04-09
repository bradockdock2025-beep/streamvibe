'use client'

import { useEffect, useState } from 'react'
import { adminHeaders } from '@/lib/utils'

interface Row {
  id: string
  email: string
  createdAt: string
  lastSignInAt: string | null
  role: string
  banned: boolean
}

export default function AdminUsersSection() {
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/users', { headers: adminHeaders() })
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
        if (!cancelled) setRows((body.users ?? []) as Row[])
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Erro')
      })
    return () => { cancelled = true }
  }, [])

  if (err) {
    return <p style={{ color: 'var(--red)', fontSize: 13 }}>{err}</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ overflowX: 'auto', border: '1px solid var(--b2)', borderRadius: 'var(--r2)', background: 'var(--bg2)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--b2)', color: 'var(--t3)', textAlign: 'left' }}>
              <th style={{ padding: '10px 8px' }}>E-mail</th>
              <th style={{ padding: '10px 8px' }}>Papel</th>
              <th style={{ padding: '10px 8px' }}>Criado</th>
              <th style={{ padding: '10px 8px' }}>Último login</th>
              <th style={{ padding: '10px 8px' }}>Estado</th>
              <th style={{ padding: '10px 8px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: 'var(--t3)' }}>
                  A carregar…
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--b1)' }}>
                <td style={{ padding: '8px', color: 'var(--t1)' }}>{u.email}</td>
                <td style={{ padding: '8px', color: u.role === 'admin' ? 'var(--ach)' : 'var(--t2)' }}>{u.role}</td>
                <td style={{ padding: '8px', color: 'var(--t3)' }}>{u.createdAt?.slice(0, 10) ?? '—'}</td>
                <td style={{ padding: '8px', color: 'var(--t3)' }}>{u.lastSignInAt?.slice(0, 10) ?? '—'}</td>
                <td style={{ padding: '8px', color: u.banned ? 'var(--red)' : 'var(--teal)' }}>
                  {u.banned ? 'bloqueado' : 'ativo'}
                </td>
                <td style={{ padding: '8px' }}>
                  <ActionButton label="Bloquear" disabled title="Requer Supabase Auth Admin API" />
                  <ActionButton label="Resetar senha" disabled title="Envio por e-mail via Supabase" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section style={{ padding: 16, background: 'var(--bg2)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)' }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 8 }}>Atividades</h3>
        <p style={{ fontSize: 12, color: 'var(--t2)' }}>
          Histórico de streams, curtidas e playlists por utilizador: consulte as tabelas <code style={{ color: 'var(--ach)' }}>Play</code>,{' '}
          <code style={{ color: 'var(--ach)' }}>Like</code> e <code style={{ color: 'var(--ach)' }}>Playlist</code> no Supabase ou no módulo Música (estatísticas).
        </p>
      </section>

      <section style={{ padding: 16, background: 'var(--bg2)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)' }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 8 }}>Segmentação</h3>
        <p style={{ fontSize: 12, color: 'var(--t2)' }}>
          Grupos por localização, idade ou género — não há perfis demográficos neste schema. Pode ser adicionado com uma tabela de perfil e
          campanhas.
        </p>
      </section>
    </div>
  )
}

function ActionButton({ label, disabled, title }: { label: string; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      style={{
        marginRight: 8,
        background: 'none',
        border: '1px solid var(--b2)',
        color: disabled ? 'var(--t3)' : 'var(--t2)',
        borderRadius: 4,
        padding: '4px 8px',
        fontSize: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  )
}
