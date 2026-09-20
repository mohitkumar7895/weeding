import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';
import { query } from '@/lib/db';
import { uuidv4 } from '@/lib/uuid';

export async function GET() {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (!auth.ok) return auth.response!;
    await ensureOpsTables();
    const rows = await safeSelect<any[]>(`
      SELECT r.*, u.name as tester_name
      FROM restore_tests r
      LEFT JOIN users u ON r.tested_by = u.id
      ORDER BY r.test_date DESC
      LIMIT 50
    `);
    return NextResponse.json({ success: true, data: rows });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const body = await request.json();
    const { backup_reference, status, environment_reference, notes } = body;
    if (!backup_reference || !environment_reference || !status) {
      return NextResponse.json({ success: false, error: 'Missing required restore test fields.' }, { status: 400 });
    }

    await ensureOpsTables();
    const testId = uuidv4();
    await query(
      `INSERT INTO restore_tests (id, backup_reference, test_date, status, environment_reference, notes, tested_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [testId, backup_reference, new Date(), status, environment_reference, notes || null, auth.user?.id || null]
    );

    return NextResponse.json({ success: true, message: 'Restore test recorded.', data: { id: testId } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to log restore test.' }, { status: 500 });
  }
}
