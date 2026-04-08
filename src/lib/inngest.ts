/**
 * Inngest client — shared singleton for sending events and serving functions.
 *
 * Local dev: events are queued in memory (no Inngest Dev Server required).
 * Production: set INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY from app.inngest.com.
 */

import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id:       'soneker',
  eventKey: process.env.INNGEST_EVENT_KEY ?? 'local',
})
