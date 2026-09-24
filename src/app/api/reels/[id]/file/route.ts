import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureReelsSocialTables } from '@/lib/reelsSocial';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureReelsSocialTables();
    const { id } = await params;
    const rows = await query<any[]>(
      `SELECT mime_type, data FROM reel_files WHERE reel_id = ? LIMIT 1`,
      [id]
    );
    const file = rows[0];
    if (!file?.data) {
      return NextResponse.json({ success: false, message: 'Video not found' }, { status: 404 });
    }
    const body = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': file.mime_type || 'video/mp4',
        'Content-Length': String(body.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
