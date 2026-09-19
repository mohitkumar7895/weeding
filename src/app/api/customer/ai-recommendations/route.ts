import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { enrichVendorsWithAI } from '@/services/aiRecommendationEngine';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ success: false, message: 'Only customers can request AI recommendations' }, { status: 403 });
    }

    const body = await req.json();
    const { category, city, requirements } = body;

    // Build secure backend query enforcing eligibility rules
    // Rule: Must be APPROVED vendor, publicly visible (if applicable in schema)
    let sql = `SELECT v.id, v.business_name, v.city, v.rating, u.category 
               FROM vendors v
               JOIN users u ON v.id = u.id
               WHERE v.verification_status = 'APPROVED'`;
    const params: any[] = [];

    if (category) {
      sql += ` AND u.category = ?`;
      params.push(category);
    }
    
    if (city) {
      sql += ` AND v.city = ?`;
      params.push(city);
    }

    // Rely on existing DB ranking logic for the initial candidate pool
    sql += ` ORDER BY v.rating DESC, v.review_count DESC LIMIT 10`;

    const candidateVendors = await query<any[]>(sql, params);

    // Pass candidates to AI engine for personalization and explanation
    const recommendations = await enrichVendorsWithAI(candidateVendors, { category, city, requirements });

    return NextResponse.json({ 
      success: true, 
      recommendations,
      fallback_used: recommendations.some(r => !r.ai_reasoning) 
    });

  } catch (error: any) {
    console.error('AI Recommendations API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
