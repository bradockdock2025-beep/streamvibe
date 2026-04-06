import 'server-only'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!SUPABASE_URL) console.error('[supabase] NEXT_PUBLIC_SUPABASE_URL is not set')
if (!SUPABASE_SERVICE_KEY) console.error('[supabase] SUPABASE_SERVICE_ROLE_KEY is not set')

/**
 * Admin client — bypasses RLS.
 * Only use in Route Handlers and server-only lib files.
 */
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
