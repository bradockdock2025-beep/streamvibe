'use client'

interface DeleteButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>
  title: string
  busy?: boolean
  variant?: 'icon' | 'pill'
  label?: string
}

export default function DeleteButton({
  onClick,
  title,
  busy = false,
  variant = 'icon',
  label = 'Delete',
}: DeleteButtonProps) {
  if (variant === 'pill') {
    return (
      <button
        onClick={onClick}
        disabled={busy}
        title={title}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(224,82,82,.12)',
          border: '1px solid rgba(224,82,82,.26)',
          color: '#ff8f8f',
          borderRadius: 24,
          padding: '9px 18px',
          fontSize: 13,
          fontWeight: 600,
          cursor: busy ? 'default' : 'pointer',
          fontFamily: 'inherit',
          transition: 'background .15s, border-color .15s, opacity .15s',
          opacity: busy ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!busy) {
            e.currentTarget.style.background = 'rgba(224,82,82,.18)'
            e.currentTarget.style.borderColor = 'rgba(224,82,82,.38)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(224,82,82,.12)'
          e.currentTarget.style.borderColor = 'rgba(224,82,82,.26)'
        }}
      >
        <TrashIcon />
        {busy ? 'Deleting…' : label}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      title={title}
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        border: '1px solid rgba(224,82,82,.22)',
        background: 'rgba(20,20,26,.72)',
        color: '#ff8f8f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: busy ? 'default' : 'pointer',
        opacity: busy ? 0.7 : 1,
        transition: 'background .15s, border-color .15s, color .15s',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        if (!busy) {
          e.currentTarget.style.background = 'rgba(224,82,82,.14)'
          e.currentTarget.style.borderColor = 'rgba(224,82,82,.42)'
          e.currentTarget.style.color = '#ffc0c0'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(20,20,26,.72)'
        e.currentTarget.style.borderColor = 'rgba(224,82,82,.22)'
        e.currentTarget.style.color = '#ff8f8f'
      }}
    >
      <TrashIcon />
    </button>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
