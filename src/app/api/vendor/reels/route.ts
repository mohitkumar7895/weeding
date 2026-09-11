import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });

    const reels = await query<any[]>(
      `SELECT * FROM vendor_reels WHERE vendor_id = ? ORDER BY created_at DESC`,
      [vendors[0].id]
    );

    return NextResponse.json({ success: true, data: reels });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    const vendorId = vendors[0].id;

    const body = await req.json();
    const { video_url, thumbnail_url, title, description } = body;

    if (!video_url || !title) {
      return NextResponse.json({ success: false, message: 'video_url and title are required' }, { status: 400 });
    }

    const reelId = randomUUID();
    await query(
      `INSERT INTO vendor_reels (id, vendor_id, video_url, thumbnail_url, title, description, is_approved)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [reelId, vendorId, video_url, thumbnail_url || '/images/photographer.jpg', title, description || '']
    );

    await logAudit(user.id, 'UPLOAD_REEL', 'vendor_reels', reelId, { title });

    return NextResponse.json({
      success: true,
      message: 'Reel published to WedWithMe video discovery feed!',
      data: { id: reelId }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
