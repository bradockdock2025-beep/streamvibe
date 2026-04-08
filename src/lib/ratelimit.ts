/**
 * Rate limiting via Upstash Ratelimit.
 *
 * Falls back gracefully when UPSTASH_REDIS_REST_URL is not set
 * (local dev — all requests pass through).
 *
 * Limits:
 *   - Auth routes   : 10 req / 60s per IP  (prevent OTP spam)
 *   - Upload routes : 20 req / 60s per IP  (prevent storage abuse)
 *   - API reads     : 60 req / 60s per IP  (generous for normal usage)
 *   - API writes    : 30 req / 60s per IP
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

function makeRedis(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const redis = makeRedis()

function makeLimiter(requests: number, windowSeconds: number) {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    analytics: false,
    prefix: 'rl',
  })
}

const limiters = {
  auth:   makeLimiter(10, 60),
  upload: makeLimiter(20, 60),
  write:  makeLimiter(30, 60),
  read:   makeLimiter(60, 60),
}

type LimiterKey = keyof typeof limiters

/** Extract a stable identifier from the request (IP or fallback). */
function getIdentifier(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anonymous'
  )
}

/**
 * Apply rate limiting to a route.
 * Returns a 429 NextResponse if the limit is exceeded, otherwise null.
 *
 * Usage:
 *   const limited = await rateLimit(req, 'write')
 *   if (limited) return limited
 */
export async function rateLimit(
  req: NextRequest,
  type: LimiterKey = 'read',
): Promise<NextResponse | null> {
  const limiter = limiters[type]
  if (!limiter) return null // Redis not configured — pass through

  const id = getIdentifier(req)
  const { success, limit, remaining, reset } = await limiter.limit(id)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset':     String(reset),
          'Retry-After':           String(Math.ceil((reset - Date.now()) / 1000)),
        },
      },
    )
  }

  return null
}
