import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateVendorScore } from '@/services/rankingEngine';
import { locationService } from '@/services/locationService';
import { findVendorCategory } from '@/lib/vendorCategories';

async function safeQuery<T = any[]>(sql: string, params: any[] = []): Promise<T> {
  try {
    const rows = await query<T>(sql, params);
    return (Array.isArray(rows) ? rows : []) as T;
  } catch (err: any) {
    console.warn('[vendors API] query skipped:', err.code || '', err.message);
    return [] as T;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const location = searchParams.get('location');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const minRating = searchParams.get('rating');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');
    const radius = searchParams.get('radius') ? parseInt(searchParams.get('radius') as string, 10) : 50;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let sql = `
      SELECT
        v.id,
        v.business_name,
        v.city,
        v.address,
        v.description,
        v.rating,
        v.review_count,
        v.starting_price,
        v.cover_image,
        v.verification_status,
        v.is_featured,
        v.is_sponsored,
        c.id as category_id,
        c.name as category_name,
        c.slug as category_slug
      FROM vendors v
      LEFT JOIN categories c ON v.category_id = c.id
      WHERE v.verification_status IN ('VERIFIED', 'APPROVED')
    `;

    if (category && category !== 'ALL') {
      const def = findVendorCategory(category);
      const tokens = [...new Set((def ? [def.slug, def.id, def.name, ...def.aliases] : [category]).map((t) => String(t).toLowerCase()))];
      const parts: string[] = [];
      for (const token of tokens) {
        parts.push(`LOWER(IFNULL(c.slug,'')) = ?`);
        params.push(token);
        parts.push(`LOWER(IFNULL(c.id,'')) = ?`);
        params.push(token);
        parts.push(`LOWER(IFNULL(c.name,'')) LIKE ?`);
        params.push(`%${token}%`);
      }
      sql += ` AND (${parts.join(' OR ')})`;
    }

    if (minPrice) {
      sql += ` AND v.starting_price >= ?`;
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      sql += ` AND v.starting_price <= ?`;
      params.push(parseFloat(maxPrice));
    }

    if (minRating) {
      sql += ` AND v.rating >= ?`;
      params.push(parseFloat(minRating));
    }

    if (featured === 'true' || featured === '1') {
      sql += ` AND v.is_featured = TRUE`;
    }

    if (search) {
      sql += ` AND (LOWER(v.business_name) LIKE LOWER(?) OR LOWER(IFNULL(v.description,'')) LIKE LOWER(?) OR LOWER(v.city) LIKE LOWER(?) OR LOWER(IFNULL(v.address,'')) LIKE LOWER(?))`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (location) {
      sql += ` AND (LOWER(v.city) LIKE LOWER(?) OR LOWER(IFNULL(v.address,'')) LIKE LOWER(?))`;
      params.push(`%${location}%`, `%${location}%`);
    }

    let rawVendors = await safeQuery<any[]>(sql, params);
    if (!rawVendors.length && (!category || category === 'ALL')) {
      rawVendors = await safeQuery<any[]>(
        `SELECT v.id, v.business_name, v.city, v.address, v.description, v.rating, v.review_count,
                v.starting_price, v.cover_image, v.verification_status, v.is_featured, v.is_sponsored
         FROM vendors v
         WHERE v.verification_status IN ('VERIFIED', 'APPROVED', 'PENDING')
         LIMIT 100`
      );
    }

    const processedVendors = await Promise.all(
      rawVendors.map(async (v) => {
        let distance_km: number | null = null;
        let isWithinRadius = true;

        if (city && city !== 'ALL') {
          const vendorCity = String(v.city || '');
          const vendorAddress = String(v.address || '');
          try {
            distance_km = await locationService.getDistanceBetweenCities(city, vendorCity);
            const searchRadius = Number.isFinite(radius) ? radius : 50;
            if (distance_km !== null) {
              isWithinRadius = distance_km <= searchRadius;
              if (!isWithinRadius) {
                 isWithinRadius = vendorCity.toLowerCase().includes(city.toLowerCase()) || vendorAddress.toLowerCase().includes(city.toLowerCase());
              }
            } else {
              isWithinRadius =
                vendorCity.toLowerCase() === city.toLowerCase() ||
                vendorCity.toLowerCase().includes(city.toLowerCase()) ||
                vendorAddress.toLowerCase().includes(city.toLowerCase());
            }
          } catch {
            isWithinRadius =
              vendorCity.toLowerCase() === city.toLowerCase() ||
              vendorCity.toLowerCase().includes(city.toLowerCase()) ||
              vendorAddress.toLowerCase().includes(city.toLowerCase());
          }
        }

        const organicScore = calculateVendorScore({
          rating: parseFloat(v.rating) || 0,
          review_count: v.review_count || 0,
          verification_status: v.verification_status,
          has_portfolio: true,
          city: v.city,
          search_city: city && city !== 'ALL' ? city : undefined,
          is_featured: Boolean(v.is_featured),
          is_sponsored: Boolean(v.is_sponsored),
          distance_km,
          completion_rate: 0.8,
          response_rate: 0.9,
        });

        return {
          ...v,
          is_featured: Boolean(v.is_featured),
          is_sponsored: Boolean(v.is_sponsored),
          is_verified: v.verification_status === 'VERIFIED' || v.verification_status === 'APPROVED',
          organic_score: organicScore,
          distance_km,
          is_within_radius: isWithinRadius,
        };
      })
    );

    let filteredVendors = processedVendors.filter((v) => v.is_within_radius);

    filteredVendors.sort((a, b) => {
      if (a.is_sponsored && !b.is_sponsored) return -1;
      if (!a.is_sponsored && b.is_sponsored) return 1;
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return b.organic_score - a.organic_score;
    });

    const total = filteredVendors.length;
    const paginatedVendors = filteredVendors.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedVendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    });
  } catch (error: any) {
    console.error('API /api/vendors Error:', error);
    return NextResponse.json(
      { success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, message: error.message },
      { status: 200 }
    );
  }
}
