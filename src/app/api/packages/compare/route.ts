import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendor_id');
    const serviceId = searchParams.get('service_id');
    const previewMode = searchParams.get('preview') === 'true';

    if (!vendorId) {
      return NextResponse.json({ success: false, message: 'vendor_id parameter is required' }, { status: 400 });
    }

    // Check user role for authorization
    const user = await getSessionUser();
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

    let isOwner = false;
    if (user && user.role === 'VENDOR') {
      const vendorRows = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
      if (vendorRows.length > 0 && vendorRows[0].id === vendorId) {
        isOwner = true;
      }
    }

    // Fetch vendor details
    const vendorRows = await query<any[]>(
      `SELECT v.id, v.business_name, v.city, v.rating, v.review_count, v.starting_price, v.verification_status,
              c.name as category_name
       FROM vendors v
       LEFT JOIN categories c ON v.category_id = c.id
       WHERE v.id = ?`,
      [vendorId]
    );

    if (!vendorRows.length) {
      return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    }

    const vendor = vendorRows[0];

    // For public visitors, ensure vendor is not suspended
    if (!isOwner && !isAdmin && vendor.verification_status === 'SUSPENDED') {
      return NextResponse.json({
        success: false,
        message: 'Vendor profile is suspended',
      }, { status: 403 });
    }

    // Fetch service info if specified
    let targetService: any = null;
    if (serviceId) {
      const srvRows = await query<any[]>(
        `SELECT vs.*, c.name AS category_name
         FROM vendor_services vs
         LEFT JOIN categories c ON vs.category_id = c.id
         WHERE vs.id = ? AND vs.vendor_id = ?`,
        [serviceId, vendorId]
      );
      if (srvRows.length) {
        targetService = srvRows[0];
      }
    }

    // Build package query
    let pkgSql = `
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
        vp.is_published,
        vp.is_active,
        vs.title AS service_title,
        c.name AS category_name
      FROM vendor_packages vp
      LEFT JOIN vendor_services vs ON vp.service_id = vs.id
      LEFT JOIN categories c ON vs.category_id = c.id
      WHERE vp.vendor_id = ?
    `;
    const pkgParams: any[] = [vendorId];

    if (serviceId) {
      pkgSql += ` AND (vp.service_id = ? OR vp.service_id IS NULL)`;
      pkgParams.push(serviceId);
    }

    // Filter by public visibility unless owner/admin in preview mode
    if (!(previewMode && (isOwner || isAdmin))) {
      pkgSql += ` AND vp.is_published = TRUE AND vp.is_active = TRUE AND vp.moderation_status = 'APPROVED'`;
      pkgSql += ` AND (vp.service_id IS NULL OR (vs.is_active = TRUE AND (vs.moderation_status IS NULL OR vs.moderation_status != 'REJECTED')))`;
    }

    pkgSql += ` ORDER BY 
      CASE vp.package_tier 
        WHEN 'BASIC' THEN 1 
        WHEN 'STANDARD' THEN 2 
        WHEN 'PREMIUM' THEN 3 
        ELSE 4 
      END ASC, vp.price ASC`;

    const rawPackages = await query<any[]>(pkgSql, pkgParams);

    // Fetch add-ons associated with this vendor / service
    let addOnSql = `
      SELECT id, vendor_id, service_id, package_id, name, description, price, is_active
      FROM vendor_add_ons
      WHERE vendor_id = ?
    `;
    const addOnParams: any[] = [vendorId];

    if (serviceId) {
      addOnSql += ` AND (service_id = ? OR service_id IS NULL)`;
      addOnParams.push(serviceId);
    }

    if (!(previewMode && (isOwner || isAdmin))) {
      addOnSql += ` AND is_active = TRUE`;
    }

    addOnSql += ` ORDER BY price ASC`;
    const rawAddOns = await query<any[]>(addOnSql, addOnParams);

    const availableAddOns = rawAddOns.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description || '',
      price: parseFloat(a.price) || 0,
      service_id: a.service_id,
      package_id: a.package_id,
      is_active: Boolean(a.is_active),
    }));

    // Collect all features across all packages to build comparison matrix
    const featureSet = new Set<string>();
    const parsedPackages = rawPackages.map((pkg) => {
      let inclusions: string[] = [];
      try {
        inclusions = pkg.included_items_json
          ? (typeof pkg.included_items_json === 'string'
              ? JSON.parse(pkg.included_items_json)
              : pkg.included_items_json)
          : [];
      } catch {
        inclusions = [];
      }

      inclusions.forEach((f) => {
        if (f && typeof f === 'string' && f.trim()) {
          featureSet.add(f.trim());
        }
      });

      return {
        id: pkg.id,
        name: pkg.name,
        package_tier: pkg.package_tier || 'STANDARD',
        service_id: pkg.service_id,
        service_title: pkg.service_title,
        category_name: pkg.category_name,
        price: parseFloat(pkg.price) || 0,
        guest_capacity: pkg.guest_capacity || 200,
        description: pkg.description || '',
        included_items: inclusions,
        moderation_status: pkg.moderation_status,
        is_published: Boolean(pkg.is_published),
        is_active: Boolean(pkg.is_active),
      };
    });

    const allFeatures = Array.from(featureSet);

    // Annotate packages with feature existence map
    const packagesWithMatrix = parsedPackages.map((pkg) => {
      const featureMap: Record<string, boolean> = {};
      const lowerInclusions = pkg.included_items.map((i) => i.toLowerCase().trim());
      allFeatures.forEach((feat) => {
        featureMap[feat] = lowerInclusions.includes(feat.toLowerCase().trim());
      });

      // Also filter add-ons specifically relevant to this package or vendor-wide
      const pkgAddOns = availableAddOns.filter(
        (a) => !a.package_id || a.package_id === pkg.id
      );

      return {
        ...pkg,
        features: featureMap,
        add_ons: pkgAddOns,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          business_name: vendor.business_name,
          city: vendor.city,
          rating: parseFloat(vendor.rating) || 5.0,
          review_count: vendor.review_count || 0,
          category_name: vendor.category_name,
          starting_price: parseFloat(vendor.starting_price) || 0,
        },
        service: targetService ? {
          id: targetService.id,
          title: targetService.title,
          category_name: targetService.category_name,
          starting_price: parseFloat(targetService.starting_price) || 0,
        } : null,
        packages: packagesWithMatrix,
        all_features: allFeatures,
        available_add_ons: availableAddOns,
      }
    });
  } catch (error: any) {
    console.error('API /api/packages/compare GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
