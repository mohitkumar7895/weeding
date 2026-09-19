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
    const { resource_type, resource_id, moderation_status } = body; 
    // resource_type: 'service', 'package', 'portfolio'
    // moderation_status: 'APPROVED', 'REJECTED', 'PENDING_REVIEW'

    if (!['APPROVED', 'REJECTED', 'PENDING_REVIEW', 'INACTIVE'].includes(moderation_status)) {
      return NextResponse.json({ success: false, message: 'Invalid moderation status' }, { status: 400 });
    }

    let tableName = '';
    if (resource_type === 'service') tableName = 'vendor_services';
    else if (resource_type === 'package') tableName = 'vendor_packages';
    else if (resource_type === 'portfolio') tableName = 'vendor_portfolios';
    else return NextResponse.json({ success: false, message: 'Invalid resource type' }, { status: 400 });

    const existing = await query<any[]>(`SELECT id FROM \${tableName} WHERE id = ? AND vendor_id = ?`, [resource_id, id]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Resource not found' }, { status: 404 });
    }

    await query(`UPDATE \${tableName} SET moderation_status = ? WHERE id = ?`, [moderation_status, resource_id]);

    await logAudit(auth.user!.id, 'MODERATE_CONTENT', tableName, resource_id, {
      vendor_id: id,
      moderation_status
    });

    return NextResponse.json({ success: true, message: 'Content moderation status updated' });
  } catch (error: any) {
    console.error('API /api/admin/vendors/[id]/moderation PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
