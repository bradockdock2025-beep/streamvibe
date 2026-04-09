'use client'

import { useEffect, useRef, useState } from 'react'
import { adminHeaders } from '@/lib/utils'

interface StreamsPayload {
  totalStreams30d: number
  avgStreamsPerDay: number
  uniqueListeners30d: number
  peakDay: { date: string; count: number }
  playsTimeline: { date: string; count: number }[]
  hourlyDistribution: { hour: number; count: number }[]
  genreDistribution: { genre: string; count: number }[]
  recentPlays: { playedAt: string; trackName: string; artistName: string }[]
  truncated: boolean
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TT { show: boolean; x: number; y: number; lines: string[] }
const hideTT: TT = { show: false, x: 0, y: 0, lines: [] }

function Tooltip({ tt }: { tt: TT }) {
  if (!tt.show) return null
  return (
    <div style={{
      position: 'absolute',
      left: tt.x + 14,
      top: tt.y - 10,
      zIndex: 100,
      background: '#1e1e28',
      border: '1px solid rgba(162,155,254,.3)',
      borderRadius: 8,
      padding: '8px 12px',
      pointerEvents: 'none',
      boxShadow: '0 8px 24px rgba(0,0,0,.5)',
      minWidth: 160, maxWidth: 240,
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminStreamAnalytics() {
  const [data, setData] = useState<StreamsPayload | null>(null)
  const [err, setErr]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/streams', { headers: adminHeaders() })
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
        if (!cancelled) setData(body as StreamsPayload)
      })
      .catch((e: unknown) => { if (!cancelled) setErr(e instanceof Error ? e.message : 'Erro ao carregar') })
    return () => { cancelled = true }
  }, [])

  if (err)   return <ErrorBox msg={err} />
  if (!data) return <Skeleton />

  const maxDay   = Math.max(1, ...data.playsTimeline.map((d) => d.count))
  const maxHour  = Math.max(1, ...data.hourlyDistribution.map((h) => h.count))
  const maxGenre = Math.max(1, ...data.genreDistribution.map((g) => g.count))
  const totalGenrePlays = data.genreDistribution.reduce((s, g) => s + g.count, 0)

  const peakHour    = data.hourlyDistribution.reduce((best, h) => h.count > best.count ? h : best, { hour: 0, count: 0 })
  const peakHourFmt = `${String(peakHour.hour).padStart(2, '0')}h–${String(peakHour.hour + 1).padStart(2, '0')}h`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── KPI Cards ── */}
      <SectionHeader
        title="Métricas de Streaming — Últimos 30 Dias"
        description="Visão global do consumo de conteúdo. Streams = cada vez que um utilizador inicia a reprodução de uma faixa."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 12 }}>
        <KpiCard
          icon={<PlayIcon />} iconColor="#a29bfe" iconBg="rgba(108,92,231,.15)"
          label="Total de Streams"
          value={fmt(data.totalStreams30d)}
          description="Reproduções iniciadas nos últimos 30 dias"
        />
        <KpiCard
          icon={<CalIcon />} iconColor="#74b9ff" iconBg="rgba(116,185,255,.12)"
          label="Média Diária"
          value={fmt(data.avgStreamsPerDay)}
          description="Streams por dia em média — mede a consistência de uso"
        />
        <KpiCard
          icon={<HeadphonesIcon />} iconColor="#1db954" iconBg="rgba(29,185,84,.15)"
          label="Ouvintes Únicos"
          value={fmt(data.uniqueListeners30d)}
          description="Utilizadores distintos que ouviram algo este mês"
        />
        <KpiCard
          icon={<PeakIcon />} iconColor="#fdcb6e" iconBg="rgba(253,203,110,.12)"
          label="Dia de Maior Tráfego"
          value={fmt(data.peakDay.count)}
          description={`Pico de streams num único dia: ${data.peakDay.date !== '—' ? data.peakDay.date : 'sem dados'}`}
        />
      </div>

      {/* ── Timeline ── */}
      <TimelineChart
        timeline={data.playsTimeline}
        peakDay={data.peakDay}
        maxDay={maxDay}
        truncated={data.truncated}
      />

      {/* ── Hourly + Genre ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <HourlyChart
          distribution={data.hourlyDistribution}
          maxHour={maxHour}
          peakHour={peakHour}
          peakHourFmt={peakHourFmt}
        />
        <GenreChart
          distribution={data.genreDistribution}
          maxGenre={maxGenre}
          totalGenrePlays={totalGenrePlays}
        />
      </div>

      {/* ── Recent plays ── */}
      <div>
        <SectionHeader
          title="Feed de Reproduções Recentes"
          description="As últimas 25 reproduções na plataforma, em tempo quase real. Permite ver o que está a ser ouvido agora e monitorizar actividade."
        />
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 10, overflow: 'hidden', marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg4)', borderBottom: '1px solid var(--b2)' }}>
                <Th>Faixa reproduzida</Th>
                <Th>Artista</Th>
                <Th align="right">Há quanto tempo</Th>
              </tr>
            </thead>
            <tbody>
              {data.recentPlays.length === 0 && (
                <tr><td colSpan={3} style={{ padding: 16, color: 'var(--t3)', textAlign: 'center', fontSize: 12 }}>Sem reproduções recentes</td></tr>
              )}
              {data.recentPlays.map((p, i) => (
                <RecentPlayRow key={i} play={p} isLast={i === data.recentPlays.length - 1} />
              ))}
            </tbody>
          </table>
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--b1)', fontSize: 10, color: 'var(--t3)' }}>
            🟢 ponto verde = reprodução activa recente · tempo em UTC
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Timeline Chart ───────────────────────────────────────────────────────────

function TimelineChart({ timeline, peakDay, maxDay, truncated }: {
  timeline: { date: string; count: number }[]
  peakDay: { date: string; count: number }
  maxDay: number
  truncated: boolean
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tt, setTT] = useState<TT>(hideTT)

  function showTT(e: React.MouseEvent, d: { date: string; count: number }, i: number, isToday: boolean, isPeak: boolean, isWeekend: boolean) {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = maxDay > 0 ? Math.round((d.count / maxDay) * 100) : 0
    const dow = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][new Date(d.date).getDay()]
    const tags = [isPeak && '🔥 Dia de pico', isToday && '📍 Hoje', isWeekend && '📅 Fim de semana'].filter(Boolean)
    const lines = [
      `${dow}, ${d.date}`,
      `${fmt(d.count)} streams`,
      `${pct}% do máximo (${fmt(maxDay)})`,
      ...(tags as string[]),
    ]
    setTT({ show: true, x: e.clientX - rect.left, y: e.clientY - rect.top, lines })
  }

  return (
    <div>
      <SectionHeader
        title="Evolução Diária de Streams"
        description="Número de streams por dia. Identifica tendências, efeitos de campanhas e sazonalidade. Barras douradas = fins de semana. Barra mais brilhante = dia de pico."
      />
      <div
        ref={wrapRef}
        style={{ background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 10, padding: '16px 16px 10px', marginTop: 10, position: 'relative' }}
        onMouseLeave={() => setTT(hideTT)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--t3)' }}>Streams por dia</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 10, color: '#fdcb6e' }}>▲ pico: {fmt(peakDay.count)} ({peakDay.date.slice(5)})</span>
            <span style={{ fontSize: 10, color: 'var(--ach)', fontWeight: 600 }}>máx: {fmt(maxDay)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140 }}>
          {timeline.map((d, i) => {
            const pct       = Math.max(4, (d.count / maxDay) * 100)
            const isToday   = i === timeline.length - 1
            const isPeak    = d.date === peakDay.date && d.count === peakDay.count
            const isWeekend = new Date(d.date).getDay() % 6 === 0
            return (
              <div
                key={d.date}
                style={{
                  flex: '1 0 7px', minWidth: 5, height: `${pct}%`, alignSelf: 'flex-end',
                  background: isPeak
                    ? 'linear-gradient(180deg, #fdcb6e, #e17055)'
                    : isToday
                    ? 'linear-gradient(180deg, #a29bfe, #6c5ce7)'
                    : isWeekend
                    ? 'rgba(253,203,110,.5)'
                    : 'linear-gradient(180deg, rgba(162,155,254,.65), rgba(108,92,231,.35))',
                  borderRadius: '3px 3px 2px 2px', cursor: 'default', transition: 'opacity .15s, transform .1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.75'
                  e.currentTarget.style.transform = 'scaleY(1.04)'
                  showTT(e, d, i, isToday, isPeak, isWeekend)
                }}
                onMouseMove={(e) => showTT(e, d, i, isToday, isPeak, isWeekend)}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.transform = 'scaleY(1)'
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
          <LegendDot color="linear-gradient(90deg,#fdcb6e,#e17055)" label="Dia de pico" />
          <LegendDot color="linear-gradient(90deg,#a29bfe,#6c5ce7)" label="Hoje" />
          <LegendDot color="rgba(253,203,110,.5)" label="Fim de semana" />
          <LegendDot color="rgba(162,155,254,.55)" label="Dia normal" />
        </div>
        <Tooltip tt={tt} />
      </div>
      {truncated && <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>⚠ Baseado em amostra de 40 000 streams. Dados completos via Supabase.</p>}
    </div>
  )
}

// ─── Hourly Chart ─────────────────────────────────────────────────────────────

function HourlyChart({ distribution, maxHour, peakHour, peakHourFmt }: {
  distribution: { hour: number; count: number }[]
  maxHour: number
  peakHour: { hour: number; count: number }
  peakHourFmt: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tt, setTT] = useState<TT>(hideTT)

  function showTT(e: React.MouseEvent, h: { hour: number; count: number }, isPeak: boolean, isDaytime: boolean) {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = maxHour > 0 ? Math.round((h.count / maxHour) * 100) : 0
    const slot = `${String(h.hour).padStart(2, '0')}h – ${String(h.hour + 1).padStart(2, '0')}h`
    const period = isPeak ? '🔥 Hora de pico' : isDaytime ? '☀️ Horário diurno' : '🌙 Horário nocturno'
    setTT({
      show: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      lines: [
        slot,
        `${fmt(h.count)} streams`,
        `${pct}% do pico (${fmt(peakHour.count)})`,
        period,
      ],
    })
  }

  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>Distribuição Horária de Streams (UTC)</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3, lineHeight: 1.4 }}>
          Mostra a que horas do dia os utilizadores ouvem mais. Cada barra = 1 hora. Barras azuis = horário diurno (8h–22h). Útil para agendar notificações e campanhas.
        </div>
        <div style={{ marginTop: 8, padding: '5px 8px', background: 'rgba(253,203,110,.08)', border: '1px solid rgba(253,203,110,.2)', borderRadius: 6 }}>
          <span style={{ fontSize: 11, color: '#fdcb6e' }}>
            🔥 Hora de pico: <strong>{peakHourFmt}</strong> com {fmt(peakHour.count)} streams
          </span>
        </div>
      </div>
      <div
        ref={wrapRef}
        style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 80, position: 'relative' }}
        onMouseLeave={() => setTT(hideTT)}
      >
        {distribution.map((h) => {
          const pct       = Math.max(6, (h.count / maxHour) * 100)
          const isDaytime = h.hour >= 8 && h.hour <= 22
          const isPeak    = h.hour === peakHour.hour
          return (
            <div
              key={h.hour}
              style={{
                flex: 1, height: `${pct}%`,
                background: isPeak
                  ? 'linear-gradient(180deg, #fdcb6e, #e17055)'
                  : isDaytime
                  ? 'linear-gradient(180deg, #74b9ff, rgba(116,185,255,.4))'
                  : 'rgba(116,185,255,.18)',
                borderRadius: '2px 2px 1px 1px', cursor: 'default', transition: 'opacity .15s, transform .1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.7'
                e.currentTarget.style.transform = 'scaleY(1.06)'
                showTT(e, h, isPeak, isDaytime)
              }}
              onMouseMove={(e) => showTT(e, h, isPeak, isDaytime)}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.transform = 'scaleY(1)'
              }}
            />
          )
        })}
        <Tooltip tt={tt} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--t3)' }}>00h (meia-noite)</span>
        <span style={{ fontSize: 10, color: 'var(--t3)' }}>12h (meio-dia)</span>
        <span style={{ fontSize: 10, color: 'var(--t3)' }}>23h</span>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--b1)', flexWrap: 'wrap' }}>
        <LegendDot color="linear-gradient(90deg,#fdcb6e,#e17055)" label="Pico" />
        <LegendDot color="#74b9ff" label="Diurno (8h–22h)" />
        <LegendDot color="rgba(116,185,255,.3)" label="Nocturno" />
      </div>
    </div>
  )
}

// ─── Genre Chart ──────────────────────────────────────────────────────────────

function GenreChart({ distribution, maxGenre, totalGenrePlays }: {
  distribution: { genre: string; count: number }[]
  maxGenre: number
  totalGenrePlays: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tt, setTT] = useState<TT>(hideTT)

  function showTT(e: React.MouseEvent, g: { genre: string; count: number }, rank: number, pct: number) {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const barPct = maxGenre > 0 ? Math.round((g.count / maxGenre) * 100) : 0
    setTT({
      show: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      lines: [
        `#${rank} ${g.genre}`,
        `${fmt(g.count)} streams (${pct}% do total)`,
        `${barPct}% face ao género líder`,
        `Total categorizado: ${fmt(totalGenrePlays)}`,
      ],
    })
  }

  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>Distribuição por Género Musical</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3, lineHeight: 1.4 }}>
          Percentagem de streams por género. A barra mostra o peso relativo de cada género face ao total. Essencial para decisões de curadoria e conteúdo futuro.
        </div>
      </div>
      {distribution.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--t3)' }}>Sem dados de género disponíveis</p>
      )}
      <div
        ref={wrapRef}
        style={{ position: 'relative' }}
        onMouseLeave={() => setTT(hideTT)}
      >
        {distribution.map((g, i) => {
          const pct = totalGenrePlays > 0 ? Math.round((g.count / totalGenrePlays) * 100) : 0
          return (
            <div
              key={g.genre}
              style={{ marginBottom: i < distribution.length - 1 ? 10 : 0, cursor: 'default', borderRadius: 4, padding: '3px 4px', transition: 'background .12s' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.03)'
                showTT(e, g, i + 1, pct)
              }}
              onMouseMove={(e) => showTT(e, g, i + 1, pct)}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{g.genre}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: 'var(--ach)', fontWeight: 600 }}>{pct}%</span>
                  <span style={{ fontSize: 10, color: 'var(--t3)' }}>{fmt(g.count)} plays</span>
                </div>
              </div>
              <div style={{ height: 5, background: 'var(--b2)', borderRadius: 3 }}>
                <div style={{
                  width: `${(g.count / maxGenre) * 100}%`, height: '100%',
                  background: `hsl(${260 - i * 22}, 68%, 62%)`,
                  borderRadius: 3, transition: 'width .3s ease',
                }} />
              </div>
            </div>
          )
        })}
        <Tooltip tt={tt} />
      </div>
      {totalGenrePlays > 0 && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--b1)', fontSize: 10, color: 'var(--t3)' }}>
          Total: {fmt(totalGenrePlays)} streams categorizados
        </div>
      )}
    </div>
  )
}

// ─── Recent Play Row ──────────────────────────────────────────────────────────

function RecentPlayRow({ play, isLast }: { play: { playedAt: string; trackName: string; artistName: string }; isLast: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <tr
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--b1)',
        background: hovered ? 'rgba(162,155,254,.04)' : 'transparent',
        transition: 'background .12s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={{ padding: '9px 14px', color: 'var(--t1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0, display: 'inline-block' }} />
          {play.trackName}
        </div>
      </td>
      <td style={{ padding: '9px 14px', color: 'var(--t2)' }}>{play.artistName}</td>
      <td style={{ padding: '9px 14px', color: 'var(--t3)', textAlign: 'right', whiteSpace: 'nowrap' }}>{timeAgo(play.playedAt)}</td>
    </tr>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function timeAgo(iso: string): string {
  if (!iso) return '—'
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 1)   return 'agora mesmo'
  if (m < 60)  return `há ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
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

function KpiCard({ icon, iconColor, iconBg, label, value, description }: {
  icon: React.ReactNode; iconColor: string; iconBg: string
  label: string; value: string; description: string
}) {
  return (
    <div
      style={{ padding: '14px 16px', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 10, transition: 'border-color .15s, transform .1s' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--b3)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--b2)'
        el.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        {icon}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginTop: 5 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4, lineHeight: 1.45 }}>{description}</div>
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--t3)', textAlign: align ?? 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </th>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return <div style={{ padding: 16, background: 'rgba(224,82,82,.08)', border: '1px solid rgba(224,82,82,.2)', borderRadius: 8 }}><p style={{ color: 'var(--red)', fontSize: 13 }}>{msg}</p></div>
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[80, 200, 160, 200].map((h, i) => (
        <div key={i} style={{ height: h, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--b2)', opacity: 0.5 }} />
      ))}
    </div>
  )
}

// Icons
function PlayIcon()       { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> }
function CalIcon()        { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function HeadphonesIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg> }
function PeakIcon()       { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> }
