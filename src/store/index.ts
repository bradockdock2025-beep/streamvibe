/**
 * Store exports — use these in new components.
 *
 * Migration strategy:
 *  - New components → use domain stores directly (useUIStore, useLibraryStore, etc.)
 *  - Existing components → still use useAppStore (unchanged, no breakage)
 *  - Over time, migrate existing components to domain stores as they are touched
 */

export { useUIStore }      from './useUIStore'
export { useLibraryStore } from './useLibraryStore'
export { usePlaylistStore } from './usePlaylistStore'
export { usePlayerStore }  from './usePlayerStore'

// Legacy monolithic store — kept for backwards compatibility
export { useAppStore } from './useAppStore'
