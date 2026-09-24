import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'wedwithme_super_secret_jwt_key_2026_production';
const COOKIE_NAME = 'wwm_auth_token';

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'FINANCE' | 'VENDOR' | 'CUSTOMER';
  profile_id?: string;
  vendor_id?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  const stored = String(hash).trim();
  try {
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
      return bcrypt.compare(password, stored);
    }
    return stored === password;
  } catch {
    return stored === password;
  }
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function tokenFromRequest(req?: { cookies?: { get: (name: string) => { value: string } | undefined }; headers?: Headers }): string | null {
  if (!req) return null;
  const fromCookie = req.cookies?.get(COOKIE_NAME)?.value;
  if (fromCookie) {
    try {
      return decodeURIComponent(fromCookie);
    } catch {
      return fromCookie;
    }
  }
  const authHeader = req.headers?.get?.('authorization') || req.headers?.get?.('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  const raw = req.headers?.get?.('cookie') || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return null;
}

/**
 * Get current authenticated user from request cookies or Authorization header
 */
export async function getSessionUser(req?: NextRequest): Promise<TokenPayload | null> {
  try {
    let token = tokenFromRequest(req);
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value || null;
    }
    if (!token) {
      const headerStore = await headers();
      token = tokenFromRequest({ headers: headerStore as any });
    }
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    payload.role = String(payload.role || '').trim().toUpperCase() as TokenPayload['role'];
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify user role from database
 */
export async function requireAuth(roles?: string[]) {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  if (roles && !roles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function verifyAuth() {
  const user = await getSessionUser();
  return { user };
}

/**
 * Log action into immutable audit_logs table
 */
export async function logAudit(
  userIdOrParams: string | null | {
    userId?: string | null;
    role?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  },
  action?: string,
  entityType?: string,
  entityId?: string,
  newValues?: any
) {
  try {
    let params: any;
    if (typeof userIdOrParams === 'object' && userIdOrParams !== null) {
      params = userIdOrParams;
    } else {
      params = {
        userId: userIdOrParams,
        action: action || 'UNKNOWN',
        entityType: entityType || 'GENERAL',
        entityId: entityId || 'N/A',
        newValues
      };
    }

    const id = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await query(
      `INSERT INTO audit_logs (id, user_id, role, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.userId || null,
        params.role || null,
        params.action,
        params.entityType,
        params.entityId,
        params.oldValues ? JSON.stringify(params.oldValues) : null,
        params.newValues ? JSON.stringify(params.newValues) : null,
        params.ipAddress || null,
        params.userAgent || null,
      ]
    );
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}
