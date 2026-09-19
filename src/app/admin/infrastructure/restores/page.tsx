'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRestoreTests() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'PROCEDURE' | 'HISTORY'>('HISTORY');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ test_environment: 'STAGING', backup_reference: '' });

  const router = useRouter();

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/infrastructure/backups/restore-tests');
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setTests(data.tests);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleCreateTest = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/infrastructure/backups/restore-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({ test_environment: 'STAGING', backup_reference: '' });
        fetchTests();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string, currentNotes: string) => {
    const notes = prompt(`Enter notes for changing status to ${newStatus}:`, currentNotes || '');
    if (notes === null) return; // cancelled

    try {
      const res = await fetch(`/api/admin/infrastructure/backups/restore-tests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes_and_results: notes })
      });
      const data = await res.json();
      if (data.success) {
        fetchTests();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading Restore Tests...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Disaster Recovery & Restores</h1>
          <p className="text-sm text-gray-500 mt-1">SOP Documentation and historical DR restore exercises.</p>
        </div>
        <div className="space-x-4">
          <button 
            onClick={() => setActiveTab('PROCEDURE')} 
            className={`pb-4 px-2 text-sm font-bold border-b-2 ${activeTab === 'PROCEDURE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            SOP DOCUMENTATION
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')} 
            className={`pb-4 px-2 text-sm font-bold border-b-2 ${activeTab === 'HISTORY' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            TEST HISTORY
          </button>
        </div>
      </div>

      {activeTab === 'PROCEDURE' && (
        <div className="bg-white p-8 rounded-lg border shadow-sm prose max-w-none">
          <h2>Standard Operating Procedure: Database Restoration</h2>
          <p>This document outlines the standard process for restoring the WedWithMe database from a backup.</p>
          
          <h3>1. Prerequisites</h3>
          <ul>
            <li>Active Super Admin credentials.</li>
            <li>Access to the infrastructure environment (or staging for DR tests).</li>
            <li>Reference to the target backup file (found in Backup Logs).</li>
          </ul>

          <h3>2. Restore Process</h3>
          <p>Depending on the final hosting provider, the execution commands will vary. Conceptually:</p>
          <ol>
            <li>Stop application traffic to the target environment to prevent data corruption.</li>
            <li>Download the SQL dump from secure storage using the Backup Reference.</li>
            <li>Wipe or rename the existing target database.</li>
            <li>Execute the SQL dump against the target MySQL instance.</li>
          </ol>
          <pre><code>mysql -u [user] -p[password] [database_name] &lt; backup_file.sql</code></pre>

          <h3>3. Verification</h3>
          <ul>
            <li>Run `SELECT COUNT(*) FROM users` to ensure rows match expectations.</li>
            <li>Verify `system_configuration` exists and is intact.</li>
            <li>Log a "Passed" restore test in the DR Test History tab to maintain compliance.</li>
          </ul>
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
              + Log New DR Test
            </button>
          </div>

          <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Date / ID</th>
                  <th className="px-6 py-3 text-left">Env / Backup Ref</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Notes</th>
                  <th className="px-6 py-3 text-left">Tester</th>
                  <th className="px-6 py-3 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 text-sm">
                {tests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No disaster recovery tests logged yet.
                    </td>
                  </tr>
                ) : (
                  tests.map((test) => (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{new Date(test.created_at).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400 mt-1" title={test.id}>...{test.id.substring(28)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded font-bold">{test.test_environment}</span>
                        <div className="text-xs text-gray-500 font-mono mt-2">{test.backup_reference}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                          test.status === 'PASSED' ? 'bg-green-100 text-green-800' :
                          test.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          test.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {test.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs max-w-xs truncate" title={test.notes_and_results}>
                        {test.notes_and_results || 'No notes.'}
                      </td>
                      <td className="px-6 py-4 text-gray-900 text-xs">
                        {test.tested_by_name || 'System'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {test.status === 'PLANNED' && (
                          <button onClick={() => handleUpdateStatus(test.id, 'IN_PROGRESS', test.notes_and_results)} className="text-xs font-bold text-blue-600 hover:underline">START</button>
                        )}
                        {test.status === 'IN_PROGRESS' && (
                          <>
                            <button onClick={() => handleUpdateStatus(test.id, 'PASSED', test.notes_and_results)} className="text-xs font-bold text-green-600 hover:underline">PASS</button>
                            <button onClick={() => handleUpdateStatus(test.id, 'FAILED', test.notes_and_results)} className="text-xs font-bold text-red-600 hover:underline">FAIL</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Log DR Restore Test</h2>
            <p className="text-sm text-gray-500 mb-4">Creates a "Planned" test record. You cannot mark a test as Passed automatically.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Environment</label>
                <select className="w-full border rounded-md p-2 text-sm" value={formData.test_environment} onChange={(e) => setFormData({...formData, test_environment: e.target.value})}>
                  <option value="STAGING">STAGING</option>
                  <option value="LOCAL_DEV">LOCAL DEV</option>
                  <option value="DR_REPLICA">DR REPLICA</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Backup Reference String</label>
                <input type="text" placeholder="e.g. s3://bucket/backup-123.sql" className="w-full border rounded-md p-2 text-sm font-mono" value={formData.backup_reference} onChange={(e) => setFormData({...formData, backup_reference: e.target.value})} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateTest} disabled={saving || !formData.backup_reference} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Plan Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
