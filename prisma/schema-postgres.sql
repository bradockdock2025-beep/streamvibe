-- =============================================================================
-- LibraryMidia — Music Player Database Schema
-- Engine  : PostgreSQL (Supabase)
-- Gerado  : 2026-04-05
--
-- Como executar:
--   Supabase Dashboard → SQL Editor → colar este ficheiro → Run
-- =============================================================================

-- =============================================================================
-- 1. ARTIST
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Artist" (
    "id"        TEXT        NOT NULL PRIMARY KEY,
    "name"      TEXT        NOT NULL UNIQUE,
    "image"     TEXT        NOT NULL DEFAULT '',
    "bio"       TEXT        NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Artist_name_idx" ON "Artist"("name");

-- =============================================================================
-- 2. ALBUM
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Album" (
    "id"        TEXT        NOT NULL PRIMARY KEY,
    "name"      TEXT        NOT NULL,
    "year"      TEXT        NOT NULL DEFAULT '',
    "genre"     TEXT        NOT NULL DEFAULT '',
    "cover"     TEXT        NOT NULL DEFAULT '',
    "artistId"  TEXT        NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "Album_artistId_fkey"
        FOREIGN KEY ("artistId") REFERENCES "Artist"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "Album_name_artistId_key"
        UNIQUE ("name", "artistId")
);

CREATE INDEX IF NOT EXISTS "Album_artistId_idx" ON "Album"("artistId");

-- =============================================================================
-- 3. TRACK
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Track" (
    "id"          TEXT        NOT NULL PRIMARY KEY,
    "name"        TEXT        NOT NULL,
    "trackNumber" INTEGER     NOT NULL DEFAULT 0,
    "durationSec" INTEGER     NOT NULL DEFAULT 0,
    "dur"         TEXT        NOT NULL DEFAULT '0:00',
    "fileUrl"     TEXT        NOT NULL DEFAULT '',
    "fileSize"    INTEGER     NOT NULL DEFAULT 0,
    "format"      TEXT        NOT NULL DEFAULT '',
    "genre"       TEXT        NOT NULL DEFAULT '',
    "albumId"     TEXT        NOT NULL,
    "artistId"    TEXT        NOT NULL,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "Track_albumId_fkey"
        FOREIGN KEY ("albumId") REFERENCES "Album"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "Track_artistId_fkey"
        FOREIGN KEY ("artistId") REFERENCES "Artist"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Track_albumId_idx"  ON "Track"("albumId");
CREATE INDEX IF NOT EXISTS "Track_artistId_idx" ON "Track"("artistId");

-- =============================================================================
-- 4. PLAYLIST
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Playlist" (
    "id"          TEXT        NOT NULL PRIMARY KEY,
    "name"        TEXT        NOT NULL,
    "description" TEXT        NOT NULL DEFAULT '',
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. PLAYLIST_TRACK
-- =============================================================================
CREATE TABLE IF NOT EXISTS "PlaylistTrack" (
    "id"         TEXT    NOT NULL PRIMARY KEY,
    "playlistId" TEXT    NOT NULL,
    "trackId"    TEXT    NOT NULL,
    "order"      INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlaylistTrack_playlistId_fkey"
        FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "PlaylistTrack_trackId_fkey"
        FOREIGN KEY ("trackId") REFERENCES "Track"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "PlaylistTrack_playlistId_trackId_key"
        UNIQUE ("playlistId", "trackId")
);

CREATE INDEX IF NOT EXISTS "PlaylistTrack_playlistId_idx" ON "PlaylistTrack"("playlistId");
CREATE INDEX IF NOT EXISTS "PlaylistTrack_trackId_idx"    ON "PlaylistTrack"("trackId");

-- =============================================================================
-- 6. LIKE
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Like" (
    "id"        TEXT        NOT NULL PRIMARY KEY,
    "trackId"   TEXT        NOT NULL UNIQUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "Like_trackId_fkey"
        FOREIGN KEY ("trackId") REFERENCES "Track"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================================================
-- VIEWS
-- =============================================================================
-- DROP first to allow column additions/reordering (PostgreSQL restriction)
DROP VIEW IF EXISTS "v_TrackFull";
DROP VIEW IF EXISTS "v_AlbumSummary";

CREATE OR REPLACE VIEW "v_TrackFull" AS
SELECT
    t."id"          AS track_id,
    t."name"        AS track_name,
    t."trackNumber",
    t."dur",
    t."durationSec",
    t."fileUrl",
    t."fileSize",
    t."format",
    t."genre"       AS track_genre,
    al."id"         AS album_id,
    al."name"       AS album_name,
    al."cover"      AS album_cover,
    al."year",
    ar."id"         AS artist_id,
    ar."name"       AS artist_name,
    ar."image"      AS artist_image,
    CASE WHEN l."id" IS NOT NULL THEN true ELSE false END AS liked
FROM "Track"   t
JOIN "Album"   al ON al."id" = t."albumId"
JOIN "Artist"  ar ON ar."id" = t."artistId"
LEFT JOIN "Like" l ON l."trackId" = t."id";


CREATE OR REPLACE VIEW "v_AlbumSummary" AS
SELECT
    al."id",
    al."name",
    al."year",
    al."genre",
    al."cover",
    ar."name"            AS artist_name,
    ar."image"           AS artist_image,
    COUNT(t."id")        AS track_count,
    COALESCE(SUM(t."durationSec"), 0) AS total_sec
FROM "Album"   al
JOIN "Artist"  ar ON ar."id" = al."artistId"
LEFT JOIN "Track" t ON t."albumId" = al."id"
GROUP BY al."id", ar."name", ar."image";
