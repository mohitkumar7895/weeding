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
  // Try getting IP from headers, fallback to a default
  return req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
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
