/**
 * Database utilities for Supabase.
 * The admin client is in @/lib/supabase-admin.
 * This module provides shared helpers used by route handlers.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

/** Generate a UUID for new records */
export const genId = (): string => crypto.randomUUID()

// ─── Typed row shapes (what Supabase returns) ─────────────────────────────────

export interface ArtistRow {
  id: string; name: string; image: string; bio: string; createdAt: string
}

export interface AlbumRow {
  id: string; name: string; year: string; genre: string; cover: string
  artistId: string; createdAt: string
  artist?: ArtistRow
  tracks?: TrackRow[]
}

export interface TrackRow {
  id: string; name: string; trackNumber: number; durationSec: number; dur: string
  fileUrl: string; fileSize: number; format: string; genre: string
  albumId: string; artistId: string; createdAt: string
}

// ─── Upsert helpers ──────────────────────────────────────────────────────────
// Uses a find-then-insert pattern to avoid overwriting existing PKs on conflict.

/** Upsert artist by name — returns existing or newly created row */
export async function upsertArtist(
  name: string,
  image = '',
  bio   = '',
): Promise<ArtistRow> {
  const { data: existing } = await supabaseAdmin
    .from('Artist')
    .select('*')
    .eq('name', name)
    .maybeSingle()

  if (existing) {
    if (image && existing.image !== image) {
      const { data } = await supabaseAdmin
        .from('Artist')
        .update({ image })
        .eq('id', existing.id)
        .select()
        .single()
      return (data ?? existing) as ArtistRow
    }
    return existing as ArtistRow
  }

  const { data, error } = await supabaseAdmin
    .from('Artist')
    .insert({ id: genId(), name, image, bio })
    .select()
    .single()

  if (error) throw new Error(`upsertArtist: ${error.message}`)
  return data as ArtistRow
}

/** Upsert album by (name, artistId) — returns existing or newly created row */
export async function upsertAlbum(
  name:     string,
  artistId: string,
  year  = '',
  genre = '',
  cover = '',
): Promise<AlbumRow> {
  const { data: existing } = await supabaseAdmin
    .from('Album')
    .select('*')
    .eq('name', name)
    .eq('artistId', artistId)
    .maybeSingle()

  if (existing) {
    if (cover && existing.cover !== cover) {
      await supabaseAdmin.from('Album').update({ cover }).eq('id', existing.id)
    }
    return existing as AlbumRow
  }

  const { data, error } = await supabaseAdmin
    .from('Album')
    .insert({ id: genId(), name, artistId, year, genre, cover })
    .select()
    .single()

  if (error) throw new Error(`upsertAlbum: ${error.message}`)
  return data as AlbumRow
}
