import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';

export async function GET() {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;
    await ensureOpsTables();
    const rows = await safeSelect<any[]>(`SELECT * FROM backup_records ORDER BY start_time DESC LIMIT 50`);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: [] });
  }
}
