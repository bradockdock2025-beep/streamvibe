import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/guard'
import { randomUUID } from 'crypto'

const ALLOWED_BUCKETS = ['audio', 'covers'] as const
type Bucket = (typeof ALLOWED_BUCKETS)[number]

// POST /api/upload/sign
// Body: { filename: string, bucket: 'audio' | 'covers' }
// Returns: { signedUrl, path, token, publicUrl }
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const { filename, bucket } = await req.json() as { filename?: string; bucket?: string }

  if (!filename || !bucket || !ALLOWED_BUCKETS.includes(bucket as Bucket)) {
    return NextResponse.json({ error: 'filename and bucket (audio|covers) are required' }, { status: 400 })
  }

  const ext  = filename.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${randomUUID()}.${ext}`

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create signed URL' }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path,
    token: data.token,
    publicUrl: pub.publicUrl,
  })
}
