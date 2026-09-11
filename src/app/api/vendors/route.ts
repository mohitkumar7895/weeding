import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateVendorScore } from '@/services/rankingEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const minRating = searchParams.get('rating');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;

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
        c.slug as category_slug,
        (SELECT COUNT(*) FROM vendor_packages vp WHERE vp.vendor_id = v.id) as package_count,
        (SELECT COUNT(*) FROM vendor_services vs WHERE vs.vendor_id = v.id) as service_count
      FROM vendors v
      JOIN categories c ON v.category_id = c.id
      WHERE v.verification_status != 'SUSPENDED'
    `;

    const params: any[] = [];

    if (category) {
      sql += ` AND (c.slug = ? OR c.name = ? OR c.id = ?)`;
      params.push(category, category, category);
    }

    if (city) {
      sql += ` AND LOWER(v.city) LIKE LOWER(?)`;
      params.push(`%${city}%`);
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
      sql += ` AND (LOWER(v.business_name) LIKE LOWER(?) OR LOWER(v.description) LIKE LOWER(?) OR LOWER(v.city) LIKE LOWER(?))`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Order by featured, sponsored, then rating
    sql += ` ORDER BY v.is_featured DESC, v.is_sponsored DESC, v.rating DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const rawVendors = await query<any[]>(sql, params);

    const vendors = rawVendors.map((v) => {
      const organicScore = calculateVendorScore({
        rating: parseFloat(v.rating) || 0,
        review_count: v.review_count || 0,
        verification_status: v.verification_status,
        has_portfolio: (v.package_count || 0) > 0 || (v.service_count || 0) > 0,
        city: v.city,
        search_city: city || undefined,
        is_featured: Boolean(v.is_featured),
        is_sponsored: Boolean(v.is_sponsored),
      });

      return {
        ...v,
        is_featured: Boolean(v.is_featured),
        is_sponsored: Boolean(v.is_sponsored),
        organic_score: organicScore,
      };
    });

    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM vendors v
      JOIN categories c ON v.category_id = c.id
      WHERE v.verification_status != 'SUSPENDED'
    `;
    const countParams: any[] = [];
    if (category) {
      countSql += ` AND (c.slug = ? OR c.name = ? OR c.id = ?)`;
      countParams.push(category, category, category);
    }
    if (city) {
      countSql += ` AND LOWER(v.city) LIKE LOWER(?)`;
      countParams.push(`%${city}%`);
    }
    if (minPrice) {
      countSql += ` AND v.starting_price >= ?`;
      countParams.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      countSql += ` AND v.starting_price <= ?`;
      countParams.push(parseFloat(maxPrice));
    }
    if (minRating) {
      countSql += ` AND v.rating >= ?`;
      countParams.push(parseFloat(minRating));
    }
    if (featured === 'true' || featured === '1') {
      countSql += ` AND v.is_featured = TRUE`;
    }
    if (search) {
      countSql += ` AND (LOWER(v.business_name) LIKE LOWER(?) OR LOWER(v.description) LIKE LOWER(?) OR LOWER(v.city) LIKE LOWER(?))`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const totalResult = await query<any[]>(countSql, countParams);
    const total = totalResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: vendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('API /api/vendors Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch vendors', error: error.message },
      { status: 500 }
    );
  }
}
