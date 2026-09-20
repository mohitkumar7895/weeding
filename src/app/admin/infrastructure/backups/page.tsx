'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminBackups() {
  const [logs, setLogs] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/admin/infrastructure/backups/logs', { credentials: 'include' });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs);
          setConfig(data.config);
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

  if (loading) return <div className="p-6 text-center text-gray-500">Loading Backup Status...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  const isEnabled = config?.BACKUP_ENABLED?.enabled;
  const cronSchedule = config?.BACKUP_FREQUENCY_CRON?.cron || 'Not Configured';
  const retentionDays = config?.BACKUP_RETENTION_DAYS?.days || 'Not Configured';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Database Backups</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor automated infrastructure database dumps and retention.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Service Status</h3>
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-lg font-bold text-gray-900">{isEnabled ? 'ACTIVE' : 'DISABLED'}</span>
          </div>
          {!isEnabled && <p className="text-xs text-red-500 mt-2">Backups are currently disabled in Configuration.</p>}
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Schedule</h3>
          <div className="text-lg font-bold text-gray-900">{cronSchedule}</div>
          <p className="text-xs text-gray-500 mt-1">CRON format</p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Retention Policy</h3>
          <div className="text-lg font-bold text-gray-900">{retentionDays} Days</div>
          <p className="text-xs text-gray-500 mt-1">Before automatic deletion</p>
        </div>
      </div>

      <h2 className="text-lg font-bold mb-4">Backup Execution Logs</h2>
      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 text-left">Started At</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Destination / Ref</th>
              <th className="px-6 py-3 text-left">Size</th>
              <th className="px-6 py-3 text-left">Completed At</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100 text-sm">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">
                  <div className="text-gray-500 font-medium">No backup logs found.</div>
                  <div className="text-gray-400 text-xs mt-1">Waiting for infrastructure integration to report backup data.</div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {new Date(log.started_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                      log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                      log.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {log.status}
                    </span>
                    {log.status === 'FAILED' && <p className="text-xs text-red-500 mt-1">{log.failure_reason}</p>}
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{log.destination_reference || 'N/A'}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {log.file_size_bytes ? `${(log.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {log.completed_at ? new Date(log.completed_at).toLocaleTimeString() : 'N/A'}
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
