# Soneker — Arquitetura Enterprise: Plano de Evolução
> Relatório técnico de evolução progressiva de MVP para sistema escalável a milhões de utilizadores  
> Data: Abril 2026 | Versão: 1.0

---

## Índice

1. [Introdução](#1-introdução)
2. [Estado Atual](#2-estado-atual)
3. [Problemas e Limitações](#3-problemas-e-limitações)
4. [Proposta de Nova Arquitetura](#4-proposta-de-nova-arquitetura)
5. [Plano de Evolução Faseado](#5-plano-de-evolução-faseado)
6. [Stack Tecnológica Recomendada](#6-stack-tecnológica-recomendada)
7. [Fluxos Principais](#7-fluxos-principais)
8. [Considerações Finais](#8-considerações-finais)

---

## 1. Introdução

O Soneker é uma aplicação de streaming de música pessoal construída sobre Next.js 16 e Supabase. O MVP está funcional e demonstra valor claro: upload de áudio, gestão de biblioteca, playlists, player com queue e controlo de reprodução.

O objetivo deste documento **não é reescrever o sistema** — é definir um caminho de evolução progressiva que permita escalar a plataforma de dezenas para milhões de utilizadores, sem perder o que já funciona e sem introduzir complexidade desnecessária antes do momento certo.

A filosofia base é: **extrair quando dói, não por antecipação.**

---

## 2. Estado Atual

### 2.1 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router, 100% client-rendered) |
| Backend | Next.js API Routes (server-side handlers) |
| Base de Dados | Supabase (PostgreSQL gerido) |
| Armazenamento | Supabase Storage (buckets `audio` e `covers`) |
| Estado Cliente | Zustand 5 |
| Autenticação | Estática (ADMIN_SECRET via header) — modelo single-user |
| Animações | Framer Motion |
| Estilos | Tailwind CSS 4 |

### 2.2 Modelo de Dados

```
Artist ──< Album ──< Track
                         \──< PlaylistTrack >── Playlist
                          \── Like
```

O schema é limpo e normalizado. Existem views SQL (`v_TrackFull`, `v_AlbumSummary`) para queries desnormalizadas. As deleções em cascata são tratadas por lógica de aplicação (`music-delete.ts`) com cleanup do Storage.

### 2.3 Capacidades Existentes

- ✅ CRUD completo: Artistas, Álbuns, Faixas, Playlists
- ✅ Upload de áudio (MP3, FLAC, WAV, M4A) com metadados
- ✅ Upload via FormData e via Signed URLs (Supabase)
- ✅ Player com queue, shuffle, repeat, volume, seek
- ✅ Likes com atualização otimista
- ✅ Seed de dados de demonstração
- ✅ Proteção de rotas de escrita via secret estático

### 2.4 O que o Código Revela

- **Toda a UI é client-rendered**: sem Server Components, sem SSR real
- **Estado global monolítico**: store Zustand de 838 linhas gere UI, reprodução, biblioteca e upload em conjunto
- **Modelo single-user**: sem contas, sem sessões, sem multi-tenant
- **Sem cache**: cada ação chama a API diretamente
- **Sem fila de processamento**: uploads são síncronos e bloqueantes
- **Sem observabilidade**: sem logs estruturados, métricas ou tracing

---

## 3. Problemas e Limitações

### 3.1 Autenticação — Risco Crítico

O sistema atual usa um secret estático (`ADMIN_SECRET`) exposto no bundle do cliente via `NEXT_PUBLIC_ADMIN_SECRET`. **Qualquer utilizador com DevTools tem acesso total de escrita.**

```typescript
// utils.ts — isto corre no browser
export function adminHeaders(): HeadersInit {
  const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET // ❌ visível no cliente
  return secret ? { Authorization: `Bearer ${secret}` } : {}
}
```

**Impacto:** Inaceitável para produção com múltiplos utilizadores. Qualquer pessoa pode fazer upload, apagar dados, ou chamar `/api/seed`.

### 3.2 Modelo Single-User

A base de dados não tem coluna `userId` em nenhuma tabela. Likes, playlists e uploads pertencem a "toda a gente". Adicionar multi-user mais tarde **requer migração de schema e reescrita parcial da lógica de negócio**.

### 3.3 Performance — N+1 e Ausência de Cache

As API routes fazem múltiplas queries sequenciais ao Supabase. O `fetchAlbums()` retorna todos os álbuns com todos os tracks — sem paginação. Com 10.000 tracks, o payload JSON pode ultrapassar os 5 MB.

```
GET /api/albums → carrega TODOS os álbuns + TODOS os tracks de cada um
GET /api/artists → carrega TODOS os artistas (sem limite)
```

Não existe qualquer camada de cache. Cada navegação entre views força re-fetch.

### 3.4 Streaming de Áudio — Frágil

O player usa `HTMLAudioElement` com a URL pública do Supabase Storage. Isto significa:

- O Supabase Storage não é um CDN de streaming — não suporta **HTTP Range Requests** de forma otimizada
- Não há **chunking progressivo** (o browser descarrega o ficheiro inteiro antes de começar a reproduzir ficheiros grandes)
- Sem **adaptive bitrate** (ABR) — a qualidade não adapta à largura de banda
- As URLs públicas são permanentes e não têm controlo de acesso por utilizador

### 3.5 Uploads Síncronos e Frágeis

O upload no servidor é síncrono: o Next.js Route Handler fica bloqueado enquanto faz `Buffer.from(await file.arrayBuffer())` e depois sobe para o Supabase. Para ficheiros de 200 MB, isto:

- Bloqueia a thread do Node.js
- Pode exceder o timeout do Vercel (60s no plano gratuito)
- Não tem retry em caso de falha de rede a meio

A solução de Signed URLs (já implementada no `AlbumUploader`) é o caminho certo — mas não está disponível no `TrackUploader`.

### 3.6 Store Monolítico

O `useAppStore.ts` com 838 linhas gere em simultâneo: estado de UI, reprodução de áudio, biblioteca de dados, playlists, likes e upload. Isto dificulta:

- Testes unitários
- Raciocínio sobre bugs de estado
- Code splitting

### 3.7 Sem Observabilidade

Não existem logs estruturados, métricas de latência, alertas de erro, ou rastreamento de utilizador. Em produção, um bug silencioso (ex: upload que falha sem mostrar erro) é invisível.

### 3.8 Ausência de CDN para Media

O Supabase Storage tem CDN incorporado mas limitado. Para escala global, latência baixa e reprodução fluida, é necessário um CDN especializado em media (CloudFront, Cloudflare R2 + Stream, Bunny.net).

---

## 4. Proposta de Nova Arquitetura

### 4.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTES                                 │
│         Web App (Next.js)    Mobile App (futuro)                │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────┐
│                      API GATEWAY / BFF                          │
│              (Next.js API Routes → evolui para BFF)             │
│         Rate limiting · Auth validation · Request routing       │
└──────┬────────────────┬──────────────────┬──────────────────────┘
       │                │                  │
┌──────▼──────┐  ┌──────▼──────┐  ┌───────▼──────┐
│   Auth      │  │  Library    │  │  Streaming   │
│  Service    │  │  Service    │  │   Service    │
│             │  │             │  │              │
│ Supabase    │  │ Supabase DB │  │ CDN + Media  │
│ Auth        │  │ + Cache     │  │ Processing   │
└─────────────┘  └─────────────┘  └──────────────┘
       │                │                  │
┌──────▼────────────────▼──────────────────▼──────────────────────┐
│                    MESSAGE QUEUE (futuro)                        │
│              Processamento assíncrono: upload, recomendações     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Princípio de Evolução: Monolith Modular First

**Não** iniciar com microservices. O caminho correto é:

```
MVP (atual) → Monolith Modular → Microservices seletivos
```

A separação deve ocorrer **apenas quando existir razão operacional clara**: picos de carga isolados, equipas independentes, ou necessidade de linguagem/runtime diferente.

### 4.3 Autenticação — Evolução Imediata

**Manter:** Supabase Auth (robusto, gratuito até escala relevante, tem OAuth, OTP, JWT)  
**Remover:** `NEXT_PUBLIC_ADMIN_SECRET` do bundle do cliente  
**Adicionar:** Modelo de utilizadores com `userId` em todas as tabelas de dados do utilizador

#### Novo Fluxo de Auth

```
1. Utilizador faz login → Supabase Auth emite JWT
2. JWT é enviado em cada pedido: Authorization: Bearer <jwt>
3. Next.js Route Handler valida JWT com supabaseAdmin.auth.getUser(token)
4. Row Level Security (RLS) no Supabase filtra dados por userId automaticamente
```

#### Migração de Schema

```sql
-- Adicionar userId a todas as tabelas do utilizador
ALTER TABLE "Playlist"    ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Like"        ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';
-- Albums e Tracks são globais (conteúdo da plataforma) — sem userId
-- A menos que se queira biblioteca privada por utilizador (fase 2)
```

#### Row Level Security (RLS)

```sql
-- Likes: cada utilizador só vê os seus próprios
CREATE POLICY "likes_owner" ON "Like"
  USING (auth.uid()::text = "userId");

-- Playlists: cada utilizador só vê as suas
CREATE POLICY "playlists_owner" ON "Playlist"
  USING (auth.uid()::text = "userId");

-- Tracks/Albums: leitura pública, escrita apenas admin
CREATE POLICY "tracks_read" ON "Track" FOR SELECT USING (true);
CREATE POLICY "tracks_write" ON "Track"
  USING (auth.jwt() ->> 'role' = 'admin');
```

### 4.4 Streaming de Áudio — Evolução de Média Prazo

#### Problema Central

O `HTMLAudioElement` com URL pública do Supabase funciona para MVP. Para escala:

| Necessidade | Solução |
|---|---|
| Latência global baixa | CDN especializado em media |
| Ficheiros grandes (FLAC, WAV) | HTTP Range Requests + chunking |
| URLs temporárias por utilizador | Signed URLs com expiração |
| Controlo de acesso | URLs assinadas pelo backend |
| Poupança de banda | Transcodificação para múltiplos bitrates |

#### Arquitetura de Streaming Proposta

```
Upload → Supabase Storage (master file)
       → Job Queue → Transcoding Worker
                   → Gera: 128kbps MP3, 320kbps MP3, HLS playlist
                   → Armazena no CDN (Cloudflare R2 ou AWS S3 + CloudFront)

Reprodução:
  Cliente → GET /api/stream/[trackId]
          → Backend verifica auth + entitlement
          → Retorna Signed URL com TTL de 1h
          → Cliente usa URL para streaming direto do CDN
```

#### Tecnologia Recomendada para Media

**Opção A (simples, barata):** Cloudflare R2 + Cloudflare CDN  
- R2 sem egress fees  
- CDN global incluído  
- Workers para gerar Signed URLs no edge  

**Opção B (mais poderosa):** AWS S3 + CloudFront + MediaConvert  
- MediaConvert para transcodificação automática  
- CloudFront para delivery HLS  
- Mais configuração, mais poder  

**Para a fase atual:** Migrar Supabase Storage → Cloudflare R2 e adicionar endpoint de Signed URL.

### 4.5 Base de Dados — Evolução Incremental

**Manter:** Supabase PostgreSQL — é excelente para este caso de uso  
**Adicionar:** Camada de cache  
**Otimizar:** Queries, índices, paginação  

#### Paginação — Prioritária

```typescript
// Atual (❌ retorna tudo)
GET /api/albums → { albums: [...todos os 10.000] }

// Proposto (✅ paginado)
GET /api/albums?page=1&limit=24 → { albums: [...24], total: 10000, nextCursor: "abc" }
```

#### Índices Recomendados

```sql
-- Pesquisa de tracks
CREATE INDEX idx_track_name_search ON "Track" USING gin(to_tsvector('english', name));
CREATE INDEX idx_track_artist      ON "Track" ("artistId");
CREATE INDEX idx_track_album       ON "Track" ("albumId");

-- Likes por utilizador
CREATE INDEX idx_like_user ON "Like" ("userId");

-- Playlists por utilizador
CREATE INDEX idx_playlist_user ON "Playlist" ("userId");
```

#### Cache com Redis / Upstash

```
GET /api/albums
  → Cache hit? → retorna JSON em <5ms
  → Cache miss? → query Postgres → guarda no Redis (TTL: 5min) → retorna

Invalidação:
  POST/PATCH/DELETE /api/albums → invalida cache key "albums:*"
```

**Tecnologia:** Upstash Redis (serverless, paga por request, zero gestão de infra)

### 4.6 Processamento Assíncrono — Uploads e Recomendações

#### Problema Atual

Upload síncrono: cliente espera até o ficheiro ser processado. Para ficheiros grandes, o timeout do Vercel (60s) é atingido.

#### Proposta: Upload em 3 Fases

```
Fase 1 — Cliente faz upload direto para Storage (via Signed URL)
         → já implementado no AlbumUploader, estender ao TrackUploader

Fase 2 — Cliente envia metadata para API:
         POST /api/upload/complete { storageKey, name, artist, ... }

Fase 3 — API enfileira job de processamento:
         → Valida ficheiro (formato, duração, corrupção)
         → Gera waveform (para visualização)
         → Transcodifica para formatos otimizados
         → Cria registo na base de dados
         → Notifica cliente via WebSocket ou SSE
```

#### Tecnologia para Filas

**Opção simples:** Supabase Edge Functions + Supabase Queues (beta)  
**Opção robusta:** Inngest (serverless job queue com retry automático, dashboard, DX excelente)  
**Opção enterprise:** BullMQ + Redis (controlo total, mais configuração)

**Recomendação para fase 2:** Inngest — integra nativamente com Next.js, zero infra.

### 4.7 Frontend — Otimizações Imediatas

#### Habilitar Server Components

A app atual é 100% client-rendered. Páginas que exibem dados estáticos ou semi-estáticos (biblioteca, artistas) devem ser Server Components:

```typescript
// Atual (❌ fetch no cliente, loading state visível)
'use client'
useEffect(() => { fetch('/api/albums').then(...) }, [])

// Proposto (✅ dados chegam com o HTML)
// app/library/page.tsx — Server Component
export default async function LibraryPage() {
  const albums = await fetchAlbums() // direto ao DB, sem round-trip
  return <AlbumGrid albums={albums} />
}
```

**Benefícios:** Menor bundle JS, melhor Core Web Vitals, SEO se necessário.

#### Dividir o Store Zustand

O store de 838 linhas deve ser dividido por domínio:

```
usePlayerStore    — estado de reprodução (queue, progress, volume)
useLibraryStore   — dados da biblioteca (albums, artists, tracks)
usePlaylistStore  — playlists e operações
useUIStore        — estado de UI (modais, toasts, view atual)
```

Isto permite:
- Code splitting por funcionalidade
- Testes unitários isolados
- Debugging mais fácil

### 4.8 Observabilidade

Um sistema em produção sem observabilidade é um sistema cego.

#### Logs Estruturados

```typescript
// Atual (❌ console.error sem contexto)
console.error('[upload/track] track 0:', err)

// Proposto (✅ log estruturado)
logger.error('upload.track.failed', {
  trackIndex: i,
  trackName: meta.name,
  fileSize: file.size,
  userId: req.userId,
  error: err.message,
  duration: Date.now() - startTime,
})
```

**Tecnologia:** Pino (logging) + Axiom ou Logtail (armazenamento e pesquisa)

#### Métricas e Alertas

Instrumentar:
- Latência de API (p50, p95, p99)
- Taxa de erro por endpoint
- Uploads falhados vs. sucedidos
- Utilizadores ativos, reproduções por minuto

**Tecnologia:** Vercel Analytics (free tier) + Sentry (erros com stack trace)

#### Tracing

Para diagnosticar lentidão em queries encadeadas:

**Tecnologia:** OpenTelemetry + Axiom ou Grafana Cloud (free tier)

### 4.9 Segurança

| Risco | Mitigação |
|---|---|
| ADMIN_SECRET exposto no cliente | Remover `NEXT_PUBLIC_ADMIN_SECRET`, usar Supabase Auth JWT |
| Uploads sem validação de tipo real | Validar magic bytes no servidor (não apenas extensão) |
| Signed URLs sem expiração curta | TTL de 1h máximo |
| Sem rate limiting | Adicionar rate limiting no API Gateway (Upstash Ratelimit) |
| Supabase Service Role no cliente | Nunca — já está correto (server-only) |
| Ficheiros sem scan de vírus | ClamAV em worker assíncrono pós-upload |
| CORS aberto | Restringir origins em produção |

---

## 5. Plano de Evolução Faseado

### Fase 0 — Fundação (Agora, 1-2 semanas)
*Pré-requisito para qualquer crescimento*

- [ ] **Autenticação real**: Supabase Auth (email/password + OAuth Google)
- [ ] **Remover NEXT_PUBLIC_ADMIN_SECRET** do bundle do cliente
- [ ] **Adicionar userId** a Playlists e Likes
- [ ] **Ativar RLS** no Supabase para dados por utilizador
- [ ] **Paginação** em `/api/albums`, `/api/tracks`, `/api/artists`
- [ ] **Signed URLs com TTL** para streams de áudio (em vez de URLs públicas permanentes)
- [ ] **Mover TrackUploader para Signed URLs** (igual ao AlbumUploader)
- [ ] **Sentry** para captura de erros em produção

**Impacto:** Sistema seguro, pronto para múltiplos utilizadores.

---

### Fase 1 — Performance e UX (1-3 meses)
*Quando os primeiros utilizadores reais chegarem*

- [ ] **Redis/Upstash** para cache de respostas da biblioteca
- [ ] **Server Components** nas páginas de listagem (Library, Artists)
- [ ] **Divisão do Store Zustand** em domínios
- [ ] **Validação de tipo real** em uploads (magic bytes)
- [ ] **Rate limiting** por utilizador (Upstash Ratelimit)
- [ ] **Logs estruturados** com Pino + Axiom
- [ ] **Índices de BD** para pesquisa e filtragem
- [ ] **Migrar Storage para Cloudflare R2** (sem egress fees)
- [ ] **Infinite scroll / cursor pagination** na UI

**Impacto:** App fluida com dezenas de milhares de utilizadores.

---

### Fase 2 — Escala e Features (3-12 meses)
*Quando existir tração e equipa*

- [ ] **Processamento assíncrono de uploads** com Inngest
  - Validação de ficheiro, geração de waveform, transcodificação
- [ ] **HLS streaming** para ficheiros grandes (via Cloudflare Stream ou MediaConvert)
- [ ] **Notificações em tempo real** (WebSocket ou SSE) para progresso de upload
- [ ] **Motor de pesquisa** com full-text search (PostgreSQL FTS ou Typesense)
- [ ] **Sistema de recomendações simples** (baseado em escutas, likes, género)
- [ ] **CDN para covers e assets** estáticos
- [ ] **Roles e permissões** (admin, editor, listener)
- [ ] **API pública** com autenticação por API Key (para integrações)
- [ ] **Mobile app** (React Native ou PWA)

**Impacto:** Plataforma com centenas de milhares de utilizadores.

---

### Fase 3 — Enterprise (12+ meses)
*Quando a escala justificar a complexidade*

- [ ] **Extração de serviços críticos:**
  - Streaming Service (Go ou Rust — latência crítica)
  - Recommendation Service (Python — ML)
  - User Service (separação de concerns clara)
- [ ] **Event Streaming** (Kafka ou Supabase Realtime) para analytics em tempo real
- [ ] **Multi-região** (Supabase read replicas, CDN edge nodes)
- [ ] **Adaptive Bitrate Streaming** (HLS com múltiplos bitrates)
- [ ] **Machine Learning** para recomendações personalizadas
- [ ] **Observabilidade completa** (OpenTelemetry, Grafana, alertas PagerDuty)
- [ ] **SLA e disaster recovery** documentados

**Impacto:** Sistema preparado para milhões de utilizadores.

---

## 6. Stack Tecnológica Recomendada

### Manter (Núcleo Estável)

| Componente | Tecnologia | Razão |
|---|---|---|
| Frontend | Next.js | App Router é sólido, Server Components são o caminho certo |
| UI State | Zustand | Leve, simples, suficiente — apenas dividir por domínio |
| Base de Dados | Supabase PostgreSQL | Robusto, RLS nativo, escala bem até muitos TB |
| Auth | Supabase Auth | JWT, OAuth, OTP incluídos — evita reinventar |
| Animações | Framer Motion | Produto polido, manter |

### Adicionar (Fase 0-1)

| Componente | Tecnologia | Razão |
|---|---|---|
| Cache | Upstash Redis | Serverless, zero gestão, SDK excelente |
| Error tracking | Sentry | Padrão da indústria, free tier generoso |
| Logs | Pino + Axiom | Structured logging com search poderosa |
| Rate Limiting | Upstash Ratelimit | Integra com Upstash Redis |
| Storage/CDN | Cloudflare R2 | Sem egress fees, CDN global incluído |

### Adicionar (Fase 2)

| Componente | Tecnologia | Razão |
|---|---|---|
| Job Queue | Inngest | Serverless, DX excelente, dashboard incluído |
| Search | PostgreSQL FTS → Typesense | FTS é suficiente early; Typesense para UX de pesquisa mais rica |
| Analytics | PostHog | Open-source, auto-hostable, privacidade |
| Streaming HLS | Cloudflare Stream | HLS nativo, adaptive bitrate, CDN incluído |

### Considerar (Fase 3, se necessário)

| Componente | Tecnologia | Condição |
|---|---|---|
| Streaming Service | Go / Rust | Apenas se a latência do Node.js for o bottleneck medido |
| ML Recommendations | Python + FastAPI | Apenas quando tiver dados suficientes (>10k utilizadores ativos) |
| Event Streaming | Kafka (via Confluent) | Apenas com múltiplos serviços a consumir eventos |

---

## 7. Fluxos Principais

### 7.1 Fluxo de Autenticação (Fase 0)

```
Utilizador → Login (email/Google)
           → Supabase Auth emite JWT (15min access + 7d refresh)
           → Cliente armazena JWT em memória (não localStorage)
           → Cada request: Authorization: Bearer <jwt>
           → Servidor: supabaseAdmin.auth.getUser(token) → userId
           → RLS aplica filtros por userId automaticamente
           → Refresh token silencioso antes de expirar
```

### 7.2 Fluxo de Upload (Fase 0-2)

```
── Fase 0 (melhorado do atual) ──────────────────────────────────
Cliente → POST /api/upload/sign { filename, bucket }
        → Servidor valida JWT, gera Signed URL (TTL: 10min)
        → Cliente faz PUT direto para Storage com Signed URL
        → Cliente → POST /api/upload/complete { storageKey, metadata }
        → Servidor cria registo na BD
        → Resposta ao cliente com track criado

── Fase 2 (assíncrono) ──────────────────────────────────────────
Cliente → Upload direto para Storage (Signed URL)
        → POST /api/upload/complete { storageKey, metadata }
        → Servidor enfileira job no Inngest
        → Resposta imediata: { jobId, status: "processing" }
        → Worker processa: valida, transcodifica, gera waveform
        → SSE / WebSocket notifica cliente: { jobId, status: "done", track }
```

### 7.3 Fluxo de Streaming de Áudio (Fase 1)

```
── Atual (público, sem controlo) ────────────────────────────────
Cliente → HTMLAudioElement.src = "https://supabase.co/storage/.../track.mp3"
        → Download direto, URL pública permanente

── Proposto (controlado, seguro) ────────────────────────────────
Cliente → GET /api/stream/[trackId]
        → Servidor: verifica JWT + entitlement (ex: plano free/pro)
        → Servidor: gera Signed URL com TTL de 1h para CDN
        → Resposta: { streamUrl: "https://cdn.soneker.com/audio/...?token=..." }
        → Cliente → HTMLAudioElement.src = streamUrl
        → CDN serve com Range Requests (seek rápido)
        → Ao fim do TTL, cliente pede novo URL transparentemente
```

### 7.4 Fluxo de Pesquisa (Fase 1-2)

```
── Fase 1 (PostgreSQL FTS) ──────────────────────────────────────
GET /api/search?q=khalid&types=tracks,artists,albums
  → SELECT ... FROM "Track" WHERE to_tsvector(name) @@ plainto_tsquery($1)
  → UNION SELECT ... FROM "Artist" ...
  → Resposta em <100ms com índice GIN

── Fase 2 (Typesense) ───────────────────────────────────────────
GET /api/search?q=khalid
  → Next.js API → Typesense Cloud
  → Fuzzy search, typo-tolerance, facets, highlight
  → Resposta em <30ms
  → Sync de dados: Supabase → Typesense via Inngest job (on insert/update)
```

### 7.5 Fluxo de Recomendações (Fase 3)

```
Evento: utilizador reproduz track
  → Log: { userId, trackId, albumId, artistId, timestamp, percentPlayed }
  → Inngest job persiste em tabela "PlayEvent"

Nightly job:
  → Calcula "utilizadores similares" (collaborative filtering)
  → Gera "For You" playlist por utilizador
  → Persiste em cache (Redis, TTL: 24h)

Cliente:
  GET /api/recommendations → serve do cache Redis
```

---

## 8. Considerações Finais

### O que Fazer Agora (Esta Semana)

A mudança de maior impacto e menor risco é **remover o secret estático e implementar Supabase Auth**. Isto desbloqueia tudo o resto: multi-user, RLS, permissões, planos pagos. Sem isto, qualquer crescimento expõe o sistema.

A segunda prioridade é **paginação** — sem ela, a app colapsa com mais de mil tracks.

### O que NÃO Fazer Agora

- Não extrair microservices antes de ter 100k utilizadores ativos e equipas separadas
- Não implementar ML antes de ter dados suficientes
- Não migrar a base de dados para outro engine — PostgreSQL via Supabase é excelente e escala muito além do que a maioria dos projetos alguma vez precisa
- Não reescrever o frontend — está funcional e bem estruturado

### Spotify vs. Soneker — Perspetiva Realista

O Spotify tem 600 engenheiros, 100+ microservices, e anos de iteração. A inspiração deve ser nos **princípios**, não na implementação:

| Princípio Spotify | Aplicação ao Soneker |
|---|---|
| Streaming com Range Requests | Signed URLs + Cloudflare R2 (Fase 1) |
| CDN global para media | Cloudflare CDN (Fase 1) |
| Auth por JWT | Supabase Auth (Fase 0) |
| Processamento assíncrono | Inngest (Fase 2) |
| Dados por utilizador com isolamento | RLS no Supabase (Fase 0) |
| Observabilidade completa | Sentry + Axiom (Fase 0-1) |
| Recomendações personalizadas | Collaborative filtering simples (Fase 3) |

### Máxima a Guardar

> **"Make it work, make it right, make it fast"** — em datas, não em antecipação.

O Soneker tem uma base sólida. O código é limpo, o modelo de dados está correto, e as escolhas de tecnologia são sensatas. A evolução deve ser disciplinada: atacar os riscos reais (auth, segurança, paginação) antes das otimizações de escala.

---

*Documento gerado em Abril 2026 para uso interno da equipa de engenharia do Soneker.*  
*Revisão recomendada a cada 6 meses ou após mudança significativa de escala.*
