import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Row shape returned by the v_TrackFull Supabase view
interface TrackFullRow {
  track_id:     string
  track_name:   string
  trackNumber:  number
  dur:          string
  durationSec:  number
  fileUrl:      string
  fileSize:     number
  format:       string
  track_genre:  string
  album_id:     string
  album_name:   string
  album_cover:  string
  year:         string
  artist_id:    string
  artist_name:  string
  artist_image: string
  liked:        boolean
}

function rowToApiTrack(r: TrackFullRow) {
  return {
    id:          r.track_id,
    name:        r.track_name,
    trackNumber: r.trackNumber,
    durationSec: r.durationSec,
    dur:         r.dur,
    fileUrl:     r.fileUrl,
    fileSize:    r.fileSize ?? 0,
    format:      r.format,
    genre:       r.track_genre,
    albumId:     r.album_id,
    artistId:    r.artist_id,
    liked:       r.liked,
    album:  { id: r.album_id,    name: r.album_name,   cover: r.album_cover },
    artist: { id: r.artist_id,   name: r.artist_name },
  }
}

// GET /api/tracks?search=xxx&albumId=xxx&artistId=xxx&liked=true
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const search    = searchParams.get('search')?.trim()
  const albumId   = searchParams.get('albumId')
  const artistId  = searchParams.get('artistId')
  const likedOnly = searchParams.get('liked') === 'true'

  // Use v_TrackFull — it already JOINs Artist + Album + Like in one query
  // This gives us correct liked status and enables cross-table search
  let query = supabaseAdmin
    .from('v_TrackFull')
    .select('*')
    .limit(200)

  if (albumId)   query = query.eq('album_id',  albumId)
  if (artistId)  query = query.eq('artist_id', artistId)
  if (likedOnly) query = query.eq('liked',     true)

  if (search) {
    // Real cross-table search: track name OR artist name OR album name
    query = query
      .or(`track_name.ilike.%${search}%,artist_name.ilike.%${search}%,album_name.ilike.%${search}%`)
      .order('track_name', { ascending: true })
  } else {
    query = query.order('year', { ascending: false })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json((data ?? []).map(rowToApiTrack))
}
