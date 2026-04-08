'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Options {
  /** How many items to show per page. Default: 24 */
  pageSize?: number
  /** How many items are available in total */
  total: number
}

interface Result {
  /** Number of items currently visible */
  visibleCount: number
  /** Whether there are more items to load */
  hasMore: boolean
  /** Whether a load-more is in progress (used to show spinner) */
  loading: boolean
  /** Ref to attach to the sentinel element at the bottom of the list */
  sentinelRef: (node: HTMLDivElement | null) => void
  /** Manually reset to the first page (call when search/filter changes) */
  reset: () => void
}

/**
 * Infinite scroll over an in-memory list.
 *
 * Attach `sentinelRef` to a div at the end of the rendered list.
 * When it enters the viewport, `visibleCount` increases by `pageSize`.
 * No API calls — all items are already in memory.
 *
 * Usage:
 *   const { visibleCount, hasMore, loading, sentinelRef, reset } = useInfiniteScroll({ total: items.length })
 *   const visible = items.slice(0, visibleCount)
 *   return (
 *     <>
 *       {visible.map(...)}
 *       {hasMore && <div ref={sentinelRef} />}
 *       {loading && <Spinner />}
 *     </>
 *   )
 */
export function useInfiniteScroll({ pageSize = 24, total }: Options): Result {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [loading, setLoading] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelNodeRef = useRef<HTMLDivElement | null>(null)

  const hasMore = visibleCount < total

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return
    setLoading(true)
    // Small delay so the UI doesn't flash — feels more natural
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + pageSize, total))
      setLoading(false)
    }, 120)
  }, [hasMore, loading, pageSize, total])

  // Connect IntersectionObserver to the sentinel node
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      sentinelNodeRef.current = node
      if (!node) return

      observerRef.current = new IntersectionObserver(
        (entries) => { if (entries[0]?.isIntersecting) loadMore() },
        { rootMargin: '120px' },
      )
      observerRef.current.observe(node)
    },
    [loadMore],
  )

  // Re-observe the sentinel whenever loadMore changes (e.g. after loading resolves)
  useEffect(() => {
    const node = sentinelNodeRef.current
    if (!node || !hasMore) return
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore() },
      { rootMargin: '120px' },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [loadMore, hasMore])

  const reset = useCallback(() => {
    setVisibleCount(pageSize)
    setLoading(false)
  }, [pageSize])

  return { visibleCount, hasMore, loading, sentinelRef, reset }
}
