'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSecurityLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/admin/security/logs');
        if (res.status === 401 || res.status === 403) {
          router.push('/admin/login');
          return;
        }
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs);
        } else {
          setError(data.error);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [router]);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading Access Logs...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">API Security & Access Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor blocked or unauthorized requests made to the platform.</p>
      </div>

      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 text-left">Timestamp</th>
              <th className="px-6 py-3 text-left">Event Type</th>
              <th className="px-6 py-3 text-left">IP Address / User</th>
              <th className="px-6 py-3 text-left">Endpoint</th>
              <th className="px-6 py-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100 text-sm">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">
                  <div className="text-gray-500 font-medium">No security alerts found.</div>
                  <div className="text-gray-400 text-xs mt-1">Waiting for application logs to populate.</div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                      log.event_type === 'RATE_LIMIT_EXCEEDED' ? 'bg-yellow-100 text-yellow-800' :
                      log.event_type === 'AUTH_FAILURE' ? 'bg-red-100 text-red-800' :
                      log.event_type === 'UNAUTHORIZED_ACCESS' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.event_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs">{log.ip_address}</div>
                    {log.user_id && <div className="text-xs text-gray-500 mt-1" title={log.user_id}>User: ...{log.user_id.substring(28)}</div>}
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-mono text-xs max-w-[200px] truncate" title={log.endpoint}>
                    {log.endpoint}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs max-w-[250px] truncate" title={log.details}>
                    {log.details || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
