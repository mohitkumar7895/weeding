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

    const items = await query<any[]>(
      `SELECT * FROM vendor_portfolios WHERE vendor_id = ? ORDER BY is_cover DESC, created_at DESC`,
      [vendors[0].id]
    );

    return NextResponse.json({ success: true, data: items });
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
    const { image_url, caption, is_cover = false, file_size = 2097152, file_type = 'image/jpeg' } = body;

    if (!image_url) {
      return NextResponse.json({ success: false, message: 'Media URL is required' }, { status: 400 });
    }

    // Configurable 10MB limit enforcement
    const MAX_MEDIA_SIZE = 10 * 1024 * 1024;
    if (file_size > MAX_MEDIA_SIZE) {
      return NextResponse.json({ success: false, message: 'Media exceeds 10MB upload limit' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (!allowedTypes.includes(file_type)) {
      return NextResponse.json({ success: false, message: 'File format not supported. Allowed: JPG, PNG, WEBP, MP4' }, { status: 400 });
    }

    const id = randomUUID();
    if (is_cover) {
      await query(`UPDATE vendor_portfolios SET is_cover = FALSE WHERE vendor_id = ?`, [vendorId]);
    }

    await query(
      `INSERT INTO vendor_portfolios (id, vendor_id, image_url, caption, is_cover)
       VALUES (?, ?, ?, ?, ?)`,
      [id, vendorId, image_url, caption || '', is_cover ? 1 : 0]
    );

    await logAudit(user.id, 'ADD_PORTFOLIO_ITEM', 'vendor_portfolios', id);

    return NextResponse.json({
      success: true,
      message: 'Portfolio item uploaded successfully',
      data: { id, image_url }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
