'use client';

import React, { useEffect, useState } from 'react';

export default function AdminMatchWeightsPage() {
  const [weights, setWeights] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/weights');
    const data = await res.json();
    if (data.success) setWeights(data.data);
  };

  useEffect(() => {
    load();
  }, []);

  const total = weights.filter((w) => w.is_active).reduce((s, w) => s + parseFloat(w.weight_percent || 0), 0);

  const save = async () => {
    const res = await fetch('/api/admin/weights', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights }),
    });
    const data = await res.json();
    setMessage(data.message || (data.success ? 'Saved' : 'Failed'));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Matching factor weights</h1>
      <p className="text-sm text-slate-500">Active weights must total 100%. Scores are informational and not a guarantee of marriage or compatibility.</p>
      <div className={`text-sm font-semibold ${Math.abs(total - 100) < 0.05 ? 'text-emerald-700' : 'text-red-600'}`}>
        Active total: {total.toFixed(2)}%
      </div>
      <div className="bg-white border rounded-xl divide-y">
        {weights.map((w, i) => (
          <div key={w.id} className="p-4 flex items-center gap-4">
            <div className="flex-1 font-medium">{w.factor_name}</div>
            <input
              type="number"
              step="0.01"
              value={w.weight_percent}
              onChange={(e) => {
                const next = [...weights];
                next[i] = { ...w, weight_percent: e.target.value };
                setWeights(next);
              }}
              className="border rounded px-2 py-1 w-24"
            />
            <label className="text-sm">
              <input
                type="checkbox"
                checked={!!w.is_active}
                onChange={(e) => {
                  const next = [...weights];
                  next[i] = { ...w, is_active: e.target.checked };
                  setWeights(next);
                }}
              /> Active
            </label>
          </div>
        ))}
      </div>
      <button onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded">Save weights</button>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
