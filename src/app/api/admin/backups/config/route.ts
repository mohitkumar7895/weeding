import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';
import { query } from '@/lib/db';

const DEFAULT_CONFIG = {
  id: 1,
  is_enabled: 0,
  frequency: 'DAILY',
  retention_days: 30,
  destination_reference: null,
};

export async function GET() {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;
    await ensureOpsTables();
    const rows = await safeSelect<any[]>(`SELECT * FROM backup_configuration WHERE id = 1`);
    return NextResponse.json({ success: true, data: rows[0] || DEFAULT_CONFIG });
  } catch {
    return NextResponse.json({ success: true, data: DEFAULT_CONFIG });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN']);
    if (!auth.ok) return auth.response!;

    const body = await request.json();
    const { is_enabled, frequency, retention_days, destination_reference } = body;
    await ensureOpsTables();
    await query(
      `INSERT INTO backup_configuration (id, is_enabled, frequency, retention_days, destination_reference)
       VALUES (1, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_enabled = VALUES(is_enabled),
         frequency = VALUES(frequency),
         retention_days = VALUES(retention_days),
         destination_reference = VALUES(destination_reference)`,
      [is_enabled ? 1 : 0, frequency || 'DAILY', retention_days || 30, destination_reference || null]
    );

    return NextResponse.json({ success: true, message: 'Backup configuration updated successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to update backup configuration.' }, { status: 500 });
  }
}
