import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { genId, upsertArtist, upsertAlbum } from '@/lib/db'
import { requireAdmin } from '@/lib/guard'

// ⚠️  DEV / TEST ONLY — uses placeholder metadata and silent audio
// In production all content comes from real user uploads via /api/upload/track or /api/upload/album
// Silent placeholder MP3 (~1s, 1.5KB) — no external dependency, no copyrighted content
const SILENT_MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA'

// ─── Seed data ────────────────────────────────────────────────────────────────
// 35 artists · 55 albums · ~280 tracks
// Genres: Gospel, Worship, Praise, Contemporary Christian, Christian Hip-Hop,
//         Hymns, Podcast: Testemunhos, Podcast: Pregações, Podcast: Estudos Bíblicos,
//         Podcast: Missão, Podcast: Fé, Podcast: Saúde, Podcast: Tecnologia,
//         Podcast: Negócios, Podcast: Espiritualidade, Podcast: Sociedade,
//         R&B, Pop, Hip-Hop, Alternative, Soul, Jazz, Electronic, Afrobeats,
//         Latin, Reggae, Rock, Indie, Country, Classical, Blues, Funk, K-Pop, Metal
const SEED = [
  // ── GOSPEL ──────────────────────────────────────────────────────────────────
  {
    artist: { name: 'Kirk Franklin', image: 'https://picsum.photos/seed/kirkfranklin/300/380' },
    albums: [
      {
        name: 'Losing My Religion', cover: 'https://picsum.photos/seed/kf1/300/300', year: '2015', genre: 'Gospel',
        tracks: ['Losing My Religion', 'My World Needs You', "I Smile", 'Declaration (This Is It)', 'All Things', 'Wanna Be Happy?'],
      },
      {
        name: 'Long Live Love', cover: 'https://picsum.photos/seed/kf2/300/300', year: '2019', genre: 'Gospel',
        tracks: ['Love Theory', 'Just for Me', 'Strong God', 'Never Alone', 'Weeping'],
      },
    ],
  },
  {
    artist: { name: 'Tasha Cobbs Leonard', image: 'https://picsum.photos/seed/tasha/300/380' },
    albums: [
      {
        name: 'Heart. Passion. Pursuit.', cover: 'https://picsum.photos/seed/tcl1/300/300', year: '2017', genre: 'Gospel',
        tracks: ['This Is a Move', 'You Know My Name', 'For Your Glory', 'Great Are You Lord', 'Fill Me Up / Overflow'],
      },
      {
        name: 'One Place Live', cover: 'https://picsum.photos/seed/tcl2/300/300', year: '2015', genre: 'Gospel',
        tracks: ['Break Every Chain', 'Grace', "Your Spirit", 'Put a Praise On It', 'Receive Your Healing'],
      },
    ],
  },
  {
    artist: { name: 'Travis Greene', image: 'https://picsum.photos/seed/travisgreene/300/380' },
    albums: [
      {
        name: 'The Hill', cover: 'https://picsum.photos/seed/tg1/300/300', year: '2015', genre: 'Gospel',
        tracks: ['Intentional', 'Made a Way', 'You Waited', 'Joyful', 'All in Your Hands'],
      },
    ],
  },
  {
    artist: { name: 'Maverick City Music', image: 'https://picsum.photos/seed/maverick/300/380' },
    albums: [
      {
        name: 'Jubilee: Juneteenth Edition', cover: 'https://picsum.photos/seed/mcm1/300/300', year: '2021', genre: 'Gospel',
        tracks: ['Promises', 'Man of Your Word', 'Jireh', 'Wait on You', 'Talking to Jesus', 'Refiner'],
      },
      {
        name: 'TRIBL', cover: 'https://picsum.photos/seed/mcm2/300/300', year: '2022', genre: 'Gospel',
        tracks: ['Bless Me', 'Battle Is Not Yours', 'Heaven Come Down', 'My Life Your Hands'],
      },
    ],
  },

  // ── WORSHIP ─────────────────────────────────────────────────────────────────
  {
    artist: { name: 'Hillsong Worship', image: 'https://picsum.photos/seed/hillsong/300/380' },
    albums: [
      {
        name: 'What a Beautiful Name', cover: 'https://picsum.photos/seed/hw1/300/300', year: '2017', genre: 'Worship',
        tracks: ['What a Beautiful Name', 'Who You Say I Am', 'King of Kings', 'Way Maker', 'Cornerstone'],
      },
      {
        name: 'Open Heaven / River Wild', cover: 'https://picsum.photos/seed/hw2/300/300', year: '2015', genre: 'Worship',
        tracks: ['Open Heaven', 'Let There Be Light', 'River Wild', 'So Will I', 'Touch of Heaven'],
      },
    ],
  },
  {
    artist: { name: 'Bethel Music', image: 'https://picsum.photos/seed/bethel/300/380' },
    albums: [
      {
        name: 'Victory', cover: 'https://picsum.photos/seed/bm1/300/300', year: '2019', genre: 'Worship',
        tracks: ['Goodness of God', 'Victory', 'God I Look to You', 'Raise a Hallelujah', 'Graves Into Gardens'],
      },
      {
        name: 'You Make Me Brave', cover: 'https://picsum.photos/seed/bm2/300/300', year: '2014', genre: 'Worship',
        tracks: ['You Make Me Brave', 'Shepherd', 'Believe', 'It Is Well', 'We Are the Free'],
      },
    ],
  },
  {
    artist: { name: 'Chris Tomlin', image: 'https://picsum.photos/seed/christomlin/300/380' },
    albums: [
      {
        name: 'Holy Roar', cover: 'https://picsum.photos/seed/ct1/300/300', year: '2018', genre: 'Worship',
        tracks: ['Holy Roar', 'God Who Moves the Mountains', 'Jesus', 'Home', 'Whom Shall I Fear'],
      },
    ],
  },
  {
    artist: { name: 'Elevation Worship', image: 'https://picsum.photos/seed/elevation/300/380' },
    albums: [
      {
        name: 'Graves Into Gardens', cover: 'https://picsum.photos/seed/ew1/300/300', year: '2020', genre: 'Worship',
        tracks: ['Graves Into Gardens', 'The Blessing', 'See a Victory', 'There Is a King', 'Do It Again'],
      },
    ],
  },

  // ── PRAISE ──────────────────────────────────────────────────────────────────
  {
    artist: { name: 'Sinach', image: 'https://picsum.photos/seed/sinach/300/380' },
    albums: [
      {
        name: 'Way Maker', cover: 'https://picsum.photos/seed/sin1/300/300', year: '2019', genre: 'Praise',
        tracks: ['Way Maker', 'I Know Who I Am', 'Great Are You Lord', 'Overflow', 'Jesus Is Lord'],
      },
    ],
  },
  {
    artist: { name: 'William McDowell', image: 'https://picsum.photos/seed/mcdowell/300/380' },
    albums: [
      {
        name: 'Withholding Nothing', cover: 'https://picsum.photos/seed/wm1/300/300', year: '2012', genre: 'Praise',
        tracks: ['Withholding Nothing', 'I Give Myself Away', 'Spirit Break Out', 'Not Forgotten', 'Fall'],
      },
    ],
  },

  // ── CONTEMPORARY CHRISTIAN ───────────────────────────────────────────────────
  {
    artist: { name: 'Lauren Daigle', image: 'https://picsum.photos/seed/laurendaigle/300/380' },
    albums: [
      {
        name: 'Look Up Child', cover: 'https://picsum.photos/seed/ld1/300/300', year: '2018', genre: 'Contemporary Christian',
        tracks: ['Still Rolling Stones', 'You Say', 'Rescue', 'Look Up Child', 'Love Like This'],
      },
      {
        name: 'How Can It Be', cover: 'https://picsum.photos/seed/ld2/300/300', year: '2015', genre: 'Contemporary Christian',
        tracks: ['How Can It Be', 'Trust in You', 'First', 'Come Alive (Dry Bones)', 'O Lord'],
      },
    ],
  },
  {
    artist: { name: 'for KING & COUNTRY', image: 'https://picsum.photos/seed/fkc/300/380' },
    albums: [
      {
        name: 'Burn the Ships', cover: 'https://picsum.photos/seed/fkc1/300/300', year: '2018', genre: 'Contemporary Christian',
        tracks: ['Burn the Ships', 'joy.', 'God Only Knows', 'Your Promises', 'Middle of Your Love'],
      },
    ],
  },

  // ── CHRISTIAN HIP-HOP ────────────────────────────────────────────────────────
  {
    artist: { name: 'Lecrae', image: 'https://picsum.photos/seed/lecrae/300/380' },
    albums: [
      {
        name: 'Restoration', cover: 'https://picsum.photos/seed/lec1/300/300', year: '2020', genre: 'Christian Hip-Hop',
        tracks: ['Restoration', 'Drown', 'Spread Love', '8:28', 'Already Free', 'Sunday Morning'],
      },
      {
        name: 'Anomaly', cover: 'https://picsum.photos/seed/lec2/300/300', year: '2014', genre: 'Christian Hip-Hop',
        tracks: ['Non-Fiction', 'Anomaly', 'Fear', 'Messengers', 'All I Need Is You'],
      },
    ],
  },
  {
    artist: { name: 'KB', image: 'https://picsum.photos/seed/kbhiphop/300/380' },
    albums: [
      {
        name: 'Weight & Glory', cover: 'https://picsum.photos/seed/kb1/300/300', year: '2012', genre: 'Christian Hip-Hop',
        tracks: ['Weight & Glory', 'Sideways', 'Church Clothes', 'God Is Enough', 'Empty Me'],
      },
    ],
  },

  // ── HYMNS ───────────────────────────────────────────────────────────────────
  {
    artist: { name: 'Fernando Ortega', image: 'https://picsum.photos/seed/ortega/300/380' },
    albums: [
      {
        name: 'Storm', cover: 'https://picsum.photos/seed/fo1/300/300', year: '2001', genre: 'Hymns',
        tracks: ['This Good Day', 'Our Great God', 'Give Me Jesus', 'Come Thou Fount', 'Be Thou My Vision'],
      },
    ],
  },

  // ── PODCAST: TESTEMUNHOS ─────────────────────────────────────────────────────
  {
    artist: { name: 'PodFé — Testemunhos', image: 'https://picsum.photos/seed/podfe1/300/380' },
    albums: [
      {
        name: 'Temporada 1: Milagres', cover: 'https://picsum.photos/seed/pt1/300/300', year: '2023', genre: 'Podcast: Testemunhos',
        tracks: ['Ep.01 — O Deserto não é o Fim', 'Ep.02 — Quando Deus Respondeu', 'Ep.03 — Cura que Ninguém Esperava', 'Ep.04 — Fé além da Razão', 'Ep.05 — A Intervenção Divina', 'Ep.06 — Restauração Total'],
      },
      {
        name: 'Temporada 2: Transformação', cover: 'https://picsum.photos/seed/pt2/300/300', year: '2024', genre: 'Podcast: Testemunhos',
        tracks: ['Ep.01 — A Vida que Mudou de Vez', 'Ep.02 — Do Vício à Liberdade', 'Ep.03 — Família Restaurada', 'Ep.04 — O Chamado Inesperado', 'Ep.05 — Segunda Chance'],
      },
    ],
  },

  // ── PODCAST: PREGAÇÕES ───────────────────────────────────────────────────────
  {
    artist: { name: 'PodFé — Pregações', image: 'https://picsum.photos/seed/podfe2/300/380' },
    albums: [
      {
        name: 'A Palavra em Foco', cover: 'https://picsum.photos/seed/pp1/300/300', year: '2024', genre: 'Podcast: Pregações',
        tracks: ['O Poder do Nome de Jesus', 'Fé que Move Montanhas', 'Identidade em Cristo', 'A Graça que Transforma', 'Vivendo no Propósito', 'O Espírito Santo no Cotidiano'],
      },
      {
        name: 'Sermões para a Semana', cover: 'https://picsum.photos/seed/pp2/300/300', year: '2023', genre: 'Podcast: Pregações',
        tracks: ['Segunda: Recomeço', 'Quarta: No Meio da Semana', 'Sexta: Preparação', 'Domingo: Celebração', 'Emergência Espiritual'],
      },
    ],
  },

  // ── PODCAST: ESTUDOS BÍBLICOS ────────────────────────────────────────────────
  {
    artist: { name: 'PodFé — Estudos Bíblicos', image: 'https://picsum.photos/seed/podfe3/300/380' },
    albums: [
      {
        name: 'Salmos: Profundidade', cover: 'https://picsum.photos/seed/eb1/300/300', year: '2024', genre: 'Podcast: Estudos Bíblicos',
        tracks: ['Salmo 23 — O Senhor é meu Pastor', 'Salmo 91 — Proteção Divina', 'Salmo 121 — Levanto os Meus Olhos', 'Salmo 1 — O Homem Bem-aventurado', 'Salmo 139 — Deus nos Conhece'],
      },
      {
        name: 'Novo Testamento em Contexto', cover: 'https://picsum.photos/seed/eb2/300/300', year: '2023', genre: 'Podcast: Estudos Bíblicos',
        tracks: ['Romanos 8 — Mais que Vencedores', 'Filipenses 4 — A Paz de Deus', 'Efésios 6 — A Armadura de Deus', 'João 15 — A Videira Verdadeira', '1 Coríntios 13 — O Hino do Amor'],
      },
    ],
  },

  // ── PODCAST: MISSÃO & FÉ ────────────────────────────────────────────────────
  {
    artist: { name: 'PodFé — Missão', image: 'https://picsum.photos/seed/podfe4/300/380' },
    albums: [
      {
        name: 'A Grande Comissão', cover: 'https://picsum.photos/seed/pm1/300/300', year: '2024', genre: 'Podcast: Missão',
        tracks: ['O que é Missão?', 'Missões ao Redor do Mundo', 'Como Começar?', 'Igrejas que Enviam', 'Histórias do Campo Missionário', 'O Custo do Chamado'],
      },
    ],
  },
  {
    artist: { name: 'PodFé — Fé no Dia a Dia', image: 'https://picsum.photos/seed/podfe5/300/380' },
    albums: [
      {
        name: 'Espiritualidade Prática', cover: 'https://picsum.photos/seed/fe1/300/300', year: '2024', genre: 'Podcast: Fé',
        tracks: ['Como Orar Todo Dia', 'Jejum que Transforma', 'Lendo a Bíblia com Consistência', 'Comunidade e Discipulado', 'Fé no Trabalho'],
      },
    ],
  },

  // ── PODCAST: ESPIRITUALIDADE ─────────────────────────────────────────────────
  {
    artist: { name: 'Altar de Oração', image: 'https://picsum.photos/seed/altar/300/380' },
    albums: [
      {
        name: 'Silêncio e Oração', cover: 'https://picsum.photos/seed/ao1/300/300', year: '2024', genre: 'Podcast: Espiritualidade',
        tracks: ['Como Ouvir a Voz de Deus', 'Meditação Cristã', 'Contemplação', 'O Silêncio Sagrado', 'Oração de Rendição'],
      },
    ],
  },

  // ── PODCAST: SAÚDE & BEM-ESTAR ───────────────────────────────────────────────
  {
    artist: { name: 'Mente Sã Podcast', image: 'https://picsum.photos/seed/mentesa/300/380' },
    albums: [
      {
        name: 'Saúde Mental e Fé', cover: 'https://picsum.photos/seed/ms1/300/300', year: '2024', genre: 'Podcast: Saúde',
        tracks: ['Ansiedade e Espiritualidade', 'Depressão — Quebrando o Silêncio', 'Autocuidado Cristão', 'Limites Saudáveis', 'Terapia e Fé'],
      },
    ],
  },

  // ── PODCAST: SOCIEDADE & CULTURA ─────────────────────────────────────────────
  {
    artist: { name: 'Cristão na Cultura', image: 'https://picsum.photos/seed/cc1/300/380' },
    albums: [
      {
        name: 'Fé e Sociedade', cover: 'https://picsum.photos/seed/cs1/300/300', year: '2024', genre: 'Podcast: Sociedade',
        tracks: ['Cristãos e Política', 'A Igreja e a Arte', 'Tecnologia e Ética Cristã', 'Família no Século XXI', 'Racismo e o Evangelho'],
      },
    ],
  },

  // ── PODCAST: NEGÓCIOS ───────────────────────────────────────────────────────
  {
    artist: { name: 'Propósito & Negócios', image: 'https://picsum.photos/seed/pn1/300/380' },
    albums: [
      {
        name: 'Empreender com Propósito', cover: 'https://picsum.photos/seed/pn1c/300/300', year: '2024', genre: 'Podcast: Negócios',
        tracks: ['Dinheiro e Mordomia', 'Dízimo e Prosperidade', 'Negócios com Valores', 'Liderança Serva', 'Sucesso que Vale a Pena'],
      },
    ],
  },

  // ── PODCAST: TECNOLOGIA ─────────────────────────────────────────────────────
  {
    artist: { name: 'Fé Digital', image: 'https://picsum.photos/seed/fedigital/300/380' },
    albums: [
      {
        name: 'Igreja e Tecnologia', cover: 'https://picsum.photos/seed/fd1/300/300', year: '2024', genre: 'Podcast: Tecnologia',
        tracks: ['IA e o Futuro da Igreja', 'Redes Sociais e o Cristão', 'Discipulado Online', 'Privacidade e Ética Digital', 'Church Online'],
      },
    ],
  },

  // ── MUSIC: R&B ───────────────────────────────────────────────────────────────
  {
    artist: { name: 'Khalid', image: 'https://picsum.photos/seed/khalid99/300/380' },
    albums: [
      {
        name: 'Free Spirit', cover: 'https://picsum.photos/seed/alb1/300/300', year: '2019', genre: 'R&B',
        tracks: ['Bad Luck', 'Saturday Nights', 'Better', 'Up There', 'Hundred', 'Vertigo', 'My Bad'],
      },
      {
        name: 'American Teen', cover: 'https://picsum.photos/seed/alb2/300/300', year: '2017', genre: 'Pop',
        tracks: ['Location', 'saved', 'young dumb & broke', '8TEEN', "Let's Go", 'Another Sad Love Song'],
      },
    ],
  },
  {
    artist: { name: 'SZA', image: 'https://picsum.photos/seed/sza99/300/380' },
    albums: [
      {
        name: 'SOS', cover: 'https://picsum.photos/seed/alb10/300/300', year: '2022', genre: 'R&B',
        tracks: ['Kill Bill', 'Seek & Destroy', 'Low', 'Conceited', 'Good Days'],
      },
      {
        name: 'Ctrl', cover: 'https://picsum.photos/seed/alb11/300/300', year: '2017', genre: 'R&B',
        tracks: ['Supermodel', 'Love Galore', 'Doves in the Wind', 'Drew Barrymore', 'Broken Clocks'],
      },
    ],
  },
  {
    artist: { name: 'Frank Ocean', image: 'https://picsum.photos/seed/frank/300/380' },
    albums: [
      {
        name: 'Blonde', cover: 'https://picsum.photos/seed/alb8/300/300', year: '2016', genre: 'R&B',
        tracks: ['Nikes', 'Ivy', 'Pink + White', 'Self Control', 'Godspeed', 'Seigfried'],
      },
    ],
  },
  {
    artist: { name: 'Daniel Caesar', image: 'https://picsum.photos/seed/daniel/300/380' },
    albums: [
      {
        name: 'Freudian', cover: 'https://picsum.photos/seed/alb14/300/300', year: '2017', genre: 'R&B',
        tracks: ['Get You', 'Best Part', 'Blessed', 'Transform', "Neu Roses (Transgressor's Blues)"],
      },
    ],
  },

  // ── MUSIC: HIP-HOP ──────────────────────────────────────────────────────────
  {
    artist: { name: 'Mac Miller', image: 'https://picsum.photos/seed/macmiller/300/380' },
    albums: [
      {
        name: 'Swimming', cover: 'https://picsum.photos/seed/alb4/300/300', year: '2018', genre: 'Hip-Hop',
        tracks: ['Come Back to Earth', 'Ladders', 'Small Worlds', "What's the Use?", 'Conversation Pt. 1', 'Aquarium'],
      },
      {
        name: 'Circles', cover: 'https://picsum.photos/seed/alb5/300/300', year: '2020', genre: 'Hip-Hop',
        tracks: ['Circles', 'Complicated', 'Blue World', 'Hand Me Downs', 'Once a Day'],
      },
    ],
  },
  {
    artist: { name: 'Tyler the Creator', image: 'https://picsum.photos/seed/tyler/300/380' },
    albums: [
      {
        name: 'IGOR', cover: 'https://picsum.photos/seed/alb12/300/300', year: '2019', genre: 'Hip-Hop',
        tracks: ["IGOR'S THEME", 'EARFQUAKE', 'I THINK', 'RUNNING OUT OF TIME', 'NEW MAGIC WAND', 'A BOY IS A GUN*'],
      },
    ],
  },

  // ── MUSIC: POP ───────────────────────────────────────────────────────────────
  {
    artist: { name: 'Ariana Grande', image: 'https://picsum.photos/seed/ariana/300/380' },
    albums: [
      {
        name: 'Sweetener', cover: 'https://picsum.photos/seed/alb6/300/300', year: '2018', genre: 'Pop',
        tracks: ['God is a woman', 'R.E.M', 'Breathin', 'No Tears Left to Cry', 'Raindrops'],
      },
      {
        name: 'Thank U Next', cover: 'https://picsum.photos/seed/alb7/300/300', year: '2019', genre: 'Pop',
        tracks: ['imagine', '7 rings', 'thank u, next', 'break up with your girlfriend', 'NASA'],
      },
    ],
  },

  // ── MUSIC: SOUL ─────────────────────────────────────────────────────────────
  {
    artist: { name: 'H.E.R.', image: 'https://picsum.photos/seed/her99/300/380' },
    albums: [
      {
        name: 'Back of My Mind', cover: 'https://picsum.photos/seed/alb13/300/300', year: '2021', genre: 'Soul',
        tracks: ['Damage', 'Hold On', 'Comfortable', 'We Made It', 'Come Through'],
      },
    ],
  },
  {
    artist: { name: 'Jhené Aiko', image: 'https://picsum.photos/seed/jhene/300/380' },
    albums: [
      {
        name: 'Chilombo', cover: 'https://picsum.photos/seed/alb15/300/300', year: '2020', genre: 'Soul',
        tracks: ['Triggered (freestyle)', 'Speak', 'Happiness Over Everything', 'B.S.', 'Lotus'],
      },
    ],
  },

  // ── MUSIC: JAZZ ─────────────────────────────────────────────────────────────
  {
    artist: { name: 'Norah Jones', image: 'https://picsum.photos/seed/norah/300/380' },
    albums: [
      {
        name: 'Come Away with Me', cover: 'https://picsum.photos/seed/nj1/300/300', year: '2002', genre: 'Jazz',
        tracks: ['Come Away with Me', "Don't Know Why", 'Cold Cold Heart', 'Feelin the Same Way', 'The Nearness of You'],
      },
    ],
  },
  {
    artist: { name: 'Miles Davis', image: 'https://picsum.photos/seed/miles/300/380' },
    albums: [
      {
        name: 'Kind of Blue', cover: 'https://picsum.photos/seed/md1/300/300', year: '1959', genre: 'Jazz',
        tracks: ['So What', 'Freddie Freeloader', 'Blue in Green', 'All Blues', 'Flamenco Sketches'],
      },
    ],
  },

  // ── MUSIC: ELECTRONIC ───────────────────────────────────────────────────────
  {
    artist: { name: 'Daft Punk', image: 'https://picsum.photos/seed/daft/300/380' },
    albums: [
      {
        name: 'Random Access Memories', cover: 'https://picsum.photos/seed/dp1/300/300', year: '2013', genre: 'Electronic',
        tracks: ['Give Life Back to Music', 'The Game of Love', 'Giorgio by Moroder', 'Get Lucky', 'Instant Crush', 'Lose Yourself to Dance'],
      },
    ],
  },

  // ── MUSIC: AFROBEATS ────────────────────────────────────────────────────────
  {
    artist: { name: 'Burna Boy', image: 'https://picsum.photos/seed/burna/300/380' },
    albums: [
      {
        name: 'Twice as Tall', cover: 'https://picsum.photos/seed/bb1/300/300', year: '2020', genre: 'Afrobeats',
        tracks: ['Alarm Clock', 'Wonderful', 'Naughty by Nature', 'Anybody', 'Way Too Big'],
      },
      {
        name: 'African Giant', cover: 'https://picsum.photos/seed/bb2/300/300', year: '2019', genre: 'Afrobeats',
        tracks: ['Dangote', 'Gbona', 'Killin Dem', 'Pull Up', 'Show & Tell'],
      },
    ],
  },
  {
    artist: { name: 'WizKid', image: 'https://picsum.photos/seed/wizkid/300/380' },
    albums: [
      {
        name: 'Made in Lagos', cover: 'https://picsum.photos/seed/wz1/300/300', year: '2020', genre: 'Afrobeats',
        tracks: ['Reckless', 'Blessed', 'Smile', 'Essence', 'Mighty Wine', 'Joro'],
      },
    ],
  },

  // ── MUSIC: LATIN ────────────────────────────────────────────────────────────
  {
    artist: { name: 'Bad Bunny', image: 'https://picsum.photos/seed/badbunny/300/380' },
    albums: [
      {
        name: 'Un Verano Sin Ti', cover: 'https://picsum.photos/seed/bad1/300/300', year: '2022', genre: 'Latin',
        tracks: ['Moscow Mule', 'El Apagón', 'Tití Me Preguntó', 'Después de la Playa', 'Me Porto Bonito', 'Party'],
      },
    ],
  },
  {
    artist: { name: 'J Balvin', image: 'https://picsum.photos/seed/jbalvin/300/380' },
    albums: [
      {
        name: 'Colores', cover: 'https://picsum.photos/seed/jb1/300/300', year: '2020', genre: 'Latin',
        tracks: ['Rojo', 'Amarillo', 'Morado', 'Verde', 'Azul', 'Blanco', 'Negro'],
      },
    ],
  },

  // ── MUSIC: ROCK ─────────────────────────────────────────────────────────────
  {
    artist: { name: 'Arctic Monkeys', image: 'https://picsum.photos/seed/arctic/300/380' },
    albums: [
      {
        name: 'AM', cover: 'https://picsum.photos/seed/am1/300/300', year: '2013', genre: 'Rock',
        tracks: ["Do I Wanna Know?", 'R U Mine?', 'One for the Road', 'Arabella', 'Snap Out of It', "Why'd You Only Call Me When You're High?"],
      },
    ],
  },

  // ── MUSIC: INDIE ────────────────────────────────────────────────────────────
  {
    artist: { name: 'Billie Eilish', image: 'https://picsum.photos/seed/billie/300/380' },
    albums: [
      {
        name: 'When We All Fall Asleep', cover: 'https://picsum.photos/seed/be1/300/300', year: '2019', genre: 'Indie',
        tracks: ['bad guy', 'xanny', 'you should see me in a crown', 'all the good girls go to hell', 'wish you were gay', 'when the party\'s over'],
      },
    ],
  },

  // ── MUSIC: REGGAE ────────────────────────────────────────────────────────────
  {
    artist: { name: 'Bob Marley', image: 'https://picsum.photos/seed/marley/300/380' },
    albums: [
      {
        name: 'Legend', cover: 'https://picsum.photos/seed/bm_leg/300/300', year: '1984', genre: 'Reggae',
        tracks: ['Is This Love', "No Woman, No Cry", 'Could You Be Loved', 'Three Little Birds', 'Buffalo Soldier', 'Redemption Song'],
      },
    ],
  },

  // ── MUSIC: CLASSICAL ─────────────────────────────────────────────────────────
  {
    artist: { name: 'Ludovico Einaudi', image: 'https://picsum.photos/seed/einaudi/300/380' },
    albums: [
      {
        name: 'Elements', cover: 'https://picsum.photos/seed/le1/300/300', year: '2015', genre: 'Classical',
        tracks: ['Petricor', 'Elements', 'Drops', 'Whirl', 'Night', 'Cold Wind', 'Logos'],
      },
    ],
  },

  // ── MUSIC: BLUES ────────────────────────────────────────────────────────────
  {
    artist: { name: 'Gary Clark Jr.', image: 'https://picsum.photos/seed/gary/300/380' },
    albums: [
      {
        name: 'Blak and Blu', cover: 'https://picsum.photos/seed/gc1/300/300', year: '2012', genre: 'Blues',
        tracks: ['Ain\'t Messin \'Round', 'When My Train Pulls In', 'Bright Lights', 'Travis County', 'Things Are Changin\''],
      },
    ],
  },

  // ── MUSIC: FUNK ─────────────────────────────────────────────────────────────
  {
    artist: { name: 'Bruno Mars', image: 'https://picsum.photos/seed/brunomars/300/380' },
    albums: [
      {
        name: '24K Magic', cover: 'https://picsum.photos/seed/bru1/300/300', year: '2016', genre: 'Funk',
        tracks: ['24K Magic', 'Chunky', 'Perm', 'That\'s What I Like', 'Versace on the Floor', 'Finesse'],
      },
    ],
  },

  // ── MUSIC: K-POP ────────────────────────────────────────────────────────────
  {
    artist: { name: 'BTS', image: 'https://picsum.photos/seed/bts99/300/380' },
    albums: [
      {
        name: 'Map of the Soul: 7', cover: 'https://picsum.photos/seed/bts1/300/300', year: '2020', genre: 'K-Pop',
        tracks: ['Intro: Persona', 'Boy With Luv', 'Make It Right', 'Dionysus', 'ON', 'Filter'],
      },
    ],
  },

  // ── MUSIC: METAL ────────────────────────────────────────────────────────────
  {
    artist: { name: 'Metallica', image: 'https://picsum.photos/seed/metallica/300/380' },
    albums: [
      {
        name: '72 Seasons', cover: 'https://picsum.photos/seed/met1/300/300', year: '2023', genre: 'Metal',
        tracks: ['72 Seasons', 'Shadows Follow', 'Screaming Suicide', 'Sleepwalk My Life Away', 'Room of Mirrors'],
      },
    ],
  },

  // ── MUSIC: COUNTRY ───────────────────────────────────────────────────────────
  {
    artist: { name: 'Kacey Musgraves', image: 'https://picsum.photos/seed/kacey/300/380' },
    albums: [
      {
        name: 'Golden Hour', cover: 'https://picsum.photos/seed/km1/300/300', year: '2018', genre: 'Country',
        tracks: ['Slow Burn', 'Lonely Weekend', 'Butterflies', 'Oh, What a World', 'Happy & Sad', 'Rainbow'],
      },
    ],
  },
]

const DURS = ['2:58','3:10','3:22','3:35','3:47','4:02','4:18','2:45','3:55','4:30','5:01','2:30','3:08','3:42','4:15']
function fakeDur(i: number): string { return DURS[i % DURS.length] }
function durToSec(dur: string): number {
  const [m, s] = dur.split(':').map(Number)
  return m * 60 + (s || 0)
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    let artistsCreated = 0
    let albumsCreated  = 0
    let tracksCreated  = 0

    for (const entry of SEED) {
      const artist = await upsertArtist(entry.artist.name, entry.artist.image)
      artistsCreated++

      for (const albumData of entry.albums) {
        const album = await upsertAlbum(
          albumData.name,
          artist.id,
          albumData.year,
          albumData.genre,
          albumData.cover,
        )
        albumsCreated++

        for (let i = 0; i < albumData.tracks.length; i++) {
          const trackName = albumData.tracks[i]
          const dur       = fakeDur(i)
          const durSec    = durToSec(dur)
          const fileUrl   = SILENT_MP3

          // Skip if track already exists
          const { data: existing } = await supabaseAdmin
            .from('Track')
            .select('id')
            .eq('name', trackName)
            .eq('albumId', album.id)
            .maybeSingle()

          if (!existing) {
            const { error } = await supabaseAdmin.from('Track').insert({
              id:          genId(),
              name:        trackName,
              trackNumber: i + 1,
              durationSec: durSec,
              dur,
              fileUrl,
              format:      'MP3',
              genre:       albumData.genre,
              albumId:     album.id,
              artistId:    artist.id,
            })
            if (error) throw new Error(`Track "${trackName}": ${error.message}`)
            tracksCreated++
          }
        }
      }
    }

    return NextResponse.json({ ok: true, artistsCreated, albumsCreated, tracksCreated })
  } catch (err) {
    console.error('[SEED]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  const [{ count: artists }, { count: albums }, { count: tracks }] = await Promise.all([
    supabaseAdmin.from('Artist').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('Album').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('Track').select('*', { count: 'exact', head: true }),
  ])
  return NextResponse.json({ artists: artists ?? 0, albums: albums ?? 0, tracks: tracks ?? 0 })
}
