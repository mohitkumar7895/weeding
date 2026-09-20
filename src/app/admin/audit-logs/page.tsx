'use client';

import React, { useEffect, useState } from 'react';

export default function AdminAuditLogsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (action) params.set('action', action);
    if (entity) params.set('entity', entity);
    const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
    const data = await res.json();
    if (data.success) setRows(data.data || data.logs || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Audit Trail</h1>
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-3">
        <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action" className="border rounded px-3 py-2 text-sm" />
        <input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="Entity type" className="border rounded px-3 py-2 text-sm" />
        <button className="bg-slate-800 text-white px-4 py-2 rounded text-sm">Filter</button>
      </form>
      <div className="bg-white rounded-xl border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left">Time</th>
              <th className="px-4 py-2 text-left">Actor</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? <tr><td className="p-4" colSpan={4}>Loading...</td></tr> : rows.map((r: any) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-xs">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</td>
                <td className="px-4 py-2">{r.user_name || r.user_id}<div className="text-xs text-slate-500">{r.user_role || r.role}</div></td>
                <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2 text-xs">{r.entity_type} {r.entity_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
