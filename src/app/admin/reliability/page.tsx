'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminBackupReliabilityDashboard() {
  const [config, setConfig] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [restoreTests, setRestoreTests] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [resConfig, resHistory, resTests, resHealth] = await Promise.all([
        fetch('/api/admin/backups/config'),
        fetch('/api/admin/backups/records'),
        fetch('/api/admin/backups/restore-tests'),
        fetch('/api/admin/health')
      ]);

      if (resConfig.status === 401 || resConfig.status === 403) {
        router.push('/admin/login');
        return;
      }

      const [dataConfig, dataHistory, dataTests, dataHealth] = await Promise.all([
        resConfig.json(), resHistory.json(), resTests.json(), resHealth.json()
      ]);

      if (dataConfig.success) setConfig(dataConfig.data);
      if (dataHistory.success) setHistory(dataHistory.data);
      if (dataTests.success) setRestoreTests(dataTests.data);
      if (dataHealth.success) setHealth(dataHealth.data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleUpdateConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/backups/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        alert('Configuration saved successfully.');
        fetchDashboardData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading Infrastructure Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Backup, Restore & Reliability</h1>
        <p className="text-sm text-gray-500 mt-1">Manage database backup configuration and track restore-drill records.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Health Panel */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-4">System Health</h2>
          {health ? (
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Database Connection</span>
                <span className={`px-2 py-1 text-xs rounded font-bold ${health.database.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {health.database.status.toUpperCase()}
                </span>
                <span className="text-xs text-gray-400 ml-2">Latency: {health.database.latency_ms}ms</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Node.js Uptime</span>
                <span className="text-sm">{Math.floor(health.uptime / 60)} minutes</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Environment</span>
                <span className="text-sm uppercase">{health.environment}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Health data unavailable.</div>
          )}
        </div>

        {/* Configuration Panel */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-4">Backup Configuration</h2>
          {config ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={config.is_enabled === 1 || config.is_enabled === true} 
                  onChange={(e) => setConfig({...config, is_enabled: e.target.checked})} 
                />
                <span className="text-sm font-medium">Enable Automated Backups</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Frequency</label>
                <select 
                  className="w-full border rounded p-2 text-sm"
                  value={config.frequency}
                  onChange={(e) => setConfig({...config, frequency: e.target.value})}
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="MANUAL">Manual Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Retention Period (Days)</label>
                <input 
                  type="number" 
                  className="w-full border rounded p-2 text-sm"
                  value={config.retention_days}
                  onChange={(e) => setConfig({...config, retention_days: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Destination Reference (e.g. S3 Bucket URI)</label>
                <input 
                  type="text" 
                  className="w-full border rounded p-2 text-sm"
                  placeholder="s3://backups-bucket/db/"
                  value={config.destination_reference || ''}
                  onChange={(e) => setConfig({...config, destination_reference: e.target.value})}
                />
              </div>
              <button 
                onClick={handleUpdateConfig} 
                disabled={saving}
                className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration (Super Admin Only)'}
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Configuration unavailable.</div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-center justify-between">
        <div>
          <h3 className="text-yellow-800 font-bold text-sm">Disaster Recovery (DR) Runbook</h3>
          <p className="text-yellow-700 text-xs mt-1">Ensure your team is familiar with the MySQL restoration procedures before an incident occurs.</p>
        </div>
        <Link href="/docs/restore-procedure.md" target="_blank" className="bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-yellow-700">
          View Restore Runbook &rarr;
        </Link>
      </div>

      {/* Restore Tests Ledger */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold">Restore Drills & Tests Ledger</h2>
          <button onClick={() => alert('Log New Restore Test functionality is an API-first capability for this MVP. Post to /api/admin/backups/restore-tests to add a record.')} className="text-sm text-indigo-600 font-medium hover:underline">
            + Log Restore Test
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Backup Reference Used</th>
              <th className="px-6 py-3">Target Environment</th>
              <th className="px-6 py-3">Tested By</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100 text-sm">
            {restoreTests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No restore drills have been logged yet.
                </td>
              </tr>
            ) : (
              restoreTests.map((rt) => (
                <tr key={rt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(rt.test_date).toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-xs">{rt.backup_reference}</td>
                  <td className="px-6 py-4">{rt.environment_reference}</td>
                  <td className="px-6 py-4">{rt.tester_name || rt.tested_by}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded font-bold ${
                      rt.status === 'PASSED' ? 'bg-green-100 text-green-800' :
                      rt.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      rt.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {rt.status}
                    </span>
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
