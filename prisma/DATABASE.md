# LibraryMidia — Documentação do Banco de Dados

**Engine:** SQLite 3.x  
**ORM:** Prisma 7 (`prisma/schema.prisma` é a fonte de verdade)  
**Ficheiro DB:** `prisma/dev.db`  
**SQL manual:** `prisma/schema.sql`

---

## Diagrama de Relações (ERD)

```
Artist ──────< Album ──────< Track
  │                             │
  │ (artistId)                  │ (trackId)
  └─────────────────────────────┤
                                ├──< PlaylistTrack >── Playlist
                                └──< Like
```

---

## Tabelas

### `Artist`

| Coluna      | Tipo    | Constraints        | Descrição              |
|-------------|---------|-------------------|------------------------|
| `id`        | TEXT    | PK, cuid()        | Identificador único    |
| `name`      | TEXT    | UNIQUE, NOT NULL  | Nome do artista        |
| `image`     | TEXT    | DEFAULT ''        | URL da foto/avatar     |
| `bio`       | TEXT    | DEFAULT ''        | Biografia              |
| `createdAt` | TEXT    | DEFAULT now()     | Data de criação (ISO)  |

**Relações:**
- Um artista tem **muitos** `Album`
- Um artista tem **muitas** `Track` (incluindo features)

---

### `Album`

| Coluna      | Tipo    | Constraints                    | Descrição                  |
|-------------|---------|-------------------------------|----------------------------|
| `id`        | TEXT    | PK, cuid()                    | Identificador único        |
| `name`      | TEXT    | NOT NULL                      | Nome do álbum              |
| `year`      | TEXT    | DEFAULT ''                    | Ano de lançamento ("2019") |
| `genre`     | TEXT    | DEFAULT ''                    | Género musical             |
| `cover`     | TEXT    | DEFAULT ''                    | URL da capa                |
| `artistId`  | TEXT    | FK → Artist.id (CASCADE)      | Artista do álbum           |
| `createdAt` | TEXT    | DEFAULT now()                 | Data de criação            |

**Restrição única:** `(name, artistId)` — o mesmo artista não pode ter dois álbuns com o mesmo nome.

**Relações:**
- Pertence a um `Artist`
- Tem muitas `Track`

---

### `Track`

| Coluna        | Tipo    | Constraints               | Descrição                              |
|---------------|---------|--------------------------|----------------------------------------|
| `id`          | TEXT    | PK, cuid()               | Identificador único                    |
| `name`        | TEXT    | NOT NULL                 | Nome da faixa                          |
| `trackNumber` | INTEGER | DEFAULT 0                | Número da faixa no álbum               |
| `durationSec` | INTEGER | DEFAULT 0                | Duração em segundos                    |
| `dur`         | TEXT    | DEFAULT '0:00'           | Duração para display ("3:22")          |
| `fileUrl`     | TEXT    | DEFAULT ''               | Caminho `/uploads/audio/...` ou URL    |
| `fileSize`    | INTEGER | DEFAULT 0                | Tamanho do ficheiro em bytes           |
| `format`      | TEXT    | DEFAULT ''               | "MP3" \| "FLAC" \| "WAV" \| "M4A"    |
| `genre`       | TEXT    | DEFAULT ''               | Género da faixa                        |
| `albumId`     | TEXT    | FK → Album.id (CASCADE)  | Álbum a que pertence                   |
| `artistId`    | TEXT    | FK → Artist.id (RESTRICT)| Artista da faixa                       |
| `createdAt`   | TEXT    | DEFAULT now()            | Data de criação                        |

**Relações:**
- Pertence a um `Album` (cascade delete — se o álbum for eliminado, as tracks também)
- Pertence a um `Artist`
- Pode estar em muitas `Playlist` via `PlaylistTrack`
- Pode ter um `Like`

---

### `Playlist`

| Coluna        | Tipo | Constraints   | Descrição           |
|---------------|------|--------------|---------------------|
| `id`          | TEXT | PK, cuid()   | Identificador único |
| `name`        | TEXT | NOT NULL     | Nome da playlist    |
| `description` | TEXT | DEFAULT ''   | Descrição           |
| `createdAt`   | TEXT | DEFAULT now()| Data de criação     |

**Conceito:**
- A playlist é uma coleção lógica e ordenável de tracks já existentes.
- Criar playlist não duplica ficheiros de áudio.
- Eliminar playlist remove a playlist e os vínculos em `PlaylistTrack`, não remove as tracks originais.

---

### `PlaylistTrack` *(tabela de junção N:M)*

| Coluna       | Tipo    | Constraints                       | Descrição             |
|--------------|---------|----------------------------------|-----------------------|
| `id`         | TEXT    | PK, cuid()                       | Identificador único   |
| `playlistId` | TEXT    | FK → Playlist.id (CASCADE)       | Playlist              |
| `trackId`    | TEXT    | FK → Track.id (CASCADE)          | Track                 |
| `order`      | INTEGER | DEFAULT 0                        | Posição na playlist   |

**Restrição única:** `(playlistId, trackId)` — uma track não pode aparecer duas vezes na mesma playlist.

---

### `Like`

| Coluna      | Tipo | Constraints              | Descrição           |
|-------------|------|-------------------------|---------------------|
| `id`        | TEXT | PK, cuid()              | Identificador único |
| `trackId`   | TEXT | UNIQUE, FK → Track.id   | Track com gosto     |
| `createdAt` | TEXT | DEFAULT now()           | Data do gosto       |

> `trackId` é UNIQUE → cada track só pode ter um like (modelo single-user).  
> Quando multi-user for implementado, adicionar `userId` e mudar o UNIQUE para `(userId, trackId)`.

---

## Views

### `v_TrackFull`
Track completa com informação do álbum e artista num único `SELECT`. Inclui coluna `liked` (0/1).

```sql
SELECT * FROM v_TrackFull WHERE artist_name = 'Khalid';
SELECT * FROM v_TrackFull WHERE liked = 1;
SELECT * FROM v_TrackFull WHERE track_name LIKE '%blue%';
```

### `v_AlbumSummary`
Álbum com `track_count` e `total_sec` calculados.

```sql
SELECT * FROM v_AlbumSummary ORDER BY year DESC;
SELECT * FROM v_AlbumSummary WHERE artist_name = 'Frank Ocean';
```

---

## Como usar manualmente

### Criar o banco do zero
```bash
sqlite3 prisma/dev.db < prisma/schema.sql
```

### Abrir no CLI do SQLite
```bash
sqlite3 prisma/dev.db

# Dentro do CLI:
.tables                          -- listar tabelas
.schema Artist                   -- ver estrutura de uma tabela
SELECT * FROM v_AlbumSummary;    -- ver todos os álbuns
.quit
```

### Via Prisma (recomendado)
```bash
# Aplicar schema (cria/actualiza o banco)
npx prisma db push

# Ver dados no browser
npx prisma studio

# Popular com dados iniciais
curl -X POST http://localhost:3000/api/seed
```

---

## API Endpoints

| Método | Endpoint               | Descrição                              |
|--------|------------------------|----------------------------------------|
| GET    | `/api/albums`          | Listar álbuns (filtros: artistId, search) |
| GET    | `/api/albums/:id`      | Álbum com tracks                       |
| PATCH  | `/api/albums/:id`      | Editar álbum                           |
| DELETE | `/api/albums/:id`      | Eliminar álbum + ficheiros             |
| GET    | `/api/artists`         | Listar artistas com contagens          |
| GET    | `/api/artists/:id`     | Artista com álbuns + tracks            |
| DELETE | `/api/artists/:id`     | Eliminar artista + álbuns + tracks     |
| GET    | `/api/tracks`          | Listar/pesquisar tracks                |
| DELETE | `/api/tracks/:id`      | Eliminar track individual              |
| POST   | `/api/upload/track`    | Upload de ficheiros áudio individuais  |
| POST   | `/api/upload/album`    | Upload de álbum completo (capa + tracks) |
| GET    | `/api/likes`           | IDs das tracks com gosto               |
| POST   | `/api/likes`           | Toggle gosto numa track                |
| GET    | `/api/playlists`       | Listar playlists com tracks            |
| POST   | `/api/playlists`       | Criar playlist com tracks opcionais    |
| PATCH  | `/api/playlists`       | Adicionar, remover ou reordenar tracks |
| DELETE | `/api/playlists/:id`   | Eliminar playlist sem apagar tracks    |
| POST   | `/api/seed`            | Popular DB com dados iniciais          |

---

## Ficheiros de áudio

Os ficheiros carregados são guardados em:
```
public/
  uploads/
    audio/    ← ficheiros MP3/FLAC/WAV/M4A
    covers/   ← imagens de capa
```

Servidos directamente pelo Next.js em `/uploads/audio/<filename>` e `/uploads/covers/<filename>`.

---

## Migração para PostgreSQL (futuro)

Quando precisares de mudar para PostgreSQL:

1. Instalar: `npm install @prisma/adapter-pg pg`
2. Actualizar `prisma/schema.prisma`: `provider = "postgresql"`
3. Actualizar `prisma.config.ts`: `url: process.env.DATABASE_URL`
4. Actualizar `src/lib/db.ts`: usar `PrismaPg` em vez de `PrismaLibSql`
5. Executar: `npx prisma migrate deploy`

Os modelos e relações não mudam — apenas o adapter e a connection string.
