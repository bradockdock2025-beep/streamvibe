import { NextRequest, NextResponse } from 'next/server'
import { saveCoverFile } from '@/lib/storage'
import { requireAdmin } from '@/lib/guard'

// POST /api/upload/image — upload a cover/artist image, returns { url }
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 })
  }

  try {
    const url = await saveCoverFile(file)
    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
