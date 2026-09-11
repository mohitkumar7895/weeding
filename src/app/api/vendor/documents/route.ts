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

    const docs = await query<any[]>(
      `SELECT id, doc_type, document_number, file_url, file_size, mime_type, verification_status, rejection_reason, created_at
       FROM vendor_documents WHERE vendor_id = ? ORDER BY created_at DESC`,
      [vendors[0].id]
    );

    return NextResponse.json({ success: true, data: docs });
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
    const { doc_type, document_number, file_url, file_size = 1048576, mime_type = 'application/pdf' } = body;

    const validDocTypes = ['PAN', 'GST', 'BUSINESS_REG', 'BANK_PASSBOOK', 'ID_PROOF', 'OTHER'];
    if (!validDocTypes.includes(doc_type) || !file_url) {
      return NextResponse.json({ success: false, message: 'Valid doc_type and file_url are required' }, { status: 400 });
    }

    // Configurable 10MB limit enforcement
    const MAX_DOC_SIZE = 10 * 1024 * 1024;
    if (file_size > MAX_DOC_SIZE) {
      return NextResponse.json({ success: false, message: 'Document exceeds 10MB size limit' }, { status: 400 });
    }

    const docId = randomUUID();
    await query(
      `INSERT INTO vendor_documents (
        id, vendor_id, doc_type, document_number, file_url, file_size, mime_type, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [docId, vendorId, doc_type, document_number || null, file_url, file_size, mime_type]
    );

    // Update onboarding checklist flag
    await query(
      `UPDATE vendor_onboarding SET checklist_json = JSON_SET(COALESCE(checklist_json, '{}'), '$.documents_uploaded', true) WHERE vendor_id = ?`,
      [vendorId]
    );

    await logAudit(user.id, 'UPLOAD_VENDOR_DOCUMENT', 'vendor_documents', docId, { doc_type, file_url });

    return NextResponse.json({
      success: true,
      message: 'Document uploaded for verification',
      data: { id: docId, verification_status: 'PENDING' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
