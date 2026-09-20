'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch(`/api/admin/customers/${id}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const update = async (payload: any) => {
    if (!confirm('Apply this customer/profile change?')) return;
    const res = await fetch(`/api/admin/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    alert(json.message || json.error);
    if (json.success) load();
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>Not found</div>;
  const u = data.user;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin/customers" className="text-sm text-slate-500">← Customers</Link>
      <h1 className="text-2xl font-bold">{u.name}</h1>
      <p className="text-slate-500">{u.email} · {u.phone} · Account {u.status}</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => update({ status: 'ACTIVE' })} className="bg-emerald-600 text-white px-3 py-2 rounded text-sm">Activate</button>
        <button onClick={() => update({ status: 'SUSPENDED' })} className="bg-amber-600 text-white px-3 py-2 rounded text-sm">Suspend</button>
        <button onClick={() => update({ profile_verification_status: 'VERIFIED' })} className="bg-blue-600 text-white px-3 py-2 rounded text-sm">Approve profile</button>
        <button onClick={() => update({ profile_verification_status: 'REJECTED' })} className="bg-red-600 text-white px-3 py-2 rounded text-sm">Reject profile</button>
        <button onClick={() => update({ profile_verification_status: 'PENDING' })} className="bg-slate-700 text-white px-3 py-2 rounded text-sm">Mark pending</button>
      </div>
      <div className="bg-white p-4 rounded-xl border">
        <h2 className="font-bold mb-2">Visibility overrides</h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => update({ profile_visibility: 'PUBLIC' })} className="border px-3 py-1 rounded text-sm">Public</button>
          <button onClick={() => update({ profile_visibility: 'PRIVATE' })} className="border px-3 py-1 rounded text-sm">Private</button>
          <button onClick={() => update({ profile_visibility: 'LIMITED' })} className="border px-3 py-1 rounded text-sm">Limited</button>
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl border">
        <h2 className="font-bold mb-2">Reports ({data.reports.length})</h2>
        {data.reports.length === 0 ? <p className="text-sm text-slate-500">None</p> : data.reports.map((r: any) => (
          <div key={r.id} className="text-sm border-b py-2">{r.category} · {r.status} · {r.description}</div>
        ))}
      </div>
      {data.preferences && (
        <div className="bg-white p-4 rounded-xl border">
          <h2 className="font-bold mb-2">Partner preferences</h2>
          <pre className="text-xs bg-slate-50 p-3 overflow-auto">{JSON.stringify(data.preferences, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
