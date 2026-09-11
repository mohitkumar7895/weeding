import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT * FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor record not found' }, { status: 404 });
    }
    const vendor = vendors[0];

    const onboardingRows = await query<any[]>(`SELECT * FROM vendor_onboarding WHERE vendor_id = ?`, [vendor.id]);
    const documents = await query<any[]>(`SELECT * FROM vendor_documents WHERE vendor_id = ? ORDER BY created_at DESC`, [vendor.id]);

    let onboarding = onboardingRows.length ? onboardingRows[0] : null;
    if (!onboarding) {
      const id = randomUUID();
      await query(
        `INSERT INTO vendor_onboarding (id, vendor_id, status, checklist_json)
         VALUES (?, ?, 'DRAFT', ?)`,
        [
          id,
          vendor.id,
          JSON.stringify({
            business_profile: !!vendor.business_name && !!vendor.city,
            pan_uploaded: !!vendor.pan_number,
            bank_details: !!vendor.bank_account_number,
            packages_configured: false,
          }),
        ]
      );
      onboarding = { id, vendor_id: vendor.id, status: 'DRAFT', checklist_json: {} };
    }

    return NextResponse.json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          business_name: vendor.business_name,
          city: vendor.city,
          address: vendor.address,
          description: vendor.description,
          starting_price: vendor.starting_price,
          pan_number: vendor.pan_number,
          gst_number: vendor.gst_number,
          bank_account_number: vendor.bank_account_number ? '••••' + vendor.bank_account_number.slice(-4) : null,
          bank_ifsc: vendor.bank_ifsc,
          verification_status: vendor.verification_status,
        },
        onboarding,
        documents,
      },
    });
  } catch (error: any) {
    console.error('API /api/vendor/onboarding GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const {
      business_name,
      city,
      address,
      description,
      starting_price,
      pan_number,
      gst_number,
      bank_account_number,
      bank_ifsc,
      submit_for_review,
    } = body;

    await transaction(async (conn) => {
      // Update vendor details
      await conn.execute(
        `UPDATE vendors SET 
          business_name = COALESCE(?, business_name),
          city = COALESCE(?, city),
          address = COALESCE(?, address),
          description = COALESCE(?, description),
          starting_price = COALESCE(?, starting_price),
          pan_number = COALESCE(?, pan_number),
          gst_number = COALESCE(?, gst_number),
          bank_account_number = COALESCE(?, bank_account_number),
          bank_ifsc = COALESCE(?, bank_ifsc),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          business_name || null,
          city || null,
          address || null,
          description || null,
          starting_price ? parseFloat(starting_price) : null,
          pan_number || null,
          gst_number || null,
          bank_account_number || null,
          bank_ifsc || null,
          vendorId,
        ]
      );

      // If submitting for review
      if (submit_for_review) {
        await conn.execute(
          `UPDATE vendor_onboarding SET 
            status = 'UNDER_REVIEW',
            submitted_at = CURRENT_TIMESTAMP
          WHERE vendor_id = ?`,
          [vendorId]
        );

        await conn.execute(
          `UPDATE vendors SET verification_status = 'PENDING' WHERE id = ?`,
          [vendorId]
        );
      }
    });

    await logAudit(user.id, submit_for_review ? 'SUBMIT_VENDOR_ONBOARDING' : 'UPDATE_VENDOR_PROFILE', 'vendors', vendorId);

    return NextResponse.json({
      success: true,
      message: submit_for_review
        ? 'Onboarding submitted for compliance review. You will receive notification within 24 hours.'
        : 'Vendor details updated successfully.',
    });
  } catch (error: any) {
    console.error('API /api/vendor/onboarding PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
