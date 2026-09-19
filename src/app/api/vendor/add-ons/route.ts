import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorIdParam = searchParams.get('vendor_id');
    const serviceIdParam = searchParams.get('service_id');
    const packageIdParam = searchParams.get('package_id');

    const user = await getSessionUser();
    const isVendor = user && user.role === 'VENDOR';
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

    let targetVendorId: string | null = null;
    let isOwner = false;

    if (isVendor) {
      const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
      if (vendors.length > 0) {
        targetVendorId = vendors[0].id;
        isOwner = true;
      }
    }

    if (vendorIdParam) {
      if (isAdmin || (isOwner && targetVendorId === vendorIdParam)) {
        targetVendorId = vendorIdParam;
      } else {
        // Public customer query: verify vendor exists and is VERIFIED
        const vendorRows = await query<any[]>(
          `SELECT id, verification_status FROM vendors WHERE id = ?`,
          [vendorIdParam]
        );
        if (!vendorRows.length || vendorRows[0].verification_status !== 'VERIFIED') {
          return NextResponse.json({ success: true, data: [] });
        }
        targetVendorId = vendorIdParam;
        isOwner = false;
      }
    }

    if (!targetVendorId && !isAdmin) {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    let sql = `
      SELECT 
        va.id,
        va.vendor_id,
        va.service_id,
        va.package_id,
        va.name,
        va.description,
        va.price,
        va.is_active,
        va.created_at,
        va.updated_at,
        vs.title AS service_title,
        vp.name AS package_name
      FROM vendor_add_ons va
      LEFT JOIN vendor_services vs ON va.service_id = vs.id
      LEFT JOIN vendor_packages vp ON va.package_id = vp.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (targetVendorId) {
      sql += ` AND va.vendor_id = ?`;
      params.push(targetVendorId);
    }

    if (serviceIdParam) {
      sql += ` AND (va.service_id = ? OR va.service_id IS NULL)`;
      params.push(serviceIdParam);
    }

    if (packageIdParam) {
      sql += ` AND (va.package_id = ? OR va.package_id IS NULL)`;
      params.push(packageIdParam);
    }

    if (!isOwner && !isAdmin) {
      sql += ` AND va.is_active = TRUE`;
    }

    sql += ` ORDER BY va.price ASC, va.created_at DESC`;

    const rows = await query<any[]>(sql, params);

    const formatted = rows.map((r) => ({
      ...r,
      price: parseFloat(r.price) || 0,
      is_active: Boolean(r.is_active),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('API /api/vendor/add-ons GET Error:', error);
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
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }
    const vendorId = vendors[0].id;

    const body = await req.json();
    const { name, description = '', price = 0, service_id = null, package_id = null, is_active = true } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ success: false, message: 'Add-on name must be at least 2 characters' }, { status: 400 });
    }

    if (price === undefined || price === null || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return NextResponse.json({ success: false, message: 'Price must be a valid non-negative number' }, { status: 400 });
    }

    // Verify service ownership if provided
    if (service_id) {
      const srvRows = await query<any[]>(
        `SELECT id FROM vendor_services WHERE id = ? AND vendor_id = ?`,
        [service_id, vendorId]
      );
      if (!srvRows.length) {
        return NextResponse.json({ success: false, message: 'Selected service not found or unauthorized' }, { status: 400 });
      }
    }

    // Verify package ownership if provided
    if (package_id) {
      const pkgRows = await query<any[]>(
        `SELECT id FROM vendor_packages WHERE id = ? AND vendor_id = ?`,
        [package_id, vendorId]
      );
      if (!pkgRows.length) {
        return NextResponse.json({ success: false, message: 'Selected package not found or unauthorized' }, { status: 400 });
      }
    }

    const addonId = `add_${Date.now()}_${randomUUID().substring(0, 8)}`;

    await query(
      `INSERT INTO vendor_add_ons (
        id, vendor_id, service_id, package_id, name, description, price, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        addonId,
        vendorId,
        service_id || null,
        package_id || null,
        name.trim(),
        description ? description.trim() : '',
        parseFloat(price),
        is_active ? 1 : 0,
      ]
    );

    await logAudit(user.id, 'CREATE_ADDON', 'vendor_add_ons', addonId, {
      name: name.trim(),
      price: parseFloat(price),
      service_id,
      package_id,
    });

    return NextResponse.json({
      success: true,
      message: 'Optional add-on created successfully',
      data: {
        id: addonId,
        name: name.trim(),
        description: description ? description.trim() : '',
        price: parseFloat(price),
        service_id: service_id || null,
        package_id: package_id || null,
        is_active: Boolean(is_active),
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('API /api/vendor/add-ons POST Error:', error);
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
    const { id, name, description, price, service_id, package_id, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Add-on ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await query<any[]>(
      `SELECT * FROM vendor_add_ons WHERE id = ? AND vendor_id = ?`,
      [id, vendorId]
    );
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Add-on not found or unauthorized' }, { status: 404 });
    }

    // Verify service ownership if changed
    if (service_id) {
      const srvRows = await query<any[]>(
        `SELECT id FROM vendor_services WHERE id = ? AND vendor_id = ?`,
        [service_id, vendorId]
      );
      if (!srvRows.length) {
        return NextResponse.json({ success: false, message: 'Selected service not found or unauthorized' }, { status: 400 });
      }
    }

    // Verify package ownership if changed
    if (package_id) {
      const pkgRows = await query<any[]>(
        `SELECT id FROM vendor_packages WHERE id = ? AND vendor_id = ?`,
        [package_id, vendorId]
      );
      if (!pkgRows.length) {
        return NextResponse.json({ success: false, message: 'Selected package not found or unauthorized' }, { status: 400 });
      }
    }

    if (price !== undefined && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      return NextResponse.json({ success: false, message: 'Price must be a valid non-negative number' }, { status: 400 });
    }

    await query(
      `UPDATE vendor_add_ons SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        service_id = COALESCE(?, service_id),
        package_id = COALESCE(?, package_id),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND vendor_id = ?`,
      [
        name ? name.trim() : null,
        description !== undefined ? description.trim() : null,
        price !== undefined ? parseFloat(price) : null,
        service_id !== undefined ? service_id : null,
        package_id !== undefined ? package_id : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
        vendorId,
      ]
    );

    await logAudit(user.id, 'UPDATE_ADDON', 'vendor_add_ons', id, {
      name,
      price,
      is_active,
    });

    const updated = await query<any[]>(
      `SELECT * FROM vendor_add_ons WHERE id = ? AND vendor_id = ?`,
      [id, vendorId]
    );

    return NextResponse.json({
      success: true,
      message: 'Add-on updated successfully',
      data: updated[0] ? {
        ...updated[0],
        price: parseFloat(updated[0].price) || 0,
        is_active: Boolean(updated[0].is_active),
      } : null,
    });
  } catch (error: any) {
    console.error('API /api/vendor/add-ons PUT Error:', error);
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
      return NextResponse.json({ success: false, message: 'Add-on ID is required' }, { status: 400 });
    }

    const existing = await query<any[]>(
      `SELECT id, name FROM vendor_add_ons WHERE id = ? AND vendor_id = ?`,
      [id, vendorId]
    );
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Add-on not found or unauthorized' }, { status: 404 });
    }

    await query(`DELETE FROM vendor_add_ons WHERE id = ? AND vendor_id = ?`, [id, vendorId]);
    await logAudit(user.id, 'DELETE_ADDON', 'vendor_add_ons', id, { name: existing[0].name });

    return NextResponse.json({ success: true, message: 'Add-on removed successfully' });
  } catch (error: any) {
    console.error('API /api/vendor/add-ons DELETE Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
