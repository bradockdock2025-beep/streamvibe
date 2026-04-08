// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  name:     string
  email:    string
  initials: string
}

// ─── Music ───────────────────────────────────────────────────────────────────
export interface Track {
  id:          string
  name:        string
  dur:         string          // display string "3:22"
  durationSec: number          // seconds (0 if unknown)
  trackNumber: number
  fileUrl:     string          // "/uploads/audio/..." or external URL
  fileSize:    number          // bytes
  format:      string          // "MP3" | "FLAC" | "WAV" | "M4A"
  genre:       string
  albumId:     string
  artistId:    string
}

export interface Album {
  id:       string
  name:     string
  artistId: string
  artist:   string             // display name (denormalized)
  cover:    string
  year:     string
  genre:    string
  tracks:   Track[]
}

export interface Artist {
  id:         string
  name:       string
  image:      string
  bio:        string
  albumCount: number
  trackCount: number
}

export interface PlaylistEntry {
  id:    string
  order: number
  track: Track
  album: { id: string; name: string; cover: string }
  artist: { id: string; name: string }
}

export interface Playlist {
  id:          string
  name:        string
  description: string
  createdAt:   string
  covers:      string[]        // up to 4 album covers for mosaic grid
  trackCount:  number
  totalDur:    string          // e.g. "1h 28m"
  tracks:      PlaylistEntry[]
}

export interface UploadFile {
  id:       string
  name:     string
  size:     string
  progress: number
  done:     boolean
  fileRef?: File               // actual File object for real upload
}

// ─── App ─────────────────────────────────────────────────────────────────────
export type AppPage   = 'auth' | 'hub' | 'app'
export type MpView    = 'library' | 'playlists' | 'artists' | 'songs' | 'popular' | 'radio' | 'upload' | 'analytics'

// ─── API response shapes ──────────────────────────────────────────────────────
// Prisma includes nested relations; these match the API JSON output

export interface ApiAlbum {
  id:        string
  name:      string
  year:      string
  genre:     string
  cover:     string
  artistId:  string
  createdAt: string
  artist:    { id: string; name: string; image: string; bio: string }
  tracks:    ApiTrack[]
}

export interface ApiTrack {
  id:          string
  name:        string
  trackNumber: number
  durationSec: number
  dur:         string
  fileUrl:     string
  fileSize:    number
  format:      string
  genre:       string
  albumId:     string
  artistId:    string
  createdAt:   string
  album?:      { id: string; name: string; cover: string }
  artist?:     { id: string; name: string }
  liked?:      boolean
}

export interface ApiArtist {
  id:         string
  name:       string
  image:      string
  bio:        string
  albumCount: number
  trackCount: number
}

export interface ApiPlaylist {
  id:          string
  name:        string
  description: string
  createdAt:   string
  tracks: Array<{
    id:     string
    order:  number
    track: ApiTrack
  }>
}
