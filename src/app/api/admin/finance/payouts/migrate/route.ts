import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(req: NextRequest) {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!authResult.ok) return authResult.response;

  try {
    await query("ALTER TABLE payouts MODIFY COLUMN status ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'MANUAL_REVIEW') DEFAULT 'PENDING'");
    await query("ALTER TABLE payout_attempts MODIFY COLUMN status ENUM('PENDING', 'SUCCESS', 'FAILED', 'MANUAL_REVIEW') DEFAULT 'PENDING'");
    return NextResponse.json({ success: true, message: 'DB Altered' });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message });
  }
}
