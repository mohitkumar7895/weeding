import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id, category_id, city FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }
    const vendorId = vendors[0].id;

    const services = await query<any[]>(
      `SELECT 
        vs.id,
        vs.vendor_id,
        vs.title,
        vs.description,
        vs.starting_price,
        vs.is_active,
        vs.moderation_status,
        vs.rejection_reason,
        vs.service_location,
        vs.category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        vs.created_at,
        vs.updated_at
      FROM vendor_services vs
      LEFT JOIN categories c ON vs.category_id = c.id
      WHERE vs.vendor_id = ?
      ORDER BY vs.created_at DESC`,
      [vendorId]
    );

    const formattedServices = services.map((s) => ({
      ...s,
      starting_price: parseFloat(s.starting_price) || 0,
      is_active: Boolean(s.is_active),
      moderation_status: s.moderation_status || 'PENDING_REVIEW',
    }));

    return NextResponse.json({ success: true, data: formattedServices });
  } catch (error: any) {
    console.error('API /api/vendor/services GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id, category_id, city FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }
    const vendor = vendors[0];
    const vendorId = vendor.id;

    const body = await req.json();
    const { title, description, starting_price, category_id, service_location } = body;

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return NextResponse.json({ success: false, message: 'Service title must be at least 2 characters' }, { status: 400 });
    }

    if (starting_price === undefined || starting_price === null || isNaN(parseFloat(starting_price)) || parseFloat(starting_price) < 0) {
      return NextResponse.json({ success: false, message: 'Starting price must be a non-negative number' }, { status: 400 });
    }

    // Determine target category and validate existence
    const targetCategoryId = category_id || vendor.category_id;
    if (targetCategoryId) {
      const catRows = await query<any[]>(`SELECT id FROM categories WHERE id = ? AND is_active = TRUE`, [targetCategoryId]);
      if (!catRows.length) {
        return NextResponse.json({ success: false, message: 'Selected wedding category is invalid or inactive' }, { status: 400 });
      }
    }

    const targetLocation = service_location && service_location.trim() ? service_location.trim() : (vendor.city || 'India');

    const serviceId = `srv_${Date.now()}_${randomUUID().substring(0, 8)}`;
    await query(
      `INSERT INTO vendor_services (
        id, vendor_id, category_id, title, description, starting_price, service_location, is_active, moderation_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 'PENDING_REVIEW')`,
      [
        serviceId,
        vendorId,
        targetCategoryId || null,
        title.trim(),
        description ? description.trim() : '',
        parseFloat(starting_price),
        targetLocation,
      ]
    );

    // Update vendor onboarding checklist checkpoint
    await query(
      `UPDATE vendor_onboarding SET checklist_json = JSON_SET(
        COALESCE(checklist_json, '{}'),
        '$.packages_configured', true
      ) WHERE vendor_id = ?`,
      [vendorId]
    );

    await logAudit(user.id, 'CREATE_SERVICE', 'vendor_services', serviceId, {
      title: title.trim(),
      category_id: targetCategoryId,
      starting_price: parseFloat(starting_price),
      service_location: targetLocation,
    });

    return NextResponse.json({
      success: true,
      message: 'Wedding service created and submitted for compliance moderation',
      data: {
        id: serviceId,
        title: title.trim(),
        category_id: targetCategoryId,
        service_location: targetLocation,
        starting_price: parseFloat(starting_price),
        is_active: true,
        moderation_status: 'PENDING_REVIEW',
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('API /api/vendor/services POST Error:', error);
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
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }
    const vendorId = vendors[0].id;

    const body = await req.json();
    const { id, title, description, starting_price, category_id, service_location, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Service ID is required' }, { status: 400 });
    }

    // Tenant isolation verification
    const existing = await query<any[]>(`SELECT * FROM vendor_services WHERE id = ? AND vendor_id = ?`, [id, vendorId]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Service not found or unauthorized' }, { status: 404 });
    }
    const current = existing[0];

    // Validate category if updating category
    if (category_id) {
      const catRows = await query<any[]>(`SELECT id FROM categories WHERE id = ? AND is_active = TRUE`, [category_id]);
      if (!catRows.length) {
        return NextResponse.json({ success: false, message: 'Selected wedding category is invalid or inactive' }, { status: 400 });
      }
    }

    if (starting_price !== undefined && (isNaN(parseFloat(starting_price)) || parseFloat(starting_price) < 0)) {
      return NextResponse.json({ success: false, message: 'Starting price must be a non-negative number' }, { status: 400 });
    }

    // If core content fields changed, re-queue for moderation
    const contentChanged = (title && title !== current.title) ||
      (description !== undefined && description !== current.description) ||
      (starting_price !== undefined && parseFloat(starting_price) !== parseFloat(current.starting_price)) ||
      (category_id && category_id !== current.category_id);

    const newModerationStatus = contentChanged ? 'PENDING_REVIEW' : current.moderation_status;
    const newRejectionReason = contentChanged ? null : current.rejection_reason;

    await query(
      `UPDATE vendor_services SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category_id = COALESCE(?, category_id),
        service_location = COALESCE(?, service_location),
        starting_price = COALESCE(?, starting_price),
        is_active = COALESCE(?, is_active),
        moderation_status = ?,
        rejection_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND vendor_id = ?`,
      [
        title ? title.trim() : null,
        description !== undefined ? description : null,
        category_id || null,
        service_location ? service_location.trim() : null,
        starting_price !== undefined ? parseFloat(starting_price) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        newModerationStatus,
        newRejectionReason,
        id,
        vendorId,
      ]
    );

    await logAudit(user.id, 'UPDATE_SERVICE', 'vendor_services', id, {
      title,
      category_id,
      starting_price,
      is_active,
      moderation_status: newModerationStatus,
    });

    const updatedRows = await query<any[]>(
      `SELECT vs.*, c.name AS category_name, c.slug AS category_slug 
       FROM vendor_services vs 
       LEFT JOIN categories c ON vs.category_id = c.id 
       WHERE vs.id = ? AND vs.vendor_id = ?`,
      [id, vendorId]
    );

    return NextResponse.json({
      success: true,
      message: contentChanged
        ? 'Service updated and queued for compliance moderation'
        : 'Service status updated successfully',
      data: updatedRows[0] || null,
    });
  } catch (error: any) {
    console.error('API /api/vendor/services PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }
    const vendorId = vendors[0].id;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Service ID is required' }, { status: 400 });
    }

    // Verify ownership before delete
    const existing = await query<any[]>(`SELECT id FROM vendor_services WHERE id = ? AND vendor_id = ?`, [id, vendorId]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Service not found or unauthorized' }, { status: 404 });
    }

    await query(`DELETE FROM vendor_services WHERE id = ? AND vendor_id = ?`, [id, vendorId]);
    await logAudit(user.id, 'DELETE_SERVICE', 'vendor_services', id);

    return NextResponse.json({ success: true, message: 'Wedding service deleted successfully' });
  } catch (error: any) {
    console.error('API /api/vendor/services DELETE Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
