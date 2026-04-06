import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const OUR_TABLES = ['Artist', 'Album', 'Track', 'Playlist', 'PlaylistTrack', 'Like']

  // ── 1. Variáveis de ambiente ────────────────────────────────────────────────
  const env = {
    url:              !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon_key:         !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    project:          process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID ?? null,
  }

  // ── 2. Verificar cada tabela + contar registos ──────────────────────────────
  const tables: Record<string, { exists: boolean; rows: number | null; error?: string }> = {}

  for (const table of OUR_TABLES) {
    try {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        tables[table] = {
          exists: error.code !== '42P01',   // 42P01 = table does not exist
          rows:   null,
          error:  error.message,
        }
      } else {
        tables[table] = { exists: true, rows: count ?? 0 }
      }
    } catch (err) {
      tables[table] = { exists: false, rows: null, error: String(err) }
    }
  }

  const allExist   = OUR_TABLES.every((t) => tables[t]?.exists)
  const anyError   = OUR_TABLES.some((t) => !!tables[t]?.error)
  const connected  = allExist || OUR_TABLES.some((t) => tables[t]?.exists)

  // ── 3. Resultado final ──────────────────────────────────────────────────────
  const status = {
    connection:  connected ? '✅ OK' : '❌ FAILED',
    env_vars:    Object.values(env).every(Boolean) ? '✅ Todas presentes' : '⚠️ Faltam variáveis',
    schema:      allExist ? '✅ Todas as tabelas existem' : anyError ? '⚠️ Algumas tabelas têm erros' : '❌ Tabelas em falta',
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    env,
    tables,
  }

  return NextResponse.json(status, { status: connected ? 200 : 500 })
}
