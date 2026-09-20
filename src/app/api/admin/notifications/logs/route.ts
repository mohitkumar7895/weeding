import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, firstCount, safeSelect } from '@/lib/ensureOpsTables';

export async function GET(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']);
    if (!authResult.ok) return authResult.response!;

    await ensureOpsTables();

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (eventType) {
      where += ' AND l.event_type = ?';
      params.push(eventType);
    }
    if (channel) {
      where += ' AND l.channel = ?';
      params.push(channel);
    }
    if (status) {
      where += ' AND l.status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND (l.entity_id LIKE ? OR l.recipient_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countRows = await safeSelect<any[]>(
      `SELECT COUNT(*) as count FROM notification_delivery_logs l ${where}`,
      params
    );
    const total = firstCount(countRows);

    const rows = await safeSelect<any[]>(
      `SELECT l.*, t.version as template_version
       FROM notification_delivery_logs l
       LEFT JOIN notification_templates t ON l.template_id = t.id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return NextResponse.json({
      success: true,
      logs: rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({
      success: true,
      logs: [],
      pagination: { total: 0, page: 1, limit: 20, pages: 1 },
    });
  }
}
