import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (!auth.ok) return auth.response!;

    const { id } = await params;

    const availability = await query<any[]>(
      `SELECT id, date, is_booked, notes, updated_at FROM vendor_availability WHERE vendor_id = ? ORDER BY date DESC LIMIT 100`,
      [id]
    );

    return NextResponse.json({ success: true, data: availability });
  } catch (error: any) {
    console.error('API /api/admin/vendors/[id]/availability GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
