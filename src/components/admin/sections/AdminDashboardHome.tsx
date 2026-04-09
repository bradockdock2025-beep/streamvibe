'use client'

import { useEffect, useRef, useState } from 'react'
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

// ─── Tooltip state ────────────────────────────────────────────────────────────
interface TT { show: boolean; x: number; y: number; lines: string[] }
const hideTT: TT = { show: false, x: 0, y: 0, lines: [] }

export default function AdminDashboardHome() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [err, setErr]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/dashboard', { headers: adminHeaders() })
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
        if (!cancelled) setData(body as DashboardPayload)
      })
      .catch((e: unknown) => { if (!cancelled) setErr(e instanceof Error ? e.message : 'Erro ao carregar') })
    return () => { cancelled = true }
  }, [])

  if (err)   return <ErrorBox msg={err} />
  if (!data) return <Skeleton />

  const maxDay    = Math.max(1, ...data.playsTimeline.map((d) => d.count))
  const maxTrack  = Math.max(1, ...data.topTracks.map((t) => t.plays))
  const maxArtist = Math.max(1, ...data.topArtists.map((a) => a.plays))
  const maxAlbum  = Math.max(1, ...data.topAlbums.map((a) => a.plays))

  const activeRatio  = data.usersTotal > 0 ? Math.round((data.usersActive30d / data.usersTotal) * 100) : 0
  const contentTotal = data.tracksTotal + data.albumsTotal + data.artistsTotal
  const avgStreamsDay = Math.round(data.playsLast30Days / 30)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── KPI Cards ── */}
      <SectionHeader
        title="Resumo da Plataforma"
        description="Indicadores-chave actualizados em tempo real. Medem o tamanho da base de utilizadores, volume de streams e estado do catálogo."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 12 }}>
        <KpiCard icon={<UsersKpiIcon />} iconColor="#a29bfe" iconBg="rgba(108,92,231,.15)"
          label="Utilizadores Totais" value={fmt(data.usersTotal)}
          description="Contas registadas na plataforma desde o início" />
        <KpiCard icon={<ActiveIcon />} iconColor="#1db954" iconBg="rgba(29,185,84,.15)"
          label="Activos (últimos 30 dias)" value={fmt(data.usersActive30d)}
          description={`${activeRatio}% da base total ouviu pelo menos 1 faixa este mês`}
          highlight={activeRatio >= 50 ? 'good' : activeRatio >= 20 ? 'warn' : 'low'} />
        <KpiCard icon={<StreamKpiIcon />} iconColor="#74b9ff" iconBg="rgba(116,185,255,.12)"
          label="Streams (30 dias)" value={fmt(data.playsLast30Days)}
          description={`Reproduções iniciadas nos últimos 30 dias. Média: ${fmt(avgStreamsDay)}/dia`} />
        <KpiCard icon={<NewUserIcon />} iconColor="#fdcb6e" iconBg="rgba(253,203,110,.12)"
          label="Novos Utilizadores (7 dias)" value={fmt(data.newSignupsWeek)}
          description="Contas criadas nos últimos 7 dias — indicador de crescimento recente" />
        <KpiCard icon={<ContentKpiIcon />} iconColor="#fd79a8" iconBg="rgba(253,121,168,.12)"
          label="Itens no Catálogo" value={fmt(contentTotal)}
          description={`${data.tracksTotal} faixas · ${data.albumsTotal} álbuns · ${data.artistsTotal} artistas`} />
      </div>

      {/* ── Timeline ── */}
      <div>
        <SectionHeader
          title="Volume de Streams — Últimos 30 Dias"
          description="Cada barra = total de reproduções num dia. Identifica picos, quedas e padrões semanais. Passa o cursor sobre uma barra para ver os dados exactos."
        />
        <TimelineChart timeline={data.playsTimeline} maxDay={maxDay} truncated={data.truncatedPlays} />
      </div>

      {/* ── Top performers ── */}
      <div>
        <SectionHeader
          title="Top Performers — Últimos 30 Dias"
          description="Rankings pelo número total de reproduções. Passa o cursor sobre um item para ver o detalhe."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 10 }}>
          <RankList title="Top Faixas"
            what="Músicas mais reproduzidas. Nº = plays totais no período."
            accentColor="#a29bfe"
            rows={data.topTracks.map((t) => ({ label: t.name, sub: t.artistName, meta: t.albumName, plays: t.plays }))}
            max={maxTrack} />
          <RankList title="Top Artistas"
            what="Artistas com mais plays somados em todas as suas faixas."
            accentColor="#1db954"
            rows={data.topArtists.map((a) => ({ label: a.name, sub: 'artista', meta: '', plays: a.plays }))}
            max={maxArtist} />
          <RankList title="Top Álbuns"
            what="Álbuns com mais reproduções somadas em todas as faixas."
            accentColor="#74b9ff"
            rows={data.topAlbums.map((a) => ({ label: a.name, sub: 'álbum', meta: '', plays: a.plays }))}
            max={maxAlbum} />
        </div>
      </div>

      {/* ── User growth ── */}
      <div>
        <SectionHeader
          title="Saúde da Base de Utilizadores"
          description="Compara utilizadores activos e novos face ao total. Taxa de activação &gt;40% é saudável. Taxa de novos &gt;5%/semana indica crescimento acelerado."
        />
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 10, padding: '16px 20px', marginTop: 10, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <GrowthBar
            label="Taxa de Activação (30 dias)"
            sublabel="Utilizadores que ouviram ≥1 faixa este mês vs. total de contas"
            value={data.usersActive30d} total={data.usersTotal}
            color="var(--teal)" goodThreshold={40} />
          <GrowthBar
            label="Taxa de Crescimento Semanal"
            sublabel="Novas contas esta semana vs. total acumulado"
            value={data.newSignupsWeek} total={data.usersTotal}
            color="var(--ach)" goodThreshold={5} />
        </div>
      </div>
    </div>
  )
}

// ─── Timeline chart with hover tooltip ───────────────────────────────────────

function TimelineChart({ timeline, maxDay, truncated }: {
  timeline: { date: string; count: number }[]
  maxDay: number
  truncated: boolean
}) {
  const [tt, setTT] = useState<TT>(hideTT)
  const wrapRef = useRef<HTMLDivElement>(null)

  function showTip(e: React.MouseEvent, d: { date: string; count: number }, isToday: boolean, isPeak: boolean) {
    const wrap = wrapRef.current?.getBoundingClientRect()
    if (!wrap) return
    const x = e.clientX - wrap.left
    const y = e.clientY - wrap.top
    const dow = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][new Date(d.date).getDay()]
    const lines = [
      `📅 ${d.date} (${dow})`,
      `▶  ${d.count.toLocaleString()} streams`,
      `📊 ${maxDay > 0 ? Math.round((d.count / maxDay) * 100) : 0}% do pico mensal`,
      ...(isPeak ? ['🔥 Dia de maior tráfego'] : []),
      ...(isToday ? ['🟢 Hoje'] : []),
    ]
    setTT({ show: true, x, y, lines })
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 10, padding: '16px 16px 10px', marginTop: 10 }}>
      <Tooltip tt={tt} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--t3)' }}>Streams por dia</span>
        <span style={{ fontSize: 10, color: 'var(--ach)', fontWeight: 600 }}>máx: {fmt(maxDay)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140 }}>
        {timeline.map((d, i) => {
          const pct      = Math.max(4, (d.count / maxDay) * 100)
          const isToday  = i === timeline.length - 1
          const isPeak   = d.count === maxDay && maxDay > 0
          const isWeekend = new Date(d.date).getDay() % 6 === 0
          return (
            <div
              key={d.date}
              style={{
                flex: '1 0 7px', minWidth: 5, height: `${pct}%`, alignSelf: 'flex-end',
                background: isPeak
                  ? 'linear-gradient(180deg,#fdcb6e,#e17055)'
                  : isToday
                  ? 'linear-gradient(180deg,#a29bfe,#6c5ce7)'
                  : isWeekend
                  ? 'rgba(253,203,110,.5)'
                  : 'linear-gradient(180deg,rgba(162,155,254,.65),rgba(108,92,231,.35))',
                borderRadius: '3px 3px 2px 2px', cursor: 'crosshair',
                transition: 'opacity .1s, transform .1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.75'
                e.currentTarget.style.transform = 'scaleY(1.04)'
                showTip(e, d, isToday, isPeak)
              }}
              onMouseMove={(e) => showTip(e, d, isToday, isPeak)}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.transform = 'scaleY(1)'
                setTT(hideTT)
              }}
            />
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {[0, 6, 13, 20, 29].map((i) => (
          <span key={i} style={{ fontSize: 10, color: 'var(--t3)' }}>{timeline[i]?.date?.slice(5) ?? ''}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10, padding: '8px 0 0', borderTop: '1px solid var(--b1)', flexWrap: 'wrap' }}>
        <LegendDot color="linear-gradient(90deg,#fdcb6e,#e17055)" label="Pico mensal" />
        <LegendDot color="linear-gradient(90deg,#a29bfe,#6c5ce7)" label="Hoje" />
        <LegendDot color="rgba(253,203,110,.5)" label="Fim de semana" />
        <LegendDot color="rgba(162,155,254,.55)" label="Dia normal" />
      </div>
      {truncated && <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>⚠ Amostra de 40 000 streams.</p>}
    </div>
  )
}

// ─── Rank list with hover tooltip ────────────────────────────────────────────

function RankList({ title, what, accentColor, rows, max }: {
  title: string; what: string; accentColor: string
  rows: { label: string; sub: string; meta: string; plays: number }[]
  max: number
}) {
  const [tt, setTT] = useState<TT>(hideTT)
  const wrapRef = useRef<HTMLDivElement>(null)

  function showTip(e: React.MouseEvent, r: { label: string; sub: string; meta: string; plays: number }, rank: number) {
    const wrap = wrapRef.current?.getBoundingClientRect()
    if (!wrap) return
    const lines = [
      `#${rank} — ${r.label}`,
      r.sub ? `👤 ${r.sub}` : '',
      r.meta ? `💿 ${r.meta}` : '',
      `▶  ${r.plays.toLocaleString()} plays`,
      `📊 ${Math.round((r.plays / max) * 100)}% do líder`,
    ].filter(Boolean)
    setTT({ show: true, x: e.clientX - wrap.left, y: e.clientY - wrap.top, lines })
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 10, padding: '14px 16px' }}>
      <Tooltip tt={tt} />
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3, lineHeight: 1.4 }}>{what}</div>
      </div>
      {rows.length === 0 && <p style={{ fontSize: 12, color: 'var(--t3)' }}>Sem dados suficientes</p>}
      {rows.map((r, i) => (
        <div
          key={i}
          style={{ marginBottom: i < rows.length - 1 ? 11 : 0, cursor: 'default', borderRadius: 6, padding: '3px 4px', transition: 'background .1s' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,.04)'
            showTip(e, r, i + 1)
          }}
          onMouseMove={(e) => showTip(e, r, i + 1)}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; setTT(hideTT) }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 20, height: 20, borderRadius: 4, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              background: i === 0 ? 'rgba(253,203,110,.2)' : i === 1 ? 'rgba(178,190,195,.12)' : i === 2 ? 'rgba(253,121,168,.12)' : 'rgba(255,255,255,.05)',
              color: i === 0 ? '#fdcb6e' : i === 1 ? '#b2bec3' : i === 2 ? '#fd79a8' : 'var(--t3)',
            }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 1 }}>{r.sub}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>{fmt(r.plays)}</div>
              <div style={{ fontSize: 9, color: 'var(--t3)' }}>plays</div>
            </div>
          </div>
          <div style={{ marginTop: 5, height: 3, background: 'var(--b2)', borderRadius: 2 }}>
            <div style={{ width: `${(r.plays / max) * 100}%`, height: '100%', background: accentColor, borderRadius: 2, opacity: 0.6 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Tooltip({ tt }: { tt: TT }) {
  if (!tt.show) return null
  const OFFSET = 14
  return (
    <div style={{
      position: 'absolute',
      left: tt.x + OFFSET,
      top: tt.y - 10,
      zIndex: 100,
      background: '#1e1e28',
      border: '1px solid rgba(162,155,254,.3)',
      borderRadius: 8,
      padding: '8px 12px',
      pointerEvents: 'none',
      boxShadow: '0 8px 24px rgba(0,0,0,.5)',
      minWidth: 160,
      maxWidth: 220,
    }}>
      {tt.lines.map((line, i) => (
        <div key={i} style={{
          fontSize: i === 0 ? 12 : 11,
          fontWeight: i === 0 ? 600 : 400,
          color: i === 0 ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.55)',
          marginBottom: i < tt.lines.length - 1 ? 3 : 0,
          lineHeight: 1.4,
        }}>
          {line}
        </div>
      ))}
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: 2 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>{title}</h3>
      <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>{description}</p>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ fontSize: 10, color: 'var(--t3)' }}>{label}</span>
    </div>
  )
}

function KpiCard({ icon, iconColor, iconBg, label, value, description, highlight }: {
  icon: React.ReactNode; iconColor: string; iconBg: string
  label: string; value: string; description: string; highlight?: 'good' | 'warn' | 'low'
}) {
  const hlColor = highlight === 'good' ? 'var(--teal)' : highlight === 'warn' ? '#fdcb6e' : highlight === 'low' ? 'var(--red)' : undefined
  return (
    <div style={{ padding: '14px 16px', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 10, transition: 'border-color .15s, transform .15s' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--b3)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: hlColor ?? 'var(--t2)', marginTop: 5 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4, lineHeight: 1.45 }}>{description}</div>
    </div>
  )
}

function GrowthBar({ label, sublabel, value, total, color, goodThreshold }: {
  label: string; sublabel: string; value: number; total: number; color: string; goodThreshold: number
}) {
  const pct    = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  const isGood = pct >= goodThreshold
  return (
    <div style={{ flex: '1 1 220px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {pct}%
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--t3)', marginLeft: 4 }}>({fmt(value)} / {fmt(total)})</span>
        </span>
      </div>
      <div style={{ height: 7, background: 'var(--b2)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.4 }}>{sublabel}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: isGood ? 'var(--teal)' : '#fdcb6e', flexShrink: 0, marginLeft: 8 }}>
          {isGood ? '✓ saudável' : '↗ em crescimento'}
        </span>
      </div>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return <div style={{ padding: 16, background: 'rgba(224,82,82,.08)', border: '1px solid rgba(224,82,82,.2)', borderRadius: 8 }}><p style={{ color: 'var(--red)', fontSize: 13 }}>{msg}</p></div>
}
function Skeleton() {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{[80, 200, 160].map((h, i) => <div key={i} style={{ height: h, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--b2)', opacity: 0.5 }} />)}</div>
}
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
function UsersKpiIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function ActiveIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> }
function StreamKpiIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> }
function NewUserIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> }
function ContentKpiIcon(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> }
