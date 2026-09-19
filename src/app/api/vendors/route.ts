import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateVendorScore } from '@/services/rankingEngine';
import { locationService } from '@/services/locationService';

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
    const radius = searchParams.get('radius') ? parseInt(searchParams.get('radius') as string, 10) : 50;
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
        v.profile_status,
        v.is_featured,
        v.is_sponsored,
        v.service_radius_km,
        v.service_area_cities,
        c.id as category_id,
        c.name as category_name,
        c.slug as category_slug,
        (SELECT COUNT(*) FROM vendor_packages vp WHERE vp.vendor_id = v.id) as package_count,
        (SELECT COUNT(*) FROM vendor_services vs WHERE vs.vendor_id = v.id) as service_count,
        (SELECT COUNT(*) FROM bookings b WHERE b.vendor_id = v.id AND b.status = 'COMPLETED') as completed_bookings,
        (SELECT COUNT(*) FROM bookings b WHERE b.vendor_id = v.id) as total_bookings
      FROM vendors v
      JOIN categories c ON v.category_id = c.id
      WHERE v.verification_status IN ('VERIFIED', 'APPROVED') 
        AND (v.profile_status IS NULL OR v.profile_status = 'APPROVED')
    `;

    const params: any[] = [];

    if (category && category !== 'ALL') {
      sql += ` AND (c.slug = ? OR c.name = ? OR c.id = ?)`;
      params.push(category, category, category);
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

    // We fetch more vendors and then filter/sort by distance and ranking in memory
    // because real distance calculations require the location service.
    // If the dataset was huge, we'd use PostGIS/MySQL Spatial, but currently we rely on a service.
    
    const rawVendors = await query<any[]>(sql, params);

    // Filter by location and calculate distances
    const processedVendors = await Promise.all(
      rawVendors.map(async (v) => {
        let distance_km: number | null = null;
        let isWithinRadius = true;

        if (city && city !== 'ALL') {
          // If vendor specifically lists the city in service areas, distance is 0
          if (v.service_area_cities && v.service_area_cities.toLowerCase().includes(city.toLowerCase())) {
            distance_km = 0;
            isWithinRadius = true;
          } else {
            // Otherwise calculate distance
            distance_km = await locationService.getDistanceBetweenCities(city, v.city);
            const vendorRadius = v.service_radius_km || 50;
            const searchRadius = Math.max(radius, vendorRadius);
            
            if (distance_km !== null) {
              isWithinRadius = distance_km <= searchRadius;
            } else {
              // Fallback to strict string matching if we can't get distance
              isWithinRadius = v.city.toLowerCase() === city.toLowerCase() || v.city.toLowerCase().includes(city.toLowerCase());
            }
          }
        }

        // Calculate completion rate (mocked response rate as 0.9 for now, could be added to DB)
        const completion_rate = v.total_bookings > 0 ? v.completed_bookings / v.total_bookings : 0.8;
        const response_rate = 0.9;

        const organicScore = calculateVendorScore({
          rating: parseFloat(v.rating) || 0,
          review_count: v.review_count || 0,
          verification_status: v.verification_status,
          has_portfolio: (v.package_count || 0) > 0 || (v.service_count || 0) > 0,
          city: v.city,
          search_city: city && city !== 'ALL' ? city : undefined,
          is_featured: Boolean(v.is_featured),
          is_sponsored: Boolean(v.is_sponsored),
          distance_km,
          completion_rate,
          response_rate,
        });

        return {
          ...v,
          is_featured: Boolean(v.is_featured),
          is_sponsored: Boolean(v.is_sponsored),
          organic_score: organicScore,
          distance_km,
          is_within_radius: isWithinRadius
        };
      })
    );

    // Filter out vendors outside the radius
    let filteredVendors = processedVendors.filter(v => v.is_within_radius);

    // Sort by: sponsored first, then featured, then organic score
    filteredVendors.sort((a, b) => {
      if (a.is_sponsored && !b.is_sponsored) return -1;
      if (!a.is_sponsored && b.is_sponsored) return 1;
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return b.organic_score - a.organic_score; // Highest score first
    });

    const total = filteredVendors.length;
    
    // Pagination
    const paginatedVendors = filteredVendors.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedVendors,
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
