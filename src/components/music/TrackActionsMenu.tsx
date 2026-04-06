'use client'

import { useEffect, useRef, useState } from 'react'

interface TrackActionsMenuProps {
  liked?: boolean
  onToggleLike?: () => void | Promise<void>
  onAddToPlaylist?: () => void | Promise<void>
  onGoToAlbum?: () => void | Promise<void>
  onGoToArtist?: () => void | Promise<void>
  onRemoveFromPlaylist?: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
  deleteLabel?: string
  removeLabel?: string
}

interface MenuAction {
  key: string
  label: string
  icon: React.ReactNode
  active?: boolean
  danger?: boolean
  onSelect: () => void | Promise<void>
}

const MENU_WIDTH = 228

export default function TrackActionsMenu({
  liked = false,
  onToggleLike,
  onAddToPlaylist,
  onGoToAlbum,
  onGoToArtist,
  onRemoveFromPlaylist,
  onDelete,
  deleteLabel = 'Delete Track',
  removeLabel = 'Remove From Playlist',
}: TrackActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const primaryActions: MenuAction[] = []
  if (onAddToPlaylist) {
    primaryActions.push({
      key: 'playlist',
      label: 'Add To Playlist',
      icon: <AddToPlaylistIcon />,
      onSelect: onAddToPlaylist,
    })
  }
  if (onToggleLike) {
    primaryActions.push({
      key: 'like',
      label: liked ? 'Remove Like' : 'Like',
      icon: <LikeIcon filled={liked} />,
      active: liked,
      onSelect: onToggleLike,
    })
  }
  if (onGoToAlbum) {
    primaryActions.push({
      key: 'album',
      label: 'Go To Album',
      icon: <AlbumIcon />,
      onSelect: onGoToAlbum,
    })
  }
  if (onGoToArtist) {
    primaryActions.push({
      key: 'artist',
      label: 'Go To Artist',
      icon: <ArtistIcon />,
      onSelect: onGoToArtist,
    })
  }

  const destructiveActions: MenuAction[] = []
  if (onRemoveFromPlaylist) {
    destructiveActions.push({
      key: 'remove',
      label: removeLabel,
      icon: <RemoveIcon />,
      danger: true,
      onSelect: onRemoveFromPlaylist,
    })
  }
  if (onDelete) {
    destructiveActions.push({
      key: 'delete',
      label: deleteLabel,
      icon: <DeleteIcon />,
      danger: true,
      onSelect: onDelete,
    })
  }

  function updatePosition() {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const menuHeight = menuRef.current?.offsetHeight ?? 260
    const showAbove = rect.bottom + 8 + menuHeight > window.innerHeight - 12 && rect.top > menuHeight + 12
    const top = showAbove
      ? Math.max(12, rect.top - menuHeight - 8)
      : Math.min(window.innerHeight - menuHeight - 12, rect.bottom + 8)
    const left = Math.min(window.innerWidth - MENU_WIDTH - 12, Math.max(12, rect.right - MENU_WIDTH))

    setCoords({ top, left })
  }

  useEffect(() => {
    if (!open) return

    const raf = window.requestAnimationFrame(updatePosition)

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    function onViewportChange() {
      updatePosition()
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [open])

  async function selectAction(action: MenuAction) {
    setOpen(false)
    await action.onSelect()
  }

  if (primaryActions.length === 0 && destructiveActions.length === 0) return null

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        title="More actions"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: 'none',
          background: open ? 'rgba(255,255,255,.1)' : 'transparent',
          color: open ? '#fff' : 'rgba(255,255,255,.34)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'background .12s, color .12s',
          flexShrink: 0,
        }}
        onMouseEnter={(event) => {
          if (open) return
          event.currentTarget.style.background = 'rgba(255,255,255,.06)'
          event.currentTarget.style.color = 'rgba(255,255,255,.82)'
        }}
        onMouseLeave={(event) => {
          if (open) return
          event.currentTarget.style.background = 'transparent'
          event.currentTarget.style.color = 'rgba(255,255,255,.34)'
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: MENU_WIDTH,
            background: 'linear-gradient(180deg, #20212a 0%, #17181f 100%)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 14,
            boxShadow: '0 24px 56px rgba(0,0,0,.52)',
            padding: 8,
            zIndex: 160,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {primaryActions.map((action) => (
              <MenuItem key={action.key} action={action} onSelect={selectAction} />
            ))}
          </div>

          {primaryActions.length > 0 && destructiveActions.length > 0 && (
            <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '8px 4px' }} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {destructiveActions.map((action) => (
              <MenuItem key={action.key} action={action} onSelect={selectAction} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function MenuItem({
  action,
  onSelect,
}: {
  action: MenuAction
  onSelect: (action: MenuAction) => Promise<void>
}) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation()
        void onSelect(action)
      }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        border: 'none',
        borderRadius: 10,
        background: action.active ? 'rgba(29,185,84,.11)' : 'transparent',
        color: action.active ? '#76e7a0' : action.danger ? 'rgba(255,164,164,.9)' : 'rgba(255,255,255,.78)',
        padding: '10px 12px',
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'inherit',
        transition: 'background .12s, color .12s',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = action.active ? 'rgba(29,185,84,.14)' : 'rgba(255,255,255,.06)'
        if (!action.active && !action.danger) event.currentTarget.style.color = '#fff'
        if (action.danger) event.currentTarget.style.color = '#ffd1d1'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = action.active ? 'rgba(29,185,84,.11)' : 'transparent'
        event.currentTarget.style.color = action.active ? '#76e7a0' : action.danger ? 'rgba(255,164,164,.9)' : 'rgba(255,255,255,.78)'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, flexShrink: 0 }}>
        {action.icon}
      </span>
      <span>{action.label}</span>
    </button>
  )
}

function AddToPlaylistIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M4 7h10"/><path d="M4 12h10"/><path d="M4 17h6"/><path d="M18 11v8"/><path d="M14 15h8"/>
    </svg>
  )
}

function LikeIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function AlbumIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.6"/>
    </svg>
  )
}

function ArtistIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function RemoveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M4 12h16"/>
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}
