import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Basic in-memory rate limiter
 * Useful for auth endpoints and avoiding basic brute force.
 * Note: In a real multi-instance production environment, use Redis.
 */
const rateLimits = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimits.get(ip);

  if (!record) {
    rateLimits.set(ip, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (now > record.expiresAt) {
    rateLimits.set(ip, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
  const first = forwarded.split(',')[0]?.trim();
  return first || '127.0.0.1';
}

/**
 * Persist an admin action using an existing mysql2 connection.
 */
export async function auditLog(
  db: any,
  params: {
    actorId?: string;
    actorRole?: string;
    action: string;
    entityId?: string;
    entityType?: string;
    details?: any;
    ipAddress?: string;
  }
) {
  try {
    const id = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await db.execute(
      `INSERT INTO audit_logs (id, user_id, role, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.actorId || null,
        params.actorRole || null,
        params.action,
        params.entityType || 'GENERAL',
        params.entityId || 'N/A',
        null,
        params.details ? JSON.stringify(params.details) : null,
        params.ipAddress || null,
        null,
      ]
    );
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}

/**
 * Generic safe error wrapper to prevent stack traces or SQL details from leaking
 */
export function safeErrorResponse(error: any, defaultMessage = 'Internal Server Error', status = 500) {
  console.error('API Error:', error); // Log full error internally
  
  // Return a clean error to the client
  return NextResponse.json(
    { 
      success: false, 
      message: error?.name === 'ZodError' ? 'Invalid input format' : defaultMessage,
      ...(error?.name === 'ZodError' ? { issues: error.issues } : {})
    }, 
    { status: error?.name === 'ZodError' ? 400 : status }
  );
}
