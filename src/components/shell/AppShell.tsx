'use client'

import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Toast from '@/components/ui/Toast'

// VidKeep
import VidKeepSidebar from '@/components/vidkeep/VidKeepSidebar'
import VidKeepModule from '@/components/vidkeep/VidKeepModule'
import AddLinkModal from '@/components/vidkeep/AddLinkModal'
import NewFolderModal from '@/components/vidkeep/NewFolderModal'
import VideoModal from '@/components/vidkeep/VideoModal'

// Music — self-contained layout
import MusicLayout from '@/components/music/MusicLayout'

export default function AppShell() {
  const { module } = useAppStore(useShallow((s) => ({ module: s.module })))

  // Music module has its own self-contained layout
  if (module === 'mp') return <MusicLayout />

  // ── VidKeep shell ──
  return <VidKeepShell />
}

function VidKeepShell() {
  const {
    vkFolder, vkFolders, vkSearch, vkSelect, vkSetSearch, openAddModal,
  } = useAppStore(useShallow((s) => ({
    vkFolder: s.vkFolder,
    vkFolders: s.vkFolders,
    vkSearch: s.vkSearch,
    vkSelect: s.vkSelect,
    vkSetSearch: s.vkSetSearch,
    openAddModal: s.openAddModal,
  })))

  // Keyboard: Escape closes all modals
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        useAppStore.getState().closeAddModal()
        useAppStore.getState().closeNewFolderModal()
        useAppStore.getState().closeVideoModal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const breadcrumb = vkFolder === 'all' ? (
    <span style={{ color: 'var(--t1)', fontWeight: 500 }}>VidKeep · Todos</span>
  ) : (
    <>
      <span
        onClick={() => vkSelect('all')}
        style={{ cursor: 'pointer', transition: 'color .12s' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ach)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
      >
        VidKeep
      </span>
      <span style={{ opacity: .3 }}>/</span>
      <span style={{ color: 'var(--t1)', fontWeight: 500 }}>
        {vkFolders.find((f) => f.id === vkFolder)?.name ?? ''}
      </span>
    </>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar>
          <VidKeepSidebar />
        </Sidebar>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Topbar
            breadcrumb={breadcrumb}
            searchValue={vkSearch}
            onSearch={(q) => vkSetSearch(q.toLowerCase())}
            searchPlaceholder="Buscar vídeos..."
            showAdd={false}
            showUpload={false}
            onAdd={openAddModal}
            onUpload={() => {}}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <VidKeepModule />
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddLinkModal />
      <NewFolderModal />
      <VideoModal />

      {/* Toast */}
      <Toast />
    </div>
  )
}
