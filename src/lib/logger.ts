/**
 * Structured logger via Pino.
 *
 * Usage:
 *   import { log } from '@/lib/logger'
 *   log.info({ albumId }, 'Album fetched')
 *   log.error({ err, trackId }, 'Track upload failed')
 *
 * In development: human-readable output via pino-pretty.
 * In production:  JSON lines — compatible with Datadog, Logtail, Axiom, etc.
 */

import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const log = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    base: { service: 'hubapp' },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: pino.stdSerializers.err,
    },
  },
  isDev
    ? pino.transport({ target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } })
    : undefined,
)
