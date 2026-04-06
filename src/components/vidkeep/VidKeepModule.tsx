'use client'

import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import FolderCard from './FolderCard'
import VideoCard from './VideoCard'
import VidKeepQuickAdd from './VidKeepQuickAdd'

export default function VidKeepModule() {
  const { vkFolders, vkLinks, vkFolder, vkSearch, vkSelect } = useAppStore(useShallow((s) => ({
    vkFolders: s.vkFolders,
    vkLinks: s.vkLinks,
    vkFolder: s.vkFolder,
    vkSearch: s.vkSearch,
    vkSelect: s.vkSelect,
  })))

  const filteredLinks = (() => {
    let links = vkFolder === 'all' ? vkLinks : vkLinks.filter((l) => l.fid === vkFolder)
    if (vkSearch) links = links.filter((l) => l.title.toLowerCase().includes(vkSearch))
    return links
  })()

  const showFolders = vkFolder === 'all' && !vkSearch

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
      {/* Quick add — inline, no mouse travel */}
      <VidKeepQuickAdd />

      {/* Folder grid */}
      {showFolders && (
        <>
          <SectionTitle>Pastas</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 9, marginBottom: 18 }}>
            {vkFolders.map((f) => (
              <FolderCard
                key={f.id}
                folder={f}
                links={vkLinks.filter((l) => l.fid === f.id)}
                onClick={() => vkSelect(f.id)}
              />
            ))}
          </div>
          <SectionTitle>Todos os vídeos</SectionTitle>
        </>
      )}

      {/* Video grid */}
      {filteredLinks.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 9 }}>
          {filteredLinks.map((l) => (
            <VideoCard key={l.id} link={l} />
          ))}
        </div>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--t3)', letterSpacing: '.7px', textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, gap: 6 }}>
      <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, stroke: 'var(--t3)', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', opacity: .4 }}>
        <path d="M15 10l-4 4 4 4"/><path d="M2 12h14"/><rect x="14" y="4" width="8" height="16" rx="1"/>
      </svg>
      <p style={{ fontSize: 12, color: 'var(--t3)' }}>Sem vídeos ainda</p>
    </div>
  )
}
