import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET: Fetch all reels owned by the authenticated vendor
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const reels = await query<any[]>(
      `SELECT * FROM vendor_reels WHERE author_user_id = ? OR vendor_id IN (SELECT id FROM vendors WHERE user_id = ?)
       ORDER BY created_at DESC`,
      [user.id, user.id]
    );

    return NextResponse.json({ success: true, reels });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { success: false, message: 'Upload a video file from Reels studio. Video URLs are not allowed.' },
    { status: 400 }
  );
}
