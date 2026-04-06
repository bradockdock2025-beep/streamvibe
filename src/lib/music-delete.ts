import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { deleteFile } from '@/lib/storage'

export interface DeleteSummary {
  deletedArtistIds: string[]
  deletedAlbumIds: string[]
  deletedTrackIds: string[]
  cleanupErrors: string[]
}

interface ArtistRow {
  id: string
  image: string
}

interface AlbumRow {
  id: string
  artistId: string
  cover: string
}

interface TrackRow {
  id: string
  artistId: string
  albumId: string
  fileUrl: string
}

function createSummary(): DeleteSummary {
  return {
    deletedArtistIds: [],
    deletedAlbumIds: [],
    deletedTrackIds: [],
    cleanupErrors: [],
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

async function cleanupFiles(fileUrls: string[]): Promise<string[]> {
  const errors: string[] = []
  const urls = unique(fileUrls)
  const results = await Promise.allSettled(urls.map(async (fileUrl) => {
    await deleteFile(fileUrl)
  }))

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      errors.push(`cleanup ${urls[index]}: ${String(result.reason)}`)
    }
  })

  return errors
}

async function maybeDeleteOrphanArtist(
  artistId: string,
  artistImage = '',
): Promise<Pick<DeleteSummary, 'deletedArtistIds' | 'cleanupErrors'>> {
  const [albumRes, trackRes] = await Promise.all([
    supabaseAdmin.from('Album').select('id').eq('artistId', artistId).limit(1),
    supabaseAdmin.from('Track').select('id').eq('artistId', artistId).limit(1),
  ])

  if (albumRes.error) throw new Error(albumRes.error.message)
  if (trackRes.error) throw new Error(trackRes.error.message)

  if ((albumRes.data?.length ?? 0) > 0 || (trackRes.data?.length ?? 0) > 0) {
    return { deletedArtistIds: [], cleanupErrors: [] }
  }

  const { error } = await supabaseAdmin.from('Artist').delete().eq('id', artistId)
  if (error) throw new Error(error.message)

  return {
    deletedArtistIds: [artistId],
    cleanupErrors: artistImage ? await cleanupFiles([artistImage]) : [],
  }
}

export async function deleteAlbumCascade(albumId: string): Promise<DeleteSummary> {
  const summary = createSummary()

  const { data: album, error: albumError } = await supabaseAdmin
    .from('Album')
    .select('id, artistId, cover, artist:Artist(id, image), tracks:Track(id, fileUrl)')
    .eq('id', albumId)
    .single()

  if (albumError || !album) throw new Error(albumError?.message ?? 'Album not found')

  const artist = Array.isArray(album.artist) ? album.artist[0] : album.artist as ArtistRow | null
  const tracks = (album.tracks ?? []) as Array<Pick<TrackRow, 'id' | 'fileUrl'>>

  const { error } = await supabaseAdmin.from('Album').delete().eq('id', albumId)
  if (error) throw new Error(error.message)

  summary.deletedAlbumIds.push(albumId)
  summary.deletedTrackIds.push(...tracks.map((track) => track.id))
  summary.cleanupErrors.push(...await cleanupFiles([
    album.cover,
    ...tracks.map((track) => track.fileUrl),
  ]))

  if (artist?.id) {
    const orphan = await maybeDeleteOrphanArtist(artist.id, artist.image)
    summary.deletedArtistIds.push(...orphan.deletedArtistIds)
    summary.cleanupErrors.push(...orphan.cleanupErrors)
  }

  summary.deletedArtistIds = unique(summary.deletedArtistIds)
  summary.deletedAlbumIds = unique(summary.deletedAlbumIds)
  summary.deletedTrackIds = unique(summary.deletedTrackIds)
  return summary
}

export async function deleteTrackCascade(trackId: string): Promise<DeleteSummary> {
  const summary = createSummary()

  const { data: track, error: trackError } = await supabaseAdmin
    .from('Track')
    .select('id, artistId, albumId, fileUrl')
    .eq('id', trackId)
    .single()

  if (trackError || !track) throw new Error(trackError?.message ?? 'Track not found')

  const { data: album, error: albumError } = await supabaseAdmin
    .from('Album')
    .select('id, cover, artist:Artist(id, image)')
    .eq('id', track.albumId)
    .single()

  if (albumError || !album) throw new Error(albumError?.message ?? 'Album not found')

  const artist = Array.isArray(album.artist) ? album.artist[0] : album.artist as ArtistRow | null

  const { error } = await supabaseAdmin.from('Track').delete().eq('id', trackId)
  if (error) throw new Error(error.message)

  summary.deletedTrackIds.push(trackId)
  summary.cleanupErrors.push(...await cleanupFiles([track.fileUrl]))

  const { data: albumTracks, error: albumTracksError } = await supabaseAdmin
    .from('Track')
    .select('id')
    .eq('albumId', track.albumId)
    .limit(1)

  if (albumTracksError) throw new Error(albumTracksError.message)

  if ((albumTracks?.length ?? 0) === 0) {
    const { error: deleteAlbumError } = await supabaseAdmin.from('Album').delete().eq('id', track.albumId)
    if (deleteAlbumError) throw new Error(deleteAlbumError.message)

    summary.deletedAlbumIds.push(track.albumId)
    if (album.cover) {
      summary.cleanupErrors.push(...await cleanupFiles([album.cover]))
    }
  }

  if (artist?.id) {
    const orphan = await maybeDeleteOrphanArtist(artist.id, artist.image)
    summary.deletedArtistIds.push(...orphan.deletedArtistIds)
    summary.cleanupErrors.push(...orphan.cleanupErrors)
  }

  summary.deletedArtistIds = unique(summary.deletedArtistIds)
  summary.deletedAlbumIds = unique(summary.deletedAlbumIds)
  summary.deletedTrackIds = unique(summary.deletedTrackIds)
  return summary
}

export async function deleteArtistCascade(artistId: string): Promise<DeleteSummary> {
  const summary = createSummary()

  const [{ data: artist, error: artistError }, { data: albums, error: albumsError }, { data: tracks, error: tracksError }] = await Promise.all([
    supabaseAdmin.from('Artist').select('id, image').eq('id', artistId).single(),
    supabaseAdmin.from('Album').select('id, artistId, cover').eq('artistId', artistId),
    supabaseAdmin.from('Track').select('id, artistId, albumId, fileUrl').eq('artistId', artistId),
  ])

  if (artistError || !artist) throw new Error(artistError?.message ?? 'Artist not found')
  if (albumsError) throw new Error(albumsError.message)
  if (tracksError) throw new Error(tracksError.message)

  const albumRows = (albums ?? []) as AlbumRow[]
  const trackRows = (tracks ?? []) as TrackRow[]

  const { error: tracksDeleteError } = await supabaseAdmin.from('Track').delete().eq('artistId', artistId)
  if (tracksDeleteError) throw new Error(tracksDeleteError.message)

  const { error: albumsDeleteError } = await supabaseAdmin.from('Album').delete().eq('artistId', artistId)
  if (albumsDeleteError) throw new Error(albumsDeleteError.message)

  const { error: artistDeleteError } = await supabaseAdmin.from('Artist').delete().eq('id', artistId)
  if (artistDeleteError) throw new Error(artistDeleteError.message)

  summary.deletedArtistIds.push(artistId)
  summary.deletedAlbumIds.push(...albumRows.map((album) => album.id))
  summary.deletedTrackIds.push(...trackRows.map((track) => track.id))
  summary.cleanupErrors.push(...await cleanupFiles([
    artist.image,
    ...albumRows.map((album) => album.cover),
    ...trackRows.map((track) => track.fileUrl),
  ]))

  summary.deletedArtistIds = unique(summary.deletedArtistIds)
  summary.deletedAlbumIds = unique(summary.deletedAlbumIds)
  summary.deletedTrackIds = unique(summary.deletedTrackIds)
  return summary
}
