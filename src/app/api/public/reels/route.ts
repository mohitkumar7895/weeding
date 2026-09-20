import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Note: We use cursor-based or standard pagination in production. For MVP, we limit to 50.
    
    // CRITICAL SECURITY: Only return reels where the reel is APPROVED *and* the vendor is APPROVED.
    const reels = await query<any[]>(
      `SELECT r.id, r.vendor_id, r.video_url, r.thumbnail_url, r.title, r.description, r.created_at,
              v.business_name, u.category, v.city
       FROM vendor_reels r
       JOIN vendors v ON r.vendor_id = v.id
       JOIN users u ON v.id = u.id
       WHERE (r.status = 'APPROVED' OR r.is_approved = TRUE)
         AND v.verification_status IN ('APPROVED', 'VERIFIED')
       ORDER BY r.created_at DESC
       LIMIT 50`
    );

    return NextResponse.json({ success: true, reels });
  } catch (error: any) {
    console.error('Public Reels Fetch Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to load reels feed' }, { status: 500 });
  }
}
