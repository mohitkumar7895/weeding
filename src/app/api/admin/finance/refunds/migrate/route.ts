import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN']);
    if (!auth.ok) return auth.response!;

    // Add cancellation_id and rule_applied_id to refunds table
    await query(`ALTER TABLE refunds ADD COLUMN IF NOT EXISTS cancellation_id VARCHAR(36) NULL`);
    await query(`ALTER TABLE refunds ADD COLUMN IF NOT EXISTS rule_applied_id VARCHAR(36) NULL`);

    await logAudit(auth.user!.id, 'MIGRATE_REFUNDS_SCHEMA', 'system', 'schema', { added: ['cancellation_id', 'rule_applied_id'] });

    return NextResponse.json({ success: true, message: 'Refunds schema successfully migrated.' });
  } catch (error: any) {
    console.error('API /api/admin/finance/refunds/migrate Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
