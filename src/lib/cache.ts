/**
 * Redis cache layer via Upstash.
 *
 * Falls back gracefully when UPSTASH_REDIS_REST_URL is not set
 * (local dev without Redis configured).
 *
 * Usage:
 *   const cached = await cache.get<MyType>('key')
 *   if (cached) return cached
 *   const fresh = await fetchFromDb()
 *   await cache.set('key', fresh, 300) // TTL in seconds
 *   return fresh
 *
 *   await cache.del('key')          // single key
 *   await cache.delPattern('albums:*') // pattern (requires Upstash)
 */

import { Redis } from '@upstash/redis'

// TTL presets (seconds)
export const TTL = {
  albums:   5 * 60,   // 5 min
  artists:  5 * 60,   // 5 min
  tracks:   2 * 60,   // 2 min
  playlists: 60,       // 1 min (mutated more often)
}

// ─── Client ──────────────────────────────────────────────────────────────────

function makeRedis(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const redis = makeRedis()

// ─── Cache API ────────────────────────────────────────────────────────────────

// ─── Domain invalidation helpers ─────────────────────────────────────────────
// Call these after mutations to keep the cache consistent.

export async function invalidateAlbums() {
  // We use a version key approach — simpler than pattern matching
  // Any key that starts with 'albums:' should be busted.
  // Since Upstash free tier doesn't support SCAN, we use a version counter.
  if (!redis) return
  try {
    await redis.incr('albums:version')
  } catch { /* silent */ }
}

export async function invalidateArtists() {
  if (!redis) return
  try {
    await redis.incr('artists:version')
  } catch { /* silent */ }
}

// ─── Version-aware cache key builders ────────────────────────────────────────

export async function albumsCacheKey(suffix: string): Promise<string> {
  if (!redis) return `albums:${suffix}`
  try {
    const v = await redis.get<number>('albums:version') ?? 0
    return `albums:v${v}:${suffix}`
  } catch {
    return `albums:${suffix}`
  }
}

export async function artistsCacheKey(suffix: string): Promise<string> {
  if (!redis) return `artists:${suffix}`
  try {
    const v = await redis.get<number>('artists:version') ?? 0
    return `artists:v${v}:${suffix}`
  } catch {
    return `artists:${suffix}`
  }
}

export const cache = {
  /** Get a cached value. Returns null on miss or if Redis is not configured. */
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null
    try {
      return await redis.get<T>(key)
    } catch (e) {
      console.warn('[cache] get error', key, e)
      return null
    }
  },

  /** Set a value with TTL in seconds. No-op if Redis is not configured. */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!redis) return
    try {
      await redis.set(key, value, { ex: ttlSeconds })
    } catch (e) {
      console.warn('[cache] set error', key, e)
    }
  },

  /** Delete a single key. */
  async del(key: string): Promise<void> {
    if (!redis) return
    try {
      await redis.del(key)
    } catch (e) {
      console.warn('[cache] del error', key, e)
    }
  },

  /** Delete multiple keys at once. */
  async delMany(...keys: string[]): Promise<void> {
    if (!redis || !keys.length) return
    try {
      await redis.del(...keys)
    } catch (e) {
      console.warn('[cache] delMany error', keys, e)
    }
  },
}
