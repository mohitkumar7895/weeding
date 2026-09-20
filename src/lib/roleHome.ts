export type AppRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SUPPORT'
  | 'FINANCE'
  | 'VENDOR'
  | 'CUSTOMER'
  | 'USER';

export const SUPPORT_HOME = '/admin/support';

export function normalizeRole(role?: string | null): string {
  return String(role || '').trim().toUpperCase();
}

export function isStaffRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'SUPPORT' || r === 'FINANCE';
}

export function isCustomerRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'CUSTOMER' || r === 'USER';
}

export function isVendorRole(role?: string | null): boolean {
  return normalizeRole(role) === 'VENDOR';
}

/** Canonical landing path after login, refresh, or profile click. */
export function homePathForRole(role?: string | null): string {
  const r = normalizeRole(role);
  if (r === 'SUPPORT') return SUPPORT_HOME;
  if (r === 'FINANCE') return '/admin/reports/financial';
  if (r === 'SUPER_ADMIN' || r === 'ADMIN') return '/admin';
  if (r === 'VENDOR') return '/vendor';
  return '/dashboard';
}

export function isCustomerOnlyPath(pathname?: string | null): boolean {
  const p = pathname || '';
  return p === '/dashboard' || p.startsWith('/dashboard/') || p === '/matches' || p.startsWith('/matches');
}

export function persistStaffSession(user: { name?: string; role?: string } | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user && isStaffRole(user.role)) {
      sessionStorage.setItem(
        'wwm_admin_user',
        JSON.stringify({ name: user.name || '', role: normalizeRole(user.role) })
      );
    } else {
      sessionStorage.removeItem('wwm_admin_user');
    }
  } catch {
    /* ignore */
  }
}

export function clearClientAuthCaches() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('wwm_admin_user');
  } catch {
    /* ignore */
  }
}

export async function logoutAndGoHome() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {
    /* still leave the site */
  }
  clearClientAuthCaches();
  window.location.assign('/');
}
