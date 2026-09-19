'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSecurityStatus() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/admin/security/status');
        if (res.status === 401 || res.status === 403) {
          router.push('/admin/login');
          return;
        }
        const data = await res.json();
        if (data.success) {
          setStatus(data.status);
        } else {
          setError(data.error);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [router]);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading Security Posture...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  const renderStatusCard = (title: string, data: any) => (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <span className={`px-2 py-1 text-xs rounded-full font-bold ${data.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {data.active ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>
      <p className="text-sm text-gray-500">{data.details}</p>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">Platform Security Posture</h1>
        <p className="text-sm text-gray-500 mt-1">Read-only overview of existing application security controls.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderStatusCard('Authentication (JWT)', status.authentication)}
        {renderStatusCard('Role-Based Access (RBAC)', status.authorization)}
        {renderStatusCard('Rate Limiting', status.rateLimiting)}
        {renderStatusCard('Cross-Origin Resource Sharing (CORS)', status.cors)}
        {renderStatusCard('Password Cryptography', status.passwordHashing)}
        {renderStatusCard('Strict Auth Verification', status.strictAuth)}
        {renderStatusCard('Audit Logging', status.auditLogging)}
      </div>
      
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
        <strong>Note:</strong> This dashboard verifies that the configuration toggles are enabled. It does not replace independent penetration testing or infrastructure-level firewall monitoring (e.g., AWS WAF).
      </div>
    </div>
  );
}
