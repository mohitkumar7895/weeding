import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';

export async function GET() {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;
    await ensureOpsTables();
    const logs = await safeSelect<any[]>(`SELECT * FROM api_security_logs ORDER BY created_at DESC LIMIT 100`);
    return NextResponse.json({ success: true, logs });
  } catch {
    return NextResponse.json({ success: true, logs: [] });
  }
}
