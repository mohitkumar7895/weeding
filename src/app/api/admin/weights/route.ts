import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const weights = await query<any[]>(
      `SELECT id, factor_name, weight_percent, is_active, version, updated_at
       FROM match_factor_weights
       ORDER BY weight_percent DESC`
    );

    return NextResponse.json({ success: true, data: weights });
  } catch (error: any) {
    console.error('API /api/admin/weights GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const adminUser = await getSessionUser();
    if (!adminUser || (adminUser.role !== 'SUPER_ADMIN' && adminUser.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { weights } = body; // Array of { id: string, weight_percent: number, is_active: boolean }

    if (!Array.isArray(weights) || weights.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid weights array' }, { status: 400 });
    }

    // Verify sum of active weights equals 100.00
    const totalActive = weights
      .filter(w => w.is_active)
      .reduce((sum, w) => sum + parseFloat(w.weight_percent), 0);

    if (Math.abs(totalActive - 100.0) > 0.05) {
      return NextResponse.json({
        success: false,
        message: `Sum of active weights must equal 100%. Current sum: ${totalActive.toFixed(2)}%`
      }, { status: 400 });
    }

    await transaction(async (conn) => {
      for (const item of weights) {
        await conn.execute(
          `UPDATE match_factor_weights 
           SET weight_percent = ?, is_active = ?, version = version + 1 
           WHERE id = ?`,
          [parseFloat(item.weight_percent), item.is_active ? 1 : 0, item.id]
        );
      }
    });

    await logAudit(adminUser.id, 'UPDATE_MATCH_WEIGHTS', 'match_factor_weights', 'ALL', {
      totalActive,
      weightsCount: weights.length
    });

    return NextResponse.json({
      success: true,
      message: 'Matching weights updated successfully. Algorithm now scoring with updated weights.'
    });
  } catch (error: any) {
    console.error('API /api/admin/weights PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
