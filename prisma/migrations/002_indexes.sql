-- ─── Migration 002: Performance Indexes ──────────────────────────────────────
--
-- Apply in Supabase → SQL Editor → Run
--
-- Covers:
--   1. Full-text search on Track name (GIN — fast @@ queries)
--   2. Foreign keys that Prisma does not index automatically
--   3. userId lookups on Like and Playlist (already added in 001, guard here)
--   4. createdAt ordering (used by all list queries)
--   5. Composite unique that replaces the old Like unique constraint

-- ── 1. Full-text search ───────────────────────────────────────────────────────

-- Track name FTS (English stemming)
CREATE INDEX IF NOT EXISTS idx_track_fts_name
  ON "Track" USING gin(to_tsvector('simple', "name"));

-- Artist name FTS
CREATE INDEX IF NOT EXISTS idx_artist_fts_name
  ON "Artist" USING gin(to_tsvector('simple', "name"));

-- Album name FTS
CREATE INDEX IF NOT EXISTS idx_album_fts_name
  ON "Album" USING gin(to_tsvector('simple', "name"));

-- ── 2. Track foreign keys + ordering ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_track_album_id
  ON "Track" ("albumId");

CREATE INDEX IF NOT EXISTS idx_track_artist_id
  ON "Track" ("artistId");

-- Track ordering within an album
CREATE INDEX IF NOT EXISTS idx_track_album_number
  ON "Track" ("albumId", "trackNumber" ASC);

-- ── 3. Album foreign key + ordering ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_album_artist_id
  ON "Album" ("artistId");

CREATE INDEX IF NOT EXISTS idx_album_created_at
  ON "Album" ("createdAt" DESC);

-- ── 4. Artist ordering ────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_artist_name_asc
  ON "Artist" ("name" ASC);

CREATE INDEX IF NOT EXISTS idx_artist_created_at
  ON "Artist" ("createdAt" DESC);

-- ── 5. Like — userId lookups ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_like_user_id
  ON "Like" ("userId");

CREATE INDEX IF NOT EXISTS idx_like_track_id
  ON "Like" ("trackId");

-- ── 6. Playlist — userId lookups + ordering ───────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_playlist_user_id
  ON "Playlist" ("userId");

CREATE INDEX IF NOT EXISTS idx_playlist_created_at
  ON "Playlist" ("createdAt" DESC);

-- ── 7. PlaylistTrack — ordering within playlist ───────────────────────────────

CREATE INDEX IF NOT EXISTS idx_playlist_track_playlist_id
  ON "PlaylistTrack" ("playlistId");

CREATE INDEX IF NOT EXISTS idx_playlist_track_order
  ON "PlaylistTrack" ("playlistId", "order" ASC);

-- ── 8. ILIKE acceleration (pg_trgm) ──────────────────────────────────────────
-- Enables fast ILIKE '%search%' queries used by the search endpoints.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_track_name_trgm
  ON "Track" USING gin("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_artist_name_trgm
  ON "Artist" USING gin("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_album_name_trgm
  ON "Album" USING gin("name" gin_trgm_ops);
