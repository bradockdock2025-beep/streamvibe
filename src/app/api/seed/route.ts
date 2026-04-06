import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { genId, upsertArtist, upsertAlbum } from '@/lib/db'
import { requireAdmin } from '@/lib/guard'

// ⚠️  DEV / TEST ONLY — uses placeholder metadata and silent audio
// In production all content comes from real user uploads via /api/upload/track or /api/upload/album
// Silent placeholder MP3 (~1s, 1.5KB) — no external dependency, no copyrighted content
const SILENT_MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA'

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED = [
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
      {
        name: 'Suncity', cover: 'https://picsum.photos/seed/alb3/300/300', year: '2018', genre: 'R&B',
        tracks: ['Suncity', 'Better (feat. Disclosure)', 'Motion', "Salem's Interlude"],
      },
    ],
  },
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
  {
    artist: { name: 'Frank Ocean', image: 'https://picsum.photos/seed/frank/300/380' },
    albums: [
      {
        name: 'Blonde', cover: 'https://picsum.photos/seed/alb8/300/300', year: '2016', genre: 'R&B',
        tracks: ['Nikes', 'Ivy', 'Pink + White', 'Self Control', 'Godspeed', 'Seigfried'],
      },
      {
        name: 'Channel Orange', cover: 'https://picsum.photos/seed/alb9/300/300', year: '2012', genre: 'R&B',
        tracks: ['Thinkin Bout You', 'Sweet Life', 'Lost', 'Pyramids', 'Bad Religion'],
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
    artist: { name: 'Tyler the Creator', image: 'https://picsum.photos/seed/tyler/300/380' },
    albums: [
      {
        name: 'IGOR', cover: 'https://picsum.photos/seed/alb12/300/300', year: '2019', genre: 'Alternative',
        tracks: ["IGOR'S THEME", 'EARFQUAKE', 'I THINK', 'RUNNING OUT OF TIME', 'NEW MAGIC WAND', 'A BOY IS A GUN*'],
      },
    ],
  },
  {
    artist: { name: 'H.E.R.', image: 'https://picsum.photos/seed/her99/300/380' },
    albums: [
      {
        name: 'Back of My Mind', cover: 'https://picsum.photos/seed/alb13/300/300', year: '2021', genre: 'R&B',
        tracks: ['Damage', 'Hold On', 'Comfortable', 'We Made It', 'Come Through'],
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
  {
    artist: { name: 'Jhené Aiko', image: 'https://picsum.photos/seed/jhene/300/380' },
    albums: [
      {
        name: 'Chilombo', cover: 'https://picsum.photos/seed/alb15/300/300', year: '2020', genre: 'R&B',
        tracks: ['Triggered (freestyle)', 'Speak', 'Happiness Over Everything', 'B.S.', 'Lotus'],
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
