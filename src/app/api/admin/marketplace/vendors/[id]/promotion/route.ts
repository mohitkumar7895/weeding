import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const body = await req.json();
    const { is_featured, is_sponsored } = body;

    const existing = await query<any[]>(`SELECT id FROM vendors WHERE id = ?`, [id]);
    if (!existing.length) return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });

    await query(
      `UPDATE vendors SET 
        is_featured = COALESCE(?, is_featured),
        is_sponsored = COALESCE(?, is_sponsored)
       WHERE id = ?`,
      [
        is_featured !== undefined ? (is_featured ? 1 : 0) : null,
        is_sponsored !== undefined ? (is_sponsored ? 1 : 0) : null,
        id
      ]
    );

    await logAudit(auth.user!.id, 'UPDATE_VENDOR_PROMOTION', 'vendors', id, { is_featured, is_sponsored });

    return NextResponse.json({ success: true, message: 'Vendor promotion status updated' });
  } catch (error: any) {
    console.error('API /api/admin/marketplace/vendors/[id]/promotion PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
