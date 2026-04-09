'use client'

import { useEffect, useState } from 'react'
import { adminHeaders } from '@/lib/utils'

export interface DashboardPayload {
  usersTotal: number
  usersActive30d: number
  newSignupsWeek: number
  tracksTotal: number
  playlistsTotal: number
  albumsTotal: number
  artistsTotal: number
  playsLast30Days: number
  playsTimeline: { date: string; count: number }[]
  topTracks: { id: string; name: string; plays: number; artistName: string; albumName: string }[]
  topArtists: { id: string; name: string; plays: number }[]
  topAlbums: { id: string; name: string; plays: number }[]
  revenue: null
  sharesAvailable: boolean
  truncatedPlays: boolean
}

export default function AdminDashboardHome() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/dashboard', { headers: adminHeaders() })
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
        if (!cancelled) setData(body as DashboardPayload)
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Erro ao carregar')
      })
    return () => { cancelled = true }
  }, [])

  if (err) {
    return (
      <p style={{ color: 'var(--red)', fontSize: 13 }}>{err}</p>
    )
  }

  if (!data) {
    return <p style={{ color: 'var(--t3)', fontSize: 13 }}>A carregar métricas…</p>
  }

  const maxDay = Math.max(1, ...data.playsTimeline.map((d) => d.count))
  const maxTop = Math.max(1, ...data.topTracks.map((t) => t.plays), ...data.topArtists.map((a) => a.plays), ...data.topAlbums.map((a) => a.plays))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 12,
        }}
      >
        <Card label="Utilizadores (auth)" value={String(data.usersTotal)} hint="Total registados" />
        <Card label="Ativos (30 dias)" value={String(data.usersActive30d)} hint="Com pelo menos 1 play" />
        <Card label="Novos (7 dias)" value={String(data.newSignupsWeek)} hint="Cadastros recentes" />
        <Card label="Músicas" value={String(data.tracksTotal)} hint="Faixas na base" />
        <Card label="Playlists" value={String(data.playlistsTotal)} hint="Biblioteca" />
        <Card label="Streams (30 dias)" value={String(data.playsLast30Days)} hint="Eventos de play" />
        <Card label="Receita" value="—" hint="Sem plano premium configurado" dim />
      </div>

      {data.truncatedPlays && (
        <p style={{ fontSize: 11, color: 'var(--t3)' }}>
          Nota: amostra limitada a 40k plays para agregação. Totais globais usam contagem exata onde aplicável.
        </p>
      )}

      <section>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Plays por dia (últimos 30 dias)
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 2,
            height: 120,
            padding: 16,
            background: 'var(--bg2)',
            borderRadius: 'var(--r2)',
            border: '1px solid var(--b2)',
            overflowX: 'auto',
          }}
        >
          {data.playsTimeline.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count}`}
              style={{
                flex: '1 0 6px',
                minWidth: 4,
                height: `${Math.max(4, (d.count / maxDay) * 100)}%`,
                background: 'linear-gradient(180deg, var(--ac), var(--ach))',
                borderRadius: 2,
                opacity: 0.85,
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Crescimento de utilizadores
        </h3>
        <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10 }}>
          Novos na última semana: <strong style={{ color: 'var(--t1)' }}>{data.newSignupsWeek}</strong> · Total: {data.usersTotal}
        </p>
        <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', maxWidth: 400 }}>
          <div
            style={{
              width: `${data.usersTotal ? Math.min(100, (data.newSignupsWeek / data.usersTotal) * 100) : 0}%`,
              height: '100%',
              background: 'var(--teal)',
              borderRadius: 4,
            }}
          />
        </div>
        <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8 }}>
          Proporção novos/total (7 dias). Séries históricas por dia requerem armazenamento adicional.
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <RankList title="Top faixas (30 dias)" rows={data.topTracks.map((t) => ({ label: t.name, sub: `${t.artistName} · ${t.plays} plays`, plays: t.plays }))} max={maxTop} />
        <RankList title="Top artistas" rows={data.topArtists.map((a) => ({ label: a.name, sub: 'plays', plays: a.plays }))} max={maxTop} />
        <RankList title="Top álbuns" rows={data.topAlbums.map((a) => ({ label: a.name, sub: 'plays', plays: a.plays }))} max={maxTop} />
      </div>

      <section style={{ padding: 16, background: 'var(--bg2)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)' }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 8 }}>Partilhas</h3>
        <p style={{ fontSize: 12, color: 'var(--t2)' }}>
          {data.sharesAvailable ? 'Dados disponíveis.' : 'Rastreio de partilhas não está ligado a uma tabela neste projeto.'}
        </p>
      </section>
    </div>
  )
}

function Card({ label, value, hint, dim }: { label: string; value: string; hint: string; dim?: boolean }) {
  return (
    <div
      style={{
        padding: 14,
        background: 'var(--bg2)',
        border: '1px solid var(--b2)',
        borderRadius: 'var(--r2)',
        opacity: dim ? 0.85 : 1,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: dim ? 'var(--t2)' : 'var(--t1)', marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>{hint}</div>
    </div>
  )
}

function RankList({
  title,
  rows,
  max,
}: {
  title: string
  rows: { label: string; sub: string; plays: number }[]
  max: number
}) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)', padding: 14 }}>
      <h4 style={{ fontSize: 11, fontWeight: 600, color: 'var(--ach)', marginBottom: 10 }}>{title}</h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.length === 0 && <li style={{ fontSize: 12, color: 'var(--t3)' }}>Sem dados</li>}
        {rows.map((r, i) => (
          <li key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--t1)' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
              <span style={{ color: 'var(--teal)', flexShrink: 0 }}>{r.plays}</span>
            </div>
            <div
              style={{
                marginTop: 4,
                height: 3,
                background: 'var(--bg3)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(r.plays / max) * 100}%`,
                  height: '100%',
                  background: 'var(--teal)',
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{r.sub}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
