import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const reels = await query<any[]>(
      `SELECT r.*, v.business_name, v.city, v.rating, c.name as category_name
       FROM vendor_reels r
       JOIN vendors v ON r.vendor_id = v.id
       JOIN categories c ON v.category_id = c.id
       WHERE r.is_approved = TRUE
       ORDER BY r.display_order ASC, r.views_count DESC
       LIMIT ?`,
      [limit]
    );

    return NextResponse.json({ success: true, data: reels });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
