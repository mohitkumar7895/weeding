import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import Link from 'next/link';
import './admin.css';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE'];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    redirect('/admin/login');
  }

  const roleDisplay = user.role.replace('_', ' ');

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h1>WedWithMe</h1>
          <p>Admin Console</p>
        </div>

        <nav className="admin-nav">
          <Link href="/admin" className="is-active">
            Dashboard
          </Link>

          {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'FINANCE') && (
            <>
              <div className="admin-nav-section">Analytics & Reports</div>
              <Link href="/admin/analytics">Platform Analytics</Link>
            </>
          )}

          {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
            <>
              <div className="admin-nav-section">Operations</div>
              <Link href="/admin/customers">Customers</Link>
              <Link href="/admin/vendors">Vendors Management</Link>
              <Link href="/admin/reels">Reels moderation</Link>
              <Link href="/admin/matching/weights">Match weights</Link>
              <Link href="/admin/marketplace">Marketplace Settings</Link>
            </>
          )}

          {(user.role === 'SUPER_ADMIN' || user.role === 'FINANCE') && (
            <>
              <div className="admin-nav-section">Financials</div>
              <Link href="/admin/reports/financial">Financial Reports</Link>
              <Link href="/admin/receipts">Receipts</Link>
              <Link href="/admin/invoices">Invoices</Link>
            </>
          )}

          {(user.role === 'SUPER_ADMIN' || user.role === 'SUPPORT') && (
            <>
              <div className="admin-nav-section">Support & Comms</div>
              <Link href="/admin/disputes">Disputes & Cases</Link>
              <Link href="/admin/notifications/logs">Delivery Logs</Link>
            </>
          )}

          {user.role === 'SUPER_ADMIN' && (
            <>
              <div className="admin-nav-section">System Governance</div>
              <Link href="/admin/governance/users">Admin Directory</Link>
              <Link href="/admin/governance/roles">RBAC Matrix</Link>
              <Link href="/admin/governance/config">System Configuration</Link>
              <Link href="/admin/audit-logs">Audit Logs</Link>
              <Link href="/admin/notifications/config">Notification Matrix</Link>
              <Link href="/admin/notifications/templates">Message Templates</Link>

              <div className="admin-nav-section">Infrastructure</div>
              <Link href="/admin/infrastructure/backups">Backup Monitoring</Link>
              <Link href="/admin/infrastructure/restores">Disaster Recovery</Link>

              <div className="admin-nav-section">Security & Access</div>
              <Link href="/admin/security/status">Security Posture</Link>
              <Link href="/admin/security/config">API Configuration</Link>
              <Link href="/admin/security/logs">Security Logs</Link>

              <div className="admin-nav-section">Fraud & Risk</div>
              <Link href="/admin/fraud">Risk Monitoring</Link>
              <Link href="/admin/fraud/duplicates">Duplicate Detection</Link>
            </>
          )}

          <div className="admin-nav-section">System</div>
          <Link href="/admin/reliability">Backup & Reliability</Link>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h2>Admin Portal</h2>
          <div className="admin-header-user">
            <div>
              <div className="name">{user.name}</div>
              <div className="role">{roleDisplay}</div>
            </div>
            <form action="/api/auth/logout" method="POST">
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
