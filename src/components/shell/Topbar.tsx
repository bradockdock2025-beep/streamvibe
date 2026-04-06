'use client'

import { useAppStore } from '@/store/useAppStore'

interface TopbarProps {
  breadcrumb: React.ReactNode
  onSearch: (q: string) => void
  searchValue: string
  searchPlaceholder: string
  onAdd?: () => void
  onUpload?: () => void
  showAdd: boolean
  showUpload: boolean
}

export default function Topbar({
  breadcrumb,
  onSearch,
  searchValue,
  searchPlaceholder,
  onAdd,
  onUpload,
  showAdd,
  showUpload,
}: TopbarProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 16px', height: 44,
      borderBottom: '.5px solid var(--b1)', flexShrink: 0,
    }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        {breadcrumb}
      </div>

      {/* Search */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg3)', border: '.5px solid var(--b2)', borderRadius: 'var(--r)', padding: '5px 10px', width: 200, transition: 'border-color .15s' }}
          onFocusCapture={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--ac)')}
          onBlurCapture={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)')}
        >
          <SearchIcon />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'var(--t1)', width: '100%' }}
          />
        </div>
      </div>

      {/* Actions */}
      {showAdd && (
        <button
          onClick={onAdd}
          title="Adicionar"
          style={{ width: 30, height: 30, background: 'var(--ac)', border: 'none', borderRadius: 'var(--r)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity .15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '.88')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}
      {showUpload && (
        <button
          onClick={onUpload}
          title="Upload"
          style={{ width: 30, height: 30, background: 'var(--teald)', border: '.5px solid var(--teal)', borderRadius: 'var(--r)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity .15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '.88')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
          </svg>
        </button>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
