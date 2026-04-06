-- =============================================================================
-- LibraryMidia — Music Player Database Schema
-- Engine  : SQLite 3.x
-- ORM     : Prisma 7 (schema.prisma é a fonte de verdade)
-- Gerado  : 2026-04-05
--
-- Para executar manualmente:
--   sqlite3 prisma/dev.db < prisma/schema.sql
--
-- Ou via CLI do SQLite:
--   .open prisma/dev.db
--   .read prisma/schema.sql
--   .tables
-- =============================================================================

PRAGMA journal_mode = WAL;       -- melhor performance em leitura/escrita concorrente
PRAGMA foreign_keys = ON;        -- garante integridade referencial

-- =============================================================================
-- 1. ARTIST
--    Um artista pode ter vários álbuns e várias tracks (incluindo features).
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Artist" (
    "id"        TEXT    NOT NULL PRIMARY KEY,   -- cuid()
    "name"      TEXT    NOT NULL UNIQUE,        -- nome único do artista
    "image"     TEXT    NOT NULL DEFAULT '',    -- URL da foto/avatar
    "bio"       TEXT    NOT NULL DEFAULT '',    -- biografia curta
    "createdAt" TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS "Artist_name_idx" ON "Artist"("name");

-- =============================================================================
-- 2. ALBUM
--    Pertence a um Artist. Um artista pode ter muitos álbuns.
--    Restrição única: mesmo nome não pode repetir para o mesmo artista.
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Album" (
    "id"        TEXT    NOT NULL PRIMARY KEY,
    "name"      TEXT    NOT NULL,
    "year"      TEXT    NOT NULL DEFAULT '',    -- ex: "2019"
    "genre"     TEXT    NOT NULL DEFAULT '',    -- ex: "R&B"
    "cover"     TEXT    NOT NULL DEFAULT '',    -- URL da capa
    "artistId"  TEXT    NOT NULL,
    "createdAt" TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    CONSTRAINT "Album_artistId_fkey"
        FOREIGN KEY ("artistId") REFERENCES "Artist"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "Album_name_artistId_key"
        UNIQUE ("name", "artistId")
);

CREATE INDEX IF NOT EXISTS "Album_artistId_idx" ON "Album"("artistId");

-- =============================================================================
-- 3. TRACK
--    Pertence a um Album e a um Artist.
--    fileUrl aponta para o ficheiro áudio (/uploads/audio/... ou URL externa).
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Track" (
    "id"          TEXT    NOT NULL PRIMARY KEY,
    "name"        TEXT    NOT NULL,
    "trackNumber" INTEGER NOT NULL DEFAULT 0,
    "durationSec" INTEGER NOT NULL DEFAULT 0,   -- duração em segundos
    "dur"         TEXT    NOT NULL DEFAULT '0:00', -- display "3:22"
    "fileUrl"     TEXT    NOT NULL DEFAULT '',  -- caminho ou URL do áudio
    "fileSize"    INTEGER NOT NULL DEFAULT 0,   -- tamanho em bytes
    "format"      TEXT    NOT NULL DEFAULT '',  -- "MP3" | "FLAC" | "WAV" | "M4A"
    "genre"       TEXT    NOT NULL DEFAULT '',
    "albumId"     TEXT    NOT NULL,
    "artistId"    TEXT    NOT NULL,
    "createdAt"   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

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
--    Lista de reproducão criada pelo utilizador.
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Playlist" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "name"        TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt"   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- =============================================================================
-- 5. PLAYLIST_TRACK  (tabela de junção N:M)
--    Liga uma Playlist a várias Tracks com ordenação manual.
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
--    Gosto do utilizador numa track. Um trackId só pode ter um Like (único).
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Like" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "trackId"   TEXT NOT NULL UNIQUE,
    "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    CONSTRAINT "Like_trackId_fkey"
        FOREIGN KEY ("trackId") REFERENCES "Track"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================================================
-- VIEWS úteis para consultas comuns
-- =============================================================================

-- Vista: todas as tracks com informação do álbum e artista num único SELECT
CREATE VIEW IF NOT EXISTS "v_TrackFull" AS
SELECT
    t."id"          AS track_id,
    t."name"        AS track_name,
    t."trackNumber",
    t."dur",
    t."durationSec",
    t."fileUrl",
    t."format",
    t."genre"       AS track_genre,
    al."id"         AS album_id,
    al."name"       AS album_name,
    al."cover"      AS album_cover,
    al."year",
    ar."id"         AS artist_id,
    ar."name"       AS artist_name,
    ar."image"      AS artist_image,
    CASE WHEN l."id" IS NOT NULL THEN 1 ELSE 0 END AS liked
FROM "Track"  t
JOIN "Album"  al ON al."id" = t."albumId"
JOIN "Artist" ar ON ar."id" = t."artistId"
LEFT JOIN "Like" l ON l."trackId" = t."id";


-- Vista: álbuns com contagem de tracks e duração total
CREATE VIEW IF NOT EXISTS "v_AlbumSummary" AS
SELECT
    al."id",
    al."name",
    al."year",
    al."genre",
    al."cover",
    ar."name"  AS artist_name,
    ar."image" AS artist_image,
    COUNT(t."id")       AS track_count,
    SUM(t."durationSec") AS total_sec
FROM "Album"  al
JOIN "Artist" ar ON ar."id" = al."artistId"
LEFT JOIN "Track" t ON t."albumId" = al."id"
GROUP BY al."id";


-- =============================================================================
-- QUERIES de exemplo
-- =============================================================================

-- Todos os álbuns de um artista:
--   SELECT * FROM "v_AlbumSummary" WHERE artist_name = 'Khalid';

-- Todas as tracks de um álbum (ordenadas):
--   SELECT * FROM "v_TrackFull" WHERE album_id = '<id>' ORDER BY trackNumber;

-- Pesquisa full-text simples:
--   SELECT * FROM "v_TrackFull"
--   WHERE track_name LIKE '%blue%' OR artist_name LIKE '%blue%' OR album_name LIKE '%blue%';

-- Tracks com like:
--   SELECT * FROM "v_TrackFull" WHERE liked = 1;

-- Tracks de uma playlist (ordenadas):
--   SELECT vt.*, pt."order"
--   FROM "PlaylistTrack" pt
--   JOIN "v_TrackFull" vt ON vt.track_id = pt."trackId"
--   WHERE pt."playlistId" = '<id>'
--   ORDER BY pt."order";
