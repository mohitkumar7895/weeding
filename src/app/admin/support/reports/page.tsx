'use client';

import { useEffect, useState } from 'react';

function pillClass(status: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'RESOLVED' || s === 'DISMISSED') return 'support-pill ok';
  if (s === 'INVESTIGATING') return 'support-pill warn';
  return 'support-pill pending';
}

export default function SupportReportsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reports', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setRows(json.data || []);
      else setError(json.message || 'Failed to load reports');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (report_id: string, status: string) => {
    const res = await fetch('/api/admin/reports', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ report_id, status }),
    });
    const json = await res.json();
    if (json.success) load();
    else alert(json.message || 'Update failed');
  };

  return (
    <div className="space-y-6">
      <div className="support-hero">
        <div>
          <p className="support-kicker">Trust & safety</p>
          <h1>Customer Reports</h1>
          <p>Abuse, fraud, and impersonation reports submitted by customers. Update status after review.</p>
        </div>
        <span className="support-hero-chip">{rows.length} total</span>
      </div>
      {error && <div className="p-4 text-red-500 bg-red-50 rounded-lg">{error}</div>}
      <div className="support-panel">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Reporter</th>
              <th>Reported</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="support-empty">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="support-empty">No reports found.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.category}</td>
                  <td>
                    {r.reporter_name}
                    <div className="text-xs text-slate-500">{r.reporter_email}</div>
                  </td>
                  <td>
                    {r.reported_name}
                    <div className="text-xs text-slate-500">{r.reported_email}</div>
                  </td>
                  <td><span className={pillClass(r.status)}>{r.status}</span></td>
                  <td>
                    <select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)}>
                      <option value="PENDING">PENDING</option>
                      <option value="INVESTIGATING">INVESTIGATING</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="DISMISSED">DISMISSED</option>
                    </select>
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
