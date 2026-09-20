import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (!auth.ok) return auth.response!;

    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatency = 0;

    try {
      await query('SELECT 1');
      dbLatency = Date.now() - startTime;
    } catch {
      dbStatus = 'unreachable';
      dbLatency = Date.now() - startTime;
    }

    return NextResponse.json({
      success: true,
      data: {
        database: { status: dbStatus, latency_ms: dbLatency },
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        database: { status: 'unreachable', latency_ms: 0 },
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      },
    });
  }
}
