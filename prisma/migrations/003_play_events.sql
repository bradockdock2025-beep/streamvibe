-- ============================================================
-- Migration 003: Play events + Analytics functions
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Play table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Play" (
  "id"       TEXT        NOT NULL PRIMARY KEY,
  "trackId"  TEXT        NOT NULL,
  "userId"   TEXT        NOT NULL,
  "playedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "Play_trackId_fkey"
    FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_play_user_played" ON "Play" ("userId", "playedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_play_track_id"    ON "Play" ("trackId");

-- ── 2. RLS ────────────────────────────────────────────────────
ALTER TABLE "Play" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plays_select_owner" ON "Play";
CREATE POLICY "plays_select_owner" ON "Play"
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "plays_insert_owner" ON "Play";
CREATE POLICY "plays_insert_owner" ON "Play"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- ── 3. Analytics functions (called via supabaseAdmin.rpc()) ───

-- Top tracks by play count for a user
CREATE OR REPLACE FUNCTION get_top_tracks(p_user_id TEXT, p_limit INT DEFAULT 10)
RETURNS TABLE (
  track_id    TEXT,
  track_name  TEXT,
  dur         TEXT,
  artist_name TEXT,
  album_name  TEXT,
  cover       TEXT,
  play_count  BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    t.id,
    t.name,
    t.dur,
    ar.name,
    al.name,
    al.cover,
    COUNT(p.id)
  FROM "Play" p
  JOIN "Track"  t  ON t.id  = p."trackId"
  JOIN "Artist" ar ON ar.id = t."artistId"
  JOIN "Album"  al ON al.id = t."albumId"
  WHERE p."userId" = p_user_id
  GROUP BY t.id, t.name, t.dur, ar.name, al.name, al.cover
  ORDER BY COUNT(p.id) DESC
  LIMIT p_limit;
$$;

-- Top artists by play count for a user
CREATE OR REPLACE FUNCTION get_top_artists(p_user_id TEXT, p_limit INT DEFAULT 6)
RETURNS TABLE (
  artist_id   TEXT,
  artist_name TEXT,
  image       TEXT,
  play_count  BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    ar.id,
    ar.name,
    ar.image,
    COUNT(p.id)
  FROM "Play" p
  JOIN "Track"  t  ON t.id  = p."trackId"
  JOIN "Artist" ar ON ar.id = t."artistId"
  WHERE p."userId" = p_user_id
  GROUP BY ar.id, ar.name, ar.image
  ORDER BY COUNT(p.id) DESC
  LIMIT p_limit;
$$;

-- Recent play history
CREATE OR REPLACE FUNCTION get_play_history(p_user_id TEXT, p_limit INT DEFAULT 20)
RETURNS TABLE (
  play_id     TEXT,
  played_at   TIMESTAMPTZ,
  track_id    TEXT,
  track_name  TEXT,
  dur         TEXT,
  artist_name TEXT,
  cover       TEXT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id,
    p."playedAt",
    t.id,
    t.name,
    t.dur,
    ar.name,
    al.cover
  FROM "Play" p
  JOIN "Track"  t  ON t.id  = p."trackId"
  JOIN "Artist" ar ON ar.id = t."artistId"
  JOIN "Album"  al ON al.id = t."albumId"
  WHERE p."userId" = p_user_id
  ORDER BY p."playedAt" DESC
  LIMIT p_limit;
$$;

-- Aggregate stats for a user
CREATE OR REPLACE FUNCTION get_play_stats(p_user_id TEXT)
RETURNS TABLE (
  total_plays   BIGINT,
  plays_today   BIGINT,
  plays_week    BIGINT,
  unique_tracks BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COUNT(*)                                                          AS total_plays,
    COUNT(*) FILTER (WHERE p."playedAt" > NOW() - INTERVAL '1 day') AS plays_today,
    COUNT(*) FILTER (WHERE p."playedAt" > NOW() - INTERVAL '7 days')AS plays_week,
    COUNT(DISTINCT p."trackId")                                       AS unique_tracks
  FROM "Play" p
  WHERE p."userId" = p_user_id;
$$;
