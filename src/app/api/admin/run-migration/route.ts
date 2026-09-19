import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET() {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!authResult.ok) return authResult.response;

  try {
    // 1. Update commission_rules
    await query(`ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS tiers_json JSON NULL`);

    // 2. Update commission_records
    await query(`ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(12, 2) DEFAULT 0.00`);
    await query(`ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS vendor_net_amount DECIMAL(12, 2) DEFAULT 0.00`);
    await query(`ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS rule_id VARCHAR(36) NULL`);
    await query(`ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS rule_version INT DEFAULT 1`);

    // 3. Update payouts enum
    await query(`ALTER TABLE payouts MODIFY COLUMN status ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'MANUAL_REVIEW') DEFAULT 'PENDING'`);

    // 4. Update payout_attempts enum
    await query(`ALTER TABLE payout_attempts MODIFY COLUMN status ENUM('PENDING', 'SUCCESS', 'FAILED', 'MANUAL_REVIEW') DEFAULT 'PENDING'`);

    return NextResponse.json({ success: true, message: 'Migration applied.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message });
  }
}
