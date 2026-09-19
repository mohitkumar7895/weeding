import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

// GET: Fetch all reels owned by the authenticated vendor
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const reels = await query<any[]>(
      `SELECT * FROM vendor_reels WHERE vendor_id = ? ORDER BY created_at DESC`,
      [user.id]
    );

    return NextResponse.json({ success: true, reels });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Create a new reel (Defaults to PENDING status for moderation)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const body = await req.json();
    const { video_url, thumbnail_url, title, description } = body;

    if (!video_url || !title) {
      return NextResponse.json({ success: false, message: 'Video URL and Title are required' }, { status: 400 });
    }

    const reelId = randomUUID();
    
    await query(
      `INSERT INTO vendor_reels (id, vendor_id, video_url, thumbnail_url, title, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [reelId, user.id, video_url, thumbnail_url || null, title, description || null]
    );

    const [newReel] = await query<any[]>(`SELECT * FROM vendor_reels WHERE id = ?`, [reelId]);

    return NextResponse.json({ success: true, reel: newReel });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
