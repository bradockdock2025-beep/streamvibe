import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''

if (!SUPABASE_URL) console.error('[supabase] NEXT_PUBLIC_SUPABASE_URL is not set')
if (!SUPABASE_ANON_KEY) console.error('[supabase] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set')

/** Public client — safe for Client Components and public API reads. */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
