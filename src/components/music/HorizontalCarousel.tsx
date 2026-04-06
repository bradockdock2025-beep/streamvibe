'use client'

import { useRef } from 'react'

interface HorizontalCarouselProps {
  title: string
  onSeeMore?: () => void
  children: React.ReactNode
}

export default function HorizontalCarousel({ title, onSeeMore, children }: HorizontalCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(dir: 'left' | 'right') {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'right' ? 340 : -340, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: 38 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-.3px' }}>{title}</h2>
          {onSeeMore && (
            <button
              onClick={onSeeMore}
              style={{
                fontSize: 11, fontWeight: 500,
                color: 'rgba(255,255,255,.32)', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                letterSpacing: '.5px', textTransform: 'uppercase',
                transition: 'color .12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.75)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.32)')}
            >
              See more
            </button>
          )}
        </div>
        {/* Navigation arrows */}
        <div style={{ display: 'flex', gap: 5 }}>
          <ArrowBtn dir="left"  onClick={() => scroll('left')} />
          <ArrowBtn dir="right" onClick={() => scroll('right')} />
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        style={{ display: 'flex', gap: 18, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}
      >
        {children}
      </div>
    </div>
  )
}

function ArrowBtn({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 27, height: 27, borderRadius: '50%',
        background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,.55)', transition: 'background .12s, color .12s, border-color .12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,.14)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,.25)'
        e.currentTarget.style.color = '#fff'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,.07)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'
        e.currentTarget.style.color = 'rgba(255,255,255,.55)'
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        {dir === 'left' ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
      </svg>
    </button>
  )
}
