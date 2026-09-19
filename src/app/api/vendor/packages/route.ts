import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

const VALID_TIERS = ['BASIC', 'STANDARD', 'PREMIUM', 'CUSTOM'] as const;
type PackageTier = typeof VALID_TIERS[number];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorIdParam = searchParams.get('vendor_id');
    const serviceIdParam = searchParams.get('service_id');

    const user = await getSessionUser();
    const isVendor = user && user.role === 'VENDOR';
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

    let targetVendorId: string | null = null;
    let isOwner = false;

    if (isVendor) {
      const vendors = await query<any[]>(`SELECT id, verification_status FROM vendors WHERE user_id = ?`, [user.id]);
      if (vendors.length > 0) {
        targetVendorId = vendors[0].id;
        isOwner = true;
      }
    }

    // If caller is querying a specific vendor_id (public or admin mode)
    if (vendorIdParam) {
      if (isAdmin || (isOwner && targetVendorId === vendorIdParam)) {
        targetVendorId = vendorIdParam;
      } else {
        // Public customer query: verify vendor exists and is not suspended
        const vendorRows = await query<any[]>(
          `SELECT id, verification_status FROM vendors WHERE id = ?`,
          [vendorIdParam]
        );
        if (!vendorRows.length || vendorRows[0].verification_status === 'SUSPENDED') {
          return NextResponse.json({ success: true, data: [] });
        }
        targetVendorId = vendorIdParam;
        isOwner = false;
      }
    }

    if (!targetVendorId && !isAdmin) {
      return NextResponse.json({ success: false, message: 'Vendor authentication or vendor_id required' }, { status: 403 });
    }

    // Build query
    let sql = `
      SELECT 
        vp.id,
        vp.vendor_id,
        vp.service_id,
        vp.name,
        vp.package_tier,
        vp.description,
        vp.guest_capacity,
        vp.price,
        vp.included_items_json,
        vp.moderation_status,
        vp.rejection_reason,
        vp.is_published,
        vp.is_active,
        vp.created_at,
        vp.updated_at,
        vs.title AS service_title,
        vs.category_id,
        c.name AS category_name
      FROM vendor_packages vp
      LEFT JOIN vendor_services vs ON vp.service_id = vs.id
      LEFT JOIN categories c ON vs.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (targetVendorId) {
      sql += ` AND vp.vendor_id = ?`;
      params.push(targetVendorId);
    }

    if (serviceIdParam) {
      sql += ` AND vp.service_id = ?`;
      params.push(serviceIdParam);
    }

    // If not vendor owner or admin, enforce strict public discovery filters:
    // Only published, active, and approved packages
    if (!isOwner && !isAdmin) {
      sql += ` AND vp.is_published = TRUE AND vp.is_active = TRUE AND vp.moderation_status = 'APPROVED'`;
      // Also ensure service itself is active and not rejected if attached
      sql += ` AND (vp.service_id IS NULL OR (vs.is_active = TRUE AND (vs.moderation_status IS NULL OR vs.moderation_status != 'REJECTED')))`;
    }

    sql += ` ORDER BY 
      CASE vp.package_tier 
        WHEN 'BASIC' THEN 1 
        WHEN 'STANDARD' THEN 2 
        WHEN 'PREMIUM' THEN 3 
        ELSE 4 
      END ASC, vp.price ASC`;

    const packages = await query<any[]>(sql, params);

    // Fetch add-ons and items for each package
    for (const pkg of packages) {
      // Safe parse included items
      try {
        pkg.included_items = pkg.included_items_json
          ? (typeof pkg.included_items_json === 'string'
              ? JSON.parse(pkg.included_items_json)
              : pkg.included_items_json)
          : [];
      } catch {
        pkg.included_items = [];
      }

      // Convert price to number
      pkg.price = parseFloat(pkg.price) || 0;
      pkg.is_active = Boolean(pkg.is_active);
      pkg.is_published = Boolean(pkg.is_published);
      pkg.package_tier = pkg.package_tier || 'STANDARD';
      pkg.moderation_status = pkg.moderation_status || 'PENDING_REVIEW';

      // Fetch package items (legacy table)
      pkg.items = await query<any[]>(
        `SELECT * FROM vendor_package_items WHERE package_id = ? ORDER BY created_at ASC`,
        [pkg.id]
      );

      // Fetch add-ons associated with this package or its service
      let addOnSql = `
        SELECT id, vendor_id, service_id, package_id, name, description, price, is_active, created_at
        FROM vendor_add_ons 
        WHERE (package_id = ? OR (service_id = ? AND package_id IS NULL))
      `;
      const addOnParams: any[] = [pkg.id, pkg.service_id || ''];

      if (!isOwner && !isAdmin) {
        addOnSql += ` AND is_active = TRUE`;
      }
      addOnSql += ` ORDER BY price ASC`;

      const addOns = await query<any[]>(addOnSql, addOnParams);
      pkg.add_ons = addOns.map(a => ({
        ...a,
        price: parseFloat(a.price) || 0,
        is_active: Boolean(a.is_active),
      }));
    }

    return NextResponse.json({ success: true, data: packages });
  } catch (error: any) {
    console.error('API /api/vendor/packages GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized vendor access' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    const vendorId = vendors[0].id;

    const body = await req.json();
    const {
      name,
      package_tier = 'STANDARD',
      service_id,
      description = '',
      guest_capacity = 200,
      price,
      included_items = [],
      is_active = true,
      is_published = true,
      status = 'PENDING_REVIEW',
      add_ons = []
    } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ success: false, message: 'Package name must be at least 2 characters' }, { status: 400 });
    }

    if (price === undefined || price === null || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return NextResponse.json({ success: false, message: 'Price must be a valid non-negative number' }, { status: 400 });
    }

    const tierUpper = (package_tier || 'STANDARD').toUpperCase();
    if (!VALID_TIERS.includes(tierUpper as PackageTier)) {
      return NextResponse.json({
        success: false,
        message: `Invalid package tier. Allowed tiers: ${VALID_TIERS.join(', ')}`
      }, { status: 400 });
    }

    // Verify service ownership if service_id is provided
    let verifiedServiceId = service_id || null;
    if (verifiedServiceId) {
      const srvCheck = await query<any[]>(
        `SELECT id FROM vendor_services WHERE id = ? AND vendor_id = ?`,
        [verifiedServiceId, vendorId]
      );
      if (!srvCheck.length) {
        return NextResponse.json({ success: false, message: 'Specified service not found or does not belong to your vendor profile' }, { status: 400 });
      }
    } else {
      // Auto-assign to vendor's first service if available
      const fallbackSrv = await query<any[]>(
        `SELECT id FROM vendor_services WHERE vendor_id = ? ORDER BY created_at ASC LIMIT 1`,
        [vendorId]
      );
      if (fallbackSrv.length > 0) {
        verifiedServiceId = fallbackSrv[0].id;
      }
    }

    // Normalize inclusions (support both inclusions and included_items)
    const rawInclusions = body.inclusions !== undefined ? body.inclusions : included_items;
    let inclusionsArray: string[] = [];
    if (Array.isArray(rawInclusions)) {
      inclusionsArray = rawInclusions.map(item => String(item).trim()).filter(Boolean);
    } else if (typeof rawInclusions === 'string') {
      inclusionsArray = rawInclusions.split(',').map(s => s.trim()).filter(Boolean);
    }

    const pkgId = `pkg_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const initialModerationStatus = status === 'DRAFT' ? 'DRAFT' : 'PENDING_REVIEW';

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO vendor_packages (
          id, vendor_id, service_id, name, package_tier, description, guest_capacity, 
          price, included_items_json, moderation_status, is_published, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pkgId,
          vendorId,
          verifiedServiceId,
          name.trim(),
          tierUpper,
          description ? description.trim() : '',
          parseInt(guest_capacity, 10) || 200,
          parseFloat(price),
          JSON.stringify(inclusionsArray),
          initialModerationStatus,
          is_published ? 1 : 0,
          is_active ? 1 : 0,
        ]
      );

      // Insert initial add-ons if provided
      if (Array.isArray(add_ons) && add_ons.length > 0) {
        for (const item of add_ons) {
          const addonTitle = item.name || item.title;
          const addonPrice = parseFloat(item.price || item.add_on_price || 0);
          if (addonTitle) {
            const addonId = `add_${Date.now()}_${randomUUID().substring(0, 8)}`;
            await conn.execute(
              `INSERT INTO vendor_add_ons (
                id, vendor_id, service_id, package_id, name, description, price, is_active
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                addonId,
                vendorId,
                verifiedServiceId,
                pkgId,
                addonTitle.trim(),
                item.description ? item.description.trim() : '',
                isNaN(addonPrice) ? 0 : addonPrice,
                item.is_active !== undefined ? (item.is_active ? 1 : 0) : 1,
              ]
            );

            // Also keep legacy vendor_package_items in sync
            await conn.execute(
              `INSERT INTO vendor_package_items (id, package_id, title, description, is_optional, add_on_price)
               VALUES (?, ?, ?, ?, TRUE, ?)`,
              [randomUUID(), pkgId, addonTitle.trim(), item.description ? item.description.trim() : '', isNaN(addonPrice) ? 0 : addonPrice]
            );
          }
        }
      }
    });

    await logAudit(user.id, 'CREATE_PACKAGE', 'vendor_packages', pkgId, {
      name: name.trim(),
      tier: tierUpper,
      price: parseFloat(price),
      service_id: verifiedServiceId,
      moderation_status: initialModerationStatus
    });

    return NextResponse.json({
      success: true,
      message: initialModerationStatus === 'DRAFT'
        ? 'Package saved as draft.'
        : 'Wedding package created and submitted for admin review.',
      data: {
        id: pkgId,
        name: name.trim(),
        package_tier: tierUpper,
        price: parseFloat(price),
        service_id: verifiedServiceId,
        moderation_status: initialModerationStatus,
        is_active: Boolean(is_active),
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('API /api/vendor/packages POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized vendor access' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    const vendorId = vendors[0].id;

    const body = await req.json();
    const {
      id,
      name,
      package_tier,
      service_id,
      description,
      guest_capacity,
      price,
      included_items,
      is_published,
      is_active,
      status
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Package ID is required' }, { status: 400 });
    }

    // Verify package exists and belongs to this vendor
    const existing = await query<any[]>(
      `SELECT * FROM vendor_packages WHERE id = ? AND vendor_id = ?`,
      [id, vendorId]
    );
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Package not found or unauthorized' }, { status: 404 });
    }
    const current = existing[0];

    // Validate tier if provided
    let tierUpper: string | null = null;
    if (package_tier) {
      tierUpper = package_tier.toUpperCase();
      if (!VALID_TIERS.includes(tierUpper as PackageTier)) {
        return NextResponse.json({
          success: false,
          message: `Invalid package tier. Allowed tiers: ${VALID_TIERS.join(', ')}`
        }, { status: 400 });
      }
    }

    // Validate service ownership if service_id changed
    if (service_id && service_id !== current.service_id) {
      const srvRows = await query<any[]>(
        `SELECT id FROM vendor_services WHERE id = ? AND vendor_id = ?`,
        [service_id, vendorId]
      );
      if (!srvRows.length) {
        return NextResponse.json({ success: false, message: 'Selected service not found or unauthorized' }, { status: 400 });
      }
    }

    if (price !== undefined && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      return NextResponse.json({ success: false, message: 'Price must be a valid non-negative number' }, { status: 400 });
    }

    // Parse inclusions if provided (support both inclusions and included_items)
    const rawInclusions = body.inclusions !== undefined ? body.inclusions : included_items;
    let inclusionsJson: string | null = null;
    if (rawInclusions !== undefined) {
      let arr: string[] = [];
      if (Array.isArray(rawInclusions)) {
        arr = rawInclusions.map(s => String(s).trim()).filter(Boolean);
      } else if (typeof rawInclusions === 'string') {
        arr = rawInclusions.split(',').map(s => s.trim()).filter(Boolean);
      }
      inclusionsJson = JSON.stringify(arr);
    }

    // Determine if core content changed
    const contentChanged =
      (name && name.trim() !== current.name) ||
      (description !== undefined && description.trim() !== (current.description || '')) ||
      (price !== undefined && parseFloat(price) !== parseFloat(current.price)) ||
      (tierUpper && tierUpper !== current.package_tier) ||
      (service_id !== undefined && service_id !== current.service_id) ||
      (guest_capacity !== undefined && parseInt(guest_capacity, 10) !== current.guest_capacity) ||
      (inclusionsJson !== null && inclusionsJson !== current.included_items_json);

    let newModerationStatus = current.moderation_status;
    let newRejectionReason = current.rejection_reason;

    if (status === 'DRAFT') {
      newModerationStatus = 'DRAFT';
      newRejectionReason = null;
    } else if (contentChanged) {
      newModerationStatus = 'PENDING_REVIEW';
      newRejectionReason = null;
    }

    await query(
      `UPDATE vendor_packages SET
        name = COALESCE(?, name),
        package_tier = COALESCE(?, package_tier),
        service_id = COALESCE(?, service_id),
        description = COALESCE(?, description),
        guest_capacity = COALESCE(?, guest_capacity),
        price = COALESCE(?, price),
        included_items_json = COALESCE(?, included_items_json),
        is_published = COALESCE(?, is_published),
        is_active = COALESCE(?, is_active),
        moderation_status = ?,
        rejection_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND vendor_id = ?`,
      [
        name ? name.trim() : null,
        tierUpper || null,
        service_id !== undefined ? service_id : null,
        description !== undefined ? description.trim() : null,
        guest_capacity !== undefined ? parseInt(guest_capacity, 10) : null,
        price !== undefined ? parseFloat(price) : null,
        inclusionsJson,
        is_published !== undefined ? (is_published ? 1 : 0) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        newModerationStatus,
        newRejectionReason,
        id,
        vendorId,
      ]
    );

    await logAudit(user.id, 'UPDATE_PACKAGE', 'vendor_packages', id, {
      name,
      tier: tierUpper,
      price,
      moderation_status: newModerationStatus,
      is_active
    });

    const updated = await query<any[]>(
      `SELECT vp.*, vs.title AS service_title 
       FROM vendor_packages vp 
       LEFT JOIN vendor_services vs ON vp.service_id = vs.id 
       WHERE vp.id = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: contentChanged
        ? 'Package updated and submitted for admin review.'
        : 'Package updated successfully.',
      data: updated[0] || null,
    });
  } catch (error: any) {
    console.error('API /api/vendor/packages PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized vendor access' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    const vendorId = vendors[0].id;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Package ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await query<any[]>(
      `SELECT id, name FROM vendor_packages WHERE id = ? AND vendor_id = ?`,
      [id, vendorId]
    );
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Package not found or unauthorized' }, { status: 404 });
    }

    await query(`DELETE FROM vendor_packages WHERE id = ? AND vendor_id = ?`, [id, vendorId]);
    await logAudit(user.id, 'DELETE_PACKAGE', 'vendor_packages', id, { name: existing[0].name });

    return NextResponse.json({ success: true, message: 'Package removed successfully' });
  } catch (error: any) {
    console.error('API /api/vendor/packages DELETE Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
