import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Protected Action: Super Admin authorization required to access system audit trail logs.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (action) {
      sql += ` AND al.action = ?`;
      params.push(action);
    }
    if (entity) {
      sql += ` AND al.entity_type = ?`;
      params.push(entity);
    }

    sql += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const logs = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    console.error('API /api/admin/audit-logs GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
