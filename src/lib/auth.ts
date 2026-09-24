import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { query } from './db';

function jwtSecret(): string {
  return (process.env.JWT_SECRET || 'wedwithme_super_secret_jwt_key_2026_production')
    .trim()
    .replace(/^["']+|["']+$/g, '');
}

const COOKIE_NAME = 'wwm_auth_token';

function normalizeToken(raw?: string | null): string | null {
  if (!raw) return null;
  let token = String(raw).trim().replace(/^["']+|["']+$/g, '');
  try {
    token = decodeURIComponent(token);
  } catch {
    /* already decoded */
  }
  token = token.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

function parseCookieHeader(header: string, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    return normalizeToken(part.slice(eq + 1));
  }
  return null;
}

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
  return jwt.sign(payload, jwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  if (!token) return null;
  const secret = jwtSecret();
  const variants = [...new Set([token, normalizeToken(token) || ''].filter(Boolean))];
  for (const candidate of variants) {
    try {
      return jwt.verify(candidate, secret) as TokenPayload;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function tokenFromRequest(req?: {
  cookies?: { get: (name: string) => { value: string } | undefined };
  headers?: Headers;
}): string | null {
  if (!req) return null;
  try {
    const header = req.headers?.get?.('cookie') || req.headers?.get?.('Cookie') || '';
    const fromHeader = parseCookieHeader(header, COOKIE_NAME);
    if (fromHeader) return fromHeader;
  } catch {
    /* ignore */
  }
  try {
    const fromCookie = normalizeToken(req.cookies?.get(COOKIE_NAME)?.value);
    if (fromCookie) return fromCookie;
  } catch {
    /* multipart POST on some hosts throws here */
  }
  const authHeader = req.headers?.get?.('authorization') || req.headers?.get?.('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return normalizeToken(authHeader.slice(7));
  }
  return null;
}

function withRole(payload: TokenPayload): TokenPayload {
  payload.role = String(payload.role || '').trim().toUpperCase() as TokenPayload['role'];
  return payload;
}

/**
 * Get current authenticated user from request cookies or Authorization header
 */
export async function getSessionUser(req?: NextRequest): Promise<TokenPayload | null> {
  const fromReq = verifyToken(tokenFromRequest(req) || '');
  if (fromReq) return withRole(fromReq);

  try {
    const cookieStore = await cookies();
    const fromStore = verifyToken(normalizeToken(cookieStore.get(COOKIE_NAME)?.value) || '');
    if (fromStore) return withRole(fromStore);
  } catch {
    /* cookies() can throw on multipart Route Handlers */
  }

  try {
    const headerStore = await headers();
    const fromHeaders = verifyToken(tokenFromRequest({ headers: headerStore as any }) || '');
    if (fromHeaders) return withRole(fromHeaders);
  } catch {
    /* ignore */
  }

  return null;
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
