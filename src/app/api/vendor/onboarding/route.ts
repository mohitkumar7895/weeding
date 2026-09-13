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

    const vendors = await query<any[]>(
      `SELECT v.*, c.name AS category_name, c.slug AS category_slug, u.name AS owner_name, u.email, u.phone
       FROM vendors v
       LEFT JOIN categories c ON v.category_id = c.id
       JOIN users u ON v.user_id = u.id
       WHERE v.user_id = ?`,
      [user.id]
    );

    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor record not found' }, { status: 404 });
    }
    const vendor = vendors[0];

    const [onboardingRows, documents, packageRows, serviceRows] = await Promise.all([
      query<any[]>(`SELECT * FROM vendor_onboarding WHERE vendor_id = ?`, [vendor.id]),
      query<any[]>(`SELECT * FROM vendor_documents WHERE vendor_id = ? ORDER BY created_at DESC`, [vendor.id]),
      query<any[]>(`SELECT COUNT(*) AS count FROM vendor_packages WHERE vendor_id = ?`, [vendor.id]),
      query<any[]>(`SELECT COUNT(*) AS count FROM vendor_services WHERE vendor_id = ?`, [vendor.id]),
    ]);

    const packageCount = packageRows[0]?.count || 0;
    const serviceCount = serviceRows[0]?.count || 0;

    const hasBusinessProfile = !!vendor.business_name && !!vendor.city && !!vendor.address && !!vendor.starting_price;
    const hasDocuments = documents.length > 0;
    const hasPan = documents.some((d: any) => d.doc_type === 'PAN') || !!vendor.pan_number;
    const hasBank = !!vendor.bank_account_number && !!vendor.bank_ifsc;
    const hasPackages = packageCount > 0 || serviceCount > 0;

    const updatedChecklist = {
      business_profile: hasBusinessProfile,
      documents_uploaded: hasDocuments,
      pan_uploaded: hasPan,
      bank_details: hasBank,
      packages_configured: hasPackages,
    };

    let onboarding = onboardingRows.length ? onboardingRows[0] : null;
    if (!onboarding) {
      const id = `onb_${vendor.id}`;
      await query(
        `INSERT INTO vendor_onboarding (id, vendor_id, status, checklist_json)
         VALUES (?, ?, 'DRAFT', ?)`,
        [id, vendor.id, JSON.stringify(updatedChecklist)]
      );
      onboarding = { id, vendor_id: vendor.id, status: 'DRAFT', checklist_json: updatedChecklist };
    } else {
      // Keep checklist_json synchronized in DB
      await query(
        `UPDATE vendor_onboarding SET checklist_json = ? WHERE vendor_id = ?`,
        [JSON.stringify(updatedChecklist), vendor.id]
      );
      onboarding.checklist_json = updatedChecklist;
    }

    return NextResponse.json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          business_name: vendor.business_name,
          category_id: vendor.category_id,
          category_name: vendor.category_name,
          category_slug: vendor.category_slug,
          owner_name: vendor.owner_name,
          email: vendor.email,
          phone: vendor.phone,
          city: vendor.city,
          address: vendor.address,
          description: vendor.description,
          starting_price: vendor.starting_price,
          pan_number: vendor.pan_number,
          gst_number: vendor.gst_number,
          bank_account_number: vendor.bank_account_number,
          bank_ifsc: vendor.bank_ifsc,
          verification_status: vendor.verification_status,
          is_verified: vendor.verification_status === 'VERIFIED',
          rating: vendor.rating,
          review_count: vendor.review_count,
        },
        onboarding: {
          ...onboarding,
          checklist: updatedChecklist,
        },
        documents,
        packages_count: packageCount,
        services_count: serviceCount,
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

    const vendors = await query<any[]>(`SELECT id, user_id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor record not found' }, { status: 404 });
    }
    const vendorId = vendors[0].id;

    const body = await req.json();
    const {
      business_name,
      category_id,
      city,
      address,
      description,
      starting_price,
      owner_name,
      phone,
      pan_number,
      gst_number,
      bank_account_number,
      bank_ifsc,
      submit_for_review,
    } = body;

    await transaction(async (conn) => {
      // 1. Update user info if contact fields provided
      if (owner_name || phone) {
        await conn.execute(
          `UPDATE users SET 
            name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [owner_name || null, phone || null, user.id]
        );
      }

      // 2. Update vendor business and financial details
      await conn.execute(
        `UPDATE vendors SET 
          business_name = COALESCE(?, business_name),
          category_id = COALESCE(?, category_id),
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
          category_id || null,
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

      // 3. If submitting for review
      if (submit_for_review) {
        await conn.execute(
          `UPDATE vendor_onboarding SET 
            status = 'UNDER_REVIEW',
            rejection_reason = NULL,
            submitted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE vendor_id = ?`,
          [vendorId]
        );

        await conn.execute(
          `UPDATE vendors SET verification_status = 'PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [vendorId]
        );
      }
    });

    await logAudit(
      user.id,
      submit_for_review ? 'SUBMIT_VENDOR_ONBOARDING' : 'UPDATE_VENDOR_PROFILE',
      'vendors',
      vendorId
    );

    return NextResponse.json({
      success: true,
      message: submit_for_review
        ? 'Dossier successfully submitted for compliance review. You will be notified once reviewed.'
        : 'Vendor details updated successfully.',
    });
  } catch (error: any) {
    console.error('API /api/vendor/onboarding PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
