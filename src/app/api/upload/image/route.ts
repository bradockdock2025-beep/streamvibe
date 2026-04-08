import { NextRequest, NextResponse } from 'next/server'
import { saveCoverFile } from '@/lib/storage'
import { requireAdminRole } from '@/lib/guard'

// POST /api/upload/image — upload a cover/artist image, returns { url }
export async function POST(req: NextRequest) {
  const auth = await requireAdminRole(req)
  if (auth instanceof NextResponse) return auth

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
