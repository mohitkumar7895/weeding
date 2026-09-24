'use client';

import React, { useEffect, useState } from 'react';
import ReelsExperience from '@/components/ReelsExperience';

export default function AdminReelsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/reels?status=${status}`);
    const data = await res.json();
    if (data.success) setRows(data.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [status]);

  const moderate = async (id: string, next: string) => {
    const reason = next === 'REJECTED' ? prompt('Rejection reason') : '';
    if (next === 'REJECTED' && reason === null) return;
    await fetch(`/api/admin/reels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, reason }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Reels</h1>
      <ReelsExperience title="Admin / Super Admin reels" />
      <h2 className="text-lg font-semibold text-slate-800">Moderation queue</h2>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
        <option value="">All</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
      </select>
      <div className="grid md:grid-cols-2 gap-4">
        {loading && <p>Loading...</p>}
        {rows.map((r) => (
          <div key={r.id} className="bg-white border rounded-xl p-4 space-y-2">
            <div className="font-semibold">{r.title}</div>
            <div className="text-xs text-slate-500">{r.business_name} · {r.status}</div>
            <video src={r.video_url} controls className="w-full rounded-lg max-h-56 bg-black" />
            {r.status === 'PENDING' && (
              <div className="flex gap-2">
                <button onClick={() => moderate(r.id, 'APPROVED')} className="bg-emerald-600 text-white px-3 py-1 rounded text-sm">Approve</button>
                <button onClick={() => moderate(r.id, 'REJECTED')} className="bg-red-600 text-white px-3 py-1 rounded text-sm">Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
