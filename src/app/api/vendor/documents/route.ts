import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { storageService } from '@/services/storageService';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    }

    const docs = await query<any[]>(
      `SELECT id, doc_type, document_number, file_url, file_size, mime_type, verification_status, rejection_reason, created_at
       FROM vendor_documents WHERE vendor_id = ? ORDER BY created_at DESC`,
      [vendors[0].id]
    );

    return NextResponse.json({ success: true, data: docs });
  } catch (error: any) {
    console.error('API /api/vendor/documents GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor record not found' }, { status: 404 });
    }
    const vendorId = vendors[0].id;

    const contentType = req.headers.get('content-type') || '';
    let docType = 'PAN';
    let documentNumber: string | null = null;
    let fileUrl = '';
    let fileSize = 0;
    let mimeType = 'application/pdf';

    const validDocTypes = ['PAN', 'GST', 'BUSINESS_REG', 'BANK_PASSBOOK', 'ID_PROOF', 'OTHER'];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      docType = (formData.get('doc_type') as string) || 'PAN';
      documentNumber = (formData.get('document_number') as string) || null;

      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, message: 'Document file is required' }, { status: 400 });
      }

      fileSize = file.size;
      mimeType = file.type || 'application/pdf';

      // Validate file using storage abstraction
      const validation = storageService.validateFile(fileSize, mimeType);
      if (!validation.valid) {
        return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save via pluggable storage provider
      const stored = await storageService.saveFile(buffer, file.name, mimeType, 'vendor-documents');
      fileUrl = stored.url;
      fileSize = stored.sizeBytes;
    } else {
      // JSON payload support
      const body = await req.json();
      docType = body.doc_type;
      documentNumber = body.document_number || null;
      fileUrl = body.file_url;
      fileSize = body.file_size || 1048576;
      mimeType = body.mime_type || 'application/pdf';

      if (!fileUrl) {
        return NextResponse.json({ success: false, message: 'file_url is required' }, { status: 400 });
      }

      const validation = storageService.validateFile(fileSize, mimeType);
      if (!validation.valid) {
        return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
      }
    }

    if (!validDocTypes.includes(docType)) {
      return NextResponse.json(
        { success: false, message: `Invalid doc_type. Allowed types: ${validDocTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const docId = `doc_${Date.now()}_${randomUUID().substring(0, 6)}`;
    await query(
      `INSERT INTO vendor_documents (
        id, vendor_id, doc_type, document_number, file_url, file_size, mime_type, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [docId, vendorId, docType, documentNumber, fileUrl, fileSize, mimeType]
    );

    // If PAN document was uploaded and pan_number was provided, update vendors.pan_number
    if (docType === 'PAN' && documentNumber) {
      await query(`UPDATE vendors SET pan_number = ? WHERE id = ?`, [documentNumber.toUpperCase(), vendorId]);
    } else if (docType === 'GST' && documentNumber) {
      await query(`UPDATE vendors SET gst_number = ? WHERE id = ?`, [documentNumber.toUpperCase(), vendorId]);
    }

    // Update onboarding checklist flags
    const isPan = docType === 'PAN';
    await query(
      `UPDATE vendor_onboarding SET checklist_json = JSON_SET(
        COALESCE(checklist_json, '{}'),
        '$.documents_uploaded', true,
        '$.pan_uploaded', ${isPan ? 'true' : "COALESCE(JSON_EXTRACT(checklist_json, '$.pan_uploaded'), false)"}
      ) WHERE vendor_id = ?`,
      [vendorId]
    );

    await logAudit(user.id, 'UPLOAD_VENDOR_DOCUMENT', 'vendor_documents', docId, {
      doc_type: docType,
      document_number: documentNumber,
      file_url: fileUrl,
      file_size: fileSize,
    });

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully and queued for compliance verification',
      data: {
        id: docId,
        doc_type: docType,
        document_number: documentNumber,
        file_url: fileUrl,
        file_size: fileSize,
        mime_type: mimeType,
        verification_status: 'PENDING',
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('API /api/vendor/documents POST Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to upload document' }, { status: 500 });
  }
}
