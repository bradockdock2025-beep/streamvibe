-- ============================================================
-- Migration 001: Multi-user support + Row Level Security (RLS)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. Add userId to Playlist ────────────────────────────────
ALTER TABLE "Playlist"
  ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT '';

-- ── 2. Add userId to Like ────────────────────────────────────
ALTER TABLE "Like"
  ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT '';

-- ── 3. Unique constraint: one like per user per track ────────
ALTER TABLE "Like"
  DROP CONSTRAINT IF EXISTS "Like_trackId_key";

ALTER TABLE "Like"
  ADD CONSTRAINT "Like_trackId_userId_unique" UNIQUE ("trackId", "userId");

-- ── 4. Indexes for performance ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_like_user     ON "Like"     ("userId");
CREATE INDEX IF NOT EXISTS idx_playlist_user ON "Playlist" ("userId");

CREATE INDEX IF NOT EXISTS idx_track_artist  ON "Track" ("artistId");
CREATE INDEX IF NOT EXISTS idx_track_album   ON "Track" ("albumId");
CREATE INDEX IF NOT EXISTS idx_album_artist  ON "Album" ("artistId");

-- Full-text search index on track name
CREATE INDEX IF NOT EXISTS idx_track_fts ON "Track"
  USING gin(to_tsvector('english', "name"));

-- ── 5. Enable RLS on user-scoped tables ──────────────────────
ALTER TABLE "Playlist"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Like"         ENABLE ROW LEVEL SECURITY;

-- ── 6. RLS Policies — Playlist ───────────────────────────────
-- Users can only see their own playlists
DROP POLICY IF EXISTS "playlists_select_owner" ON "Playlist";
CREATE POLICY "playlists_select_owner" ON "Playlist"
  FOR SELECT USING (auth.uid()::text = "userId");

-- Users can only insert playlists for themselves
DROP POLICY IF EXISTS "playlists_insert_owner" ON "Playlist";
CREATE POLICY "playlists_insert_owner" ON "Playlist"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Users can only update their own playlists
DROP POLICY IF EXISTS "playlists_update_owner" ON "Playlist";
CREATE POLICY "playlists_update_owner" ON "Playlist"
  FOR UPDATE USING (auth.uid()::text = "userId");

-- Users can only delete their own playlists
DROP POLICY IF EXISTS "playlists_delete_owner" ON "Playlist";
CREATE POLICY "playlists_delete_owner" ON "Playlist"
  FOR DELETE USING (auth.uid()::text = "userId");

-- ── 7. RLS Policies — Like ───────────────────────────────────
DROP POLICY IF EXISTS "likes_select_owner" ON "Like";
CREATE POLICY "likes_select_owner" ON "Like"
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "likes_insert_owner" ON "Like";
CREATE POLICY "likes_insert_owner" ON "Like"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "likes_delete_owner" ON "Like";
CREATE POLICY "likes_delete_owner" ON "Like"
  FOR DELETE USING (auth.uid()::text = "userId");

-- ── 8. Service role bypasses RLS (for admin operations) ──────
-- The supabaseAdmin client (service role key) bypasses RLS automatically.
-- No additional policy needed.

-- ── 9. Tracks/Albums/Artists — public read, admin write ──────
ALTER TABLE "Track"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Album"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Artist" ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "tracks_public_read"  ON "Track";
DROP POLICY IF EXISTS "albums_public_read"  ON "Album";
DROP POLICY IF EXISTS "artists_public_read" ON "Artist";

CREATE POLICY "tracks_public_read"  ON "Track"  FOR SELECT USING (true);
CREATE POLICY "albums_public_read"  ON "Album"  FOR SELECT USING (true);
CREATE POLICY "artists_public_read" ON "Artist" FOR SELECT USING (true);

-- Write access: service role only (handled by supabaseAdmin, bypasses RLS)

-- ── 10. PlaylistTrack — same owner as parent playlist ────────
ALTER TABLE "PlaylistTrack" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "playlisttrack_owner" ON "PlaylistTrack";
CREATE POLICY "playlisttrack_owner" ON "PlaylistTrack"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Playlist"
      WHERE "Playlist".id = "PlaylistTrack"."playlistId"
        AND "Playlist"."userId" = auth.uid()::text
    )
  );

-- ============================================================
-- After running this migration:
-- 1. Supabase Storage: increase max file size to 200 MB
--    Dashboard → Storage → Settings → Upload file size limit
-- 2. Supabase Auth: enable Email OTP
--    Dashboard → Auth → Providers → Email → Enable OTP
-- ============================================================
