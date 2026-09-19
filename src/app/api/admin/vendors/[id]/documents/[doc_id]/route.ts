import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; doc_id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const { id, doc_id } = await params;
    const body = await req.json();
    const { verification_status, rejection_reason } = body;

    if (!verification_status || !['VERIFIED', 'REJECTED'].includes(verification_status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
    }

    const docs = await query<any[]>(`SELECT id FROM vendor_documents WHERE id = ? AND vendor_id = ?`, [doc_id, id]);
    if (!docs.length) {
      return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 });
    }

    await query(
      `UPDATE vendor_documents SET 
        verification_status = ?, 
        rejection_reason = ?, 
        verified_by = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [verification_status, rejection_reason || null, auth.user!.id, doc_id]
    );

    await logAudit(auth.user!.id, 'VERIFY_VENDOR_DOCUMENT', 'vendor_documents', doc_id, {
      vendor_id: id,
      verification_status,
      rejection_reason
    });

    return NextResponse.json({ success: true, message: 'Document verification updated successfully' });
  } catch (error: any) {
    console.error('API /api/admin/vendors/[id]/documents/[doc_id] PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
