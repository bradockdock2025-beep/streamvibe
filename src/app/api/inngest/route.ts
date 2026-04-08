/**
 * Inngest serve endpoint.
 *
 * This route is called by Inngest to:
 *   - Discover and register your functions (GET /api/inngest)
 *   - Invoke function steps (POST /api/inngest)
 *
 * Local dev: start the Inngest Dev Server and point it at http://localhost:3000/api/inngest
 *   npx inngest-cli@latest dev
 *
 * Production: set in Inngest dashboard → App → URL = https://yourapp.com/api/inngest
 */

import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import {
  processTrackUpload,
  processAlbumUpload,
  processTrackDeleted,
} from '@/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processTrackUpload,
    processAlbumUpload,
    processTrackDeleted,
  ],
})
