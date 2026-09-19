import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: 'UNKNOWN'
    }
  };

  try {
    // Readiness Check: Actively ping the database connection pool
    await query('SELECT 1');
    health.services.database = 'OK';
    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    // Suppress the actual error details to prevent leaking internal infrastructure details
    console.error('[HealthCheck] Database readiness failed');
    health.status = 'ERROR';
    health.services.database = 'UNREACHABLE';
    
    // Return 503 Service Unavailable so load balancers can take this node out of rotation
    return NextResponse.json(health, { status: 503 });
  }
}
