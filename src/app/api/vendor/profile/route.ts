import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

function parseCities(raw: any, defaultCity: string): string[] {
  if (!raw) return defaultCity ? [defaultCity] : [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return raw.split(',').map((c) => c.trim()).filter(Boolean);
    }
  }
  return defaultCity ? [defaultCity] : [];
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const vendors = await query<any[]>(
      `SELECT v.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
       FROM vendors v
       JOIN users u ON v.user_id = u.id
       WHERE v.user_id = ?`,
      [user.id]
    );

    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }

    const vendor = vendors[0];

    // Fetch primary category, multi-categories, and onboarding state in parallel
    const [catRows, vendorCatRows, onbRows] = await Promise.all([
      query<any[]>(`SELECT id, name, slug, description FROM categories WHERE id = ?`, [vendor.category_id]),
      query<any[]>(
        `SELECT c.id, c.name, c.slug, c.description, vc.is_primary
         FROM vendor_categories vc
         JOIN categories c ON vc.category_id = c.id
         WHERE vc.vendor_id = ?
         ORDER BY vc.is_primary DESC, c.display_order ASC, c.name ASC`,
        [vendor.id]
      ),
      query<any[]>(`SELECT * FROM vendor_onboarding WHERE vendor_id = ?`, [vendor.id]),
    ]);

    const primaryCategory = catRows[0] || null;
    const onboarding = onbRows[0] || null;

    // Build structured safe profile response
    const profileData = {
      id: vendor.id,
      business_name: vendor.business_name,
      description: vendor.description || '',
      starting_price: vendor.starting_price ? parseFloat(vendor.starting_price) : 15000,
      experience_years: vendor.experience_years || 1,
      year_established: vendor.year_established || null,
      cover_image: vendor.cover_image || null,

      // Category details
      category_id: vendor.category_id,
      category_name: primaryCategory ? primaryCategory.name : 'Unassigned',
      category_slug: primaryCategory ? primaryCategory.slug : 'unassigned',
      categories: vendorCatRows.length > 0 ? vendorCatRows : (primaryCategory ? [{ ...primaryCategory, is_primary: 1 }] : []),

      // Location & Service Area
      country: vendor.country || 'India',
      state: vendor.state || 'Delhi NCR',
      city: vendor.city || '',
      pincode: vendor.pincode || '',
      address: vendor.address || '',
      service_radius_km: vendor.service_radius_km !== null ? vendor.service_radius_km : 50,
      service_area_cities: parseCities(vendor.service_area_cities, vendor.city),
      travels_to_venue: vendor.travels_to_venue === null ? true : Boolean(vendor.travels_to_venue),

      // Permitted Public Contact Details (No sensitive KYC/Banking)
      business_phone: vendor.business_phone || vendor.owner_phone || '',
      business_email: vendor.business_email || vendor.owner_email || '',
      website_url: vendor.website_url || '',
      instagram_handle: vendor.instagram_handle || '',
      owner_name: vendor.owner_name,

      // Verification & Profile Status (Strictly from system/admin workflow)
      verification_status: vendor.verification_status,
      is_verified: vendor.verification_status === 'VERIFIED',
      profile_status: vendor.profile_status || 'APPROVED',
      onboarding_status: onboarding ? onboarding.status : 'DRAFT',
      rejection_reason: onboarding ? onboarding.rejection_reason : null,
      rating: vendor.rating ? parseFloat(vendor.rating) : 4.8,
      review_count: vendor.review_count || 0,
      is_featured: Boolean(vendor.is_featured),
      is_sponsored: Boolean(vendor.is_sponsored),
      created_at: vendor.created_at,
      updated_at: vendor.updated_at,
    };

    return NextResponse.json({ success: true, data: profileData });
  } catch (error: any) {
    console.error('API /api/vendor/profile GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id, user_id, verification_status FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }

    const vendor = vendors[0];
    const vendorId = vendor.id;
    const body = await req.json();

    const {
      business_name,
      description,
      category_id,
      additional_category_ids,
      city,
      state,
      country,
      pincode,
      address,
      service_radius_km,
      service_area_cities,
      travels_to_venue,
      starting_price,
      experience_years,
      year_established,
      business_phone,
      business_email,
      website_url,
      instagram_handle,
    } = body;

    // Basic Validation
    if (business_name !== undefined && (!business_name || business_name.trim().length < 2)) {
      return NextResponse.json({ success: false, message: 'Business name must be at least 2 characters' }, { status: 400 });
    }

    if (city !== undefined && (!city || city.trim().length === 0)) {
      return NextResponse.json({ success: false, message: 'City is required' }, { status: 400 });
    }

    // Validate category exists if provided
    if (category_id) {
      const catCheck = await query<any[]>(`SELECT id FROM categories WHERE id = ?`, [category_id]);
      if (!catCheck.length) {
        return NextResponse.json({ success: false, message: 'Selected primary category does not exist' }, { status: 400 });
      }
    }

    // Format service area cities as JSON string
    let formattedCitiesJson: string | null = null;
    if (service_area_cities !== undefined) {
      const cityList = Array.isArray(service_area_cities)
        ? service_area_cities
        : typeof service_area_cities === 'string'
        ? service_area_cities.split(',').map((c: string) => c.trim()).filter(Boolean)
        : [];
      formattedCitiesJson = JSON.stringify(cityList);
    }

    await transaction(async (conn) => {
      // 1. Update vendors table (strictly ignoring any attempted verification_status or financial updates)
      await conn.execute(
        `UPDATE vendors SET 
          business_name = COALESCE(?, business_name),
          description = COALESCE(?, description),
          category_id = COALESCE(?, category_id),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          country = COALESCE(?, country),
          pincode = COALESCE(?, pincode),
          address = COALESCE(?, address),
          service_radius_km = COALESCE(?, service_radius_km),
          service_area_cities = COALESCE(?, service_area_cities),
          travels_to_venue = COALESCE(?, travels_to_venue),
          starting_price = COALESCE(?, starting_price),
          experience_years = COALESCE(?, experience_years),
          year_established = COALESCE(?, year_established),
          business_phone = COALESCE(?, business_phone),
          business_email = COALESCE(?, business_email),
          website_url = COALESCE(?, website_url),
          instagram_handle = COALESCE(?, instagram_handle),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          business_name ? business_name.trim() : null,
          description !== undefined ? description : null,
          category_id || null,
          city ? city.trim() : null,
          state ? state.trim() : null,
          country ? country.trim() : null,
          pincode !== undefined ? pincode : null,
          address !== undefined ? address : null,
          service_radius_km !== undefined && service_radius_km !== null ? parseInt(service_radius_km, 10) : null,
          formattedCitiesJson,
          travels_to_venue !== undefined && travels_to_venue !== null ? (travels_to_venue ? 1 : 0) : null,
          starting_price !== undefined && starting_price !== null ? parseFloat(starting_price) : null,
          experience_years !== undefined && experience_years !== null ? parseInt(experience_years, 10) : null,
          year_established !== undefined && year_established !== null ? parseInt(year_established, 10) : null,
          business_phone !== undefined ? business_phone : null,
          business_email !== undefined ? business_email : null,
          website_url !== undefined ? website_url : null,
          instagram_handle !== undefined ? instagram_handle : null,
          vendorId,
        ]
      );

      // 2. Synchronize primary and additional categories in vendor_categories only if category payload provided
      if (category_id !== undefined || additional_category_ids !== undefined) {
        const activePrimaryCategory = category_id || (await conn.query<any[]>('SELECT category_id FROM vendors WHERE id = ?', [vendorId]))[0]?.[0]?.category_id;
        
        let allCategoryIds: string[] = [];
        if (activePrimaryCategory) {
          allCategoryIds.push(activePrimaryCategory);
        }

        if (Array.isArray(additional_category_ids)) {
          for (const catId of additional_category_ids) {
            if (catId && !allCategoryIds.includes(catId)) {
              allCategoryIds.push(catId);
            }
          }
        }

        if (allCategoryIds.length > 0) {
          // Delete categories that are no longer selected
          const placeholders = allCategoryIds.map(() => '?').join(',');
          await conn.execute(
            `DELETE FROM vendor_categories WHERE vendor_id = ? AND category_id NOT IN (${placeholders})`,
            [vendorId, ...allCategoryIds]
          );

          // Insert or update categories
          for (const cId of allCategoryIds) {
            const isPrimary = cId === activePrimaryCategory;
            const mapId = `vc_${vendorId.substring(0, 16)}_${cId.substring(0, 16)}`;
            await conn.execute(
              `INSERT INTO vendor_categories (id, vendor_id, category_id, is_primary)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)`,
              [mapId, vendorId, cId, isPrimary ? 1 : 0]
            );
          }
        }
      }

      // 3. Keep onboarding checklist updated
      await conn.execute(
        `UPDATE vendor_onboarding SET checklist_json = JSON_SET(
          COALESCE(checklist_json, '{}'),
          '$.business_profile', true
        ) WHERE vendor_id = ?`,
        [vendorId]
      );
    });

    await logAudit(user.id, 'UPDATE_VENDOR_BUSINESS_PROFILE', 'vendors', vendorId, {
      business_name,
      category_id,
      city,
      state,
    });

    return NextResponse.json({
      success: true,
      message: 'Business profile updated successfully',
    });
  } catch (error: any) {
    console.error('API /api/vendor/profile PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
