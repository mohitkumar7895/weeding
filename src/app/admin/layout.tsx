import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import Link from 'next/link';

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

  // Format the role for display
  const roleDisplay = user.role.replace('_', ' ');

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col h-full shadow-lg">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-white tracking-tight">WedWithMe</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Admin Console</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link href="/admin" className="block px-4 py-2.5 rounded hover:bg-slate-800 transition-colors bg-slate-800 font-medium mb-4">
            Dashboard
          </Link>

          {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'FINANCE') && (
            <>
              <div className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analytics & Reports</p>
              </div>
              <Link href="/admin/analytics" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Platform Analytics
              </Link>
            </>
          )}
          
          {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
            <>
              <div className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operations</p>
              </div>
              <Link href="/admin/vendors" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Vendors Management
              </Link>
              <Link href="/admin/marketplace" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Marketplace Settings
              </Link>
            </>
          )}

          {(user.role === 'SUPER_ADMIN' || user.role === 'FINANCE') && (
            <>
              <div className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Financials</p>
              </div>
              <Link href="/admin/reports/financial" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Financial Reports
              </Link>
              <Link href="/admin/reconciliations" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Reconciliation
              </Link>
            </>
          )}

          {(user.role === 'SUPER_ADMIN' || user.role === 'SUPPORT') && (
            <>
              <div className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Support & Comms</p>
              </div>
              <Link href="/admin/disputes" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Disputes & Cases
              </Link>
              <Link href="/admin/notifications/logs" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Delivery Logs
              </Link>
            </>
          )}

          {user.role === 'SUPER_ADMIN' && (
            <>
              <div className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Governance</p>
              </div>
              <Link href="/admin/governance/users" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Admin Directory
              </Link>
              <Link href="/admin/governance/roles" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                RBAC Matrix
              </Link>
              <Link href="/admin/governance/config" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                System Configuration
              </Link>
              <Link href="/admin/notifications/config" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Notification Matrix
              </Link>
              <Link href="/admin/notifications/templates" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Message Templates
              </Link>

              <div className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Infrastructure</p>
              </div>
              <Link href="/admin/infrastructure/backups" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Backup Monitoring
              </Link>
              <Link href="/admin/infrastructure/restores" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Disaster Recovery
              </Link>

              <div className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security & Access</p>
              </div>
              <Link href="/admin/security/status" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Security Posture
              </Link>
              <Link href="/admin/security/config" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                API Configuration
              </Link>
              <Link href="/admin/security/logs" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Security Logs
              </Link>

              <div className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fraud & Risk</p>
              </div>
              <Link href="/admin/fraud" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Risk Monitoring
              </Link>
              <Link href="/admin/fraud/duplicates" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
                Duplicate Detection
              </Link>
            </>
          )}

          <div className="pt-4 pb-2 px-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System</p>
          </div>
          <Link href="/admin/reliability" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors text-slate-300">
            Backup & Reliability
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-semibold text-gray-800">Admin Portal</h2>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-blue-600 font-medium">{roleDisplay}</p>
            </div>
            <form action="/api/auth/logout" method="POST" className="m-0 p-0">
              <button 
                type="submit"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition-colors border border-slate-200"
              >
                Logout
              </button>
            </form>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
