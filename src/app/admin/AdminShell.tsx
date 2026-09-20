'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'FINANCE';

type UiUser = {
  name: string;
  role: AdminRole;
};

function readUiUser(): UiUser | null {
  try {
    const cached = sessionStorage.getItem('wwm_admin_user');
    if (cached) return JSON.parse(cached);
  } catch {
    /* ignore */
  }
  try {
    const match = document.cookie.match(/(?:^|; )wwm_ui=([^;]*)/);
    if (!match) return null;
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} prefetch className={active ? 'is-active' : undefined}>
      {label}
    </Link>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UiUser | null>(null);

  useEffect(() => {
    const local = readUiUser();
    if (local?.role) setUser(local);

    fetch('/api/auth/session', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.success || !data.user) return;
        const next = { name: data.user.name, role: data.user.role as AdminRole };
        setUser(next);
        sessionStorage.setItem('wwm_admin_user', JSON.stringify(next));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const hrefs = [
      '/admin',
      '/admin/analytics',
      '/admin/customers',
      '/admin/vendors',
      '/admin/reels',
      '/admin/matching/weights',
      '/admin/marketplace',
      '/admin/reports/financial',
      '/admin/receipts',
      '/admin/invoices',
      '/admin/disputes',
      '/admin/notifications/logs',
      '/admin/governance/users',
      '/admin/reliability',
    ];
    hrefs.forEach((href) => router.prefetch(href));
  }, [router]);

  const role = user?.role;
  const roleDisplay = (role || '').replace('_', ' ');

  const nav = useMemo(() => {
    if (!role) return null;
    return (
      <>
        <NavLink href="/admin" label="Dashboard" pathname={pathname} />

        {(role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'FINANCE') && (
          <>
            <div className="admin-nav-section">Analytics & Reports</div>
            <NavLink href="/admin/analytics" label="Platform Analytics" pathname={pathname} />
          </>
        )}

        {(role === 'SUPER_ADMIN' || role === 'ADMIN') && (
          <>
            <div className="admin-nav-section">Operations</div>
            <NavLink href="/admin/customers" label="Customers" pathname={pathname} />
            <NavLink href="/admin/vendors" label="Vendors Management" pathname={pathname} />
            <NavLink href="/admin/reels" label="Reels moderation" pathname={pathname} />
            <NavLink href="/admin/matching/weights" label="Match weights" pathname={pathname} />
            <NavLink href="/admin/marketplace" label="Marketplace Settings" pathname={pathname} />
          </>
        )}

        {(role === 'SUPER_ADMIN' || role === 'FINANCE') && (
          <>
            <div className="admin-nav-section">Financials</div>
            <NavLink href="/admin/reports/financial" label="Financial Reports" pathname={pathname} />
            <NavLink href="/admin/receipts" label="Receipts" pathname={pathname} />
            <NavLink href="/admin/invoices" label="Invoices" pathname={pathname} />
          </>
        )}

        {(role === 'SUPER_ADMIN' || role === 'SUPPORT') && (
          <>
            <div className="admin-nav-section">Support & Comms</div>
            <NavLink href="/admin/disputes" label="Disputes & Cases" pathname={pathname} />
            <NavLink href="/admin/notifications/logs" label="Delivery Logs" pathname={pathname} />
          </>
        )}

        {role === 'SUPER_ADMIN' && (
          <>
            <div className="admin-nav-section">System Governance</div>
            <NavLink href="/admin/governance/users" label="Admin Directory" pathname={pathname} />
            <NavLink href="/admin/governance/roles" label="RBAC Matrix" pathname={pathname} />
            <NavLink href="/admin/governance/config" label="System Configuration" pathname={pathname} />
            <NavLink href="/admin/audit-logs" label="Audit Logs" pathname={pathname} />
            <NavLink href="/admin/notifications/config" label="Notification Matrix" pathname={pathname} />
            <NavLink href="/admin/notifications/templates" label="Message Templates" pathname={pathname} />
            <div className="admin-nav-section">Infrastructure</div>
            <NavLink href="/admin/infrastructure/backups" label="Backup Monitoring" pathname={pathname} />
            <NavLink href="/admin/infrastructure/restores" label="Disaster Recovery" pathname={pathname} />
            <div className="admin-nav-section">Security & Access</div>
            <NavLink href="/admin/security/status" label="Security Posture" pathname={pathname} />
            <NavLink href="/admin/security/config" label="API Configuration" pathname={pathname} />
            <NavLink href="/admin/security/logs" label="Security Logs" pathname={pathname} />
            <div className="admin-nav-section">Fraud & Risk</div>
            <NavLink href="/admin/fraud" label="Risk Monitoring" pathname={pathname} />
            <NavLink href="/admin/fraud/duplicates" label="Duplicate Detection" pathname={pathname} />
          </>
        )}

        <div className="admin-nav-section">System</div>
        <NavLink href="/admin/reliability" label="Backup & Reliability" pathname={pathname} />
      </>
    );
  }, [pathname, role]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h1>WedWithMe</h1>
          <p>Admin Console</p>
        </div>
        <nav className="admin-nav">{nav || <Link href="/admin">Dashboard</Link>}</nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h2>Admin Portal</h2>
          <div className="admin-header-user">
            <div>
              <div className="name">{user?.name || 'Administrator'}</div>
              <div className="role">{roleDisplay || 'LOADING'}</div>
            </div>
            <form
              action="/api/auth/logout"
              method="POST"
              onSubmit={() => {
                try {
                  sessionStorage.removeItem('wwm_admin_user');
                } catch {
                  /* ignore */
                }
              }}
            >
              <button type="submit" className="admin-logout">
                Logout
              </button>
            </form>
          </div>
        </header>
        <div className="admin-content">
          <div className="admin-content-inner">{children}</div>
        </div>
      </main>
    </div>
  );
}
