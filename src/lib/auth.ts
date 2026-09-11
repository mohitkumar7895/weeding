import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
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
  return bcrypt.compare(password, hash);
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

/**
 * Get current authenticated user from request cookies or Authorization header
 */
export async function getSessionUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
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
