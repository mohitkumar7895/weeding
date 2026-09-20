'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminCustomersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (profileStatus) params.set('profile_status', profileStatus);
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/customers?${params.toString()}`);
    const data = await res.json();
    if (data.success) setRows(data.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [status, profileStatus]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Customer & Matrimonial Management</h1>
        <a href="/api/admin/customers/export" className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm">
          Export CSV
        </a>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="bg-white p-4 rounded-xl border flex gap-3 items-end"
      >
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-md text-sm px-3 py-2">
          <option value="">All account statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING_VERIFICATION">Pending verification</option>
        </select>
        <select value={profileStatus} onChange={(e) => setProfileStatus(e.target.value)} className="border rounded-md text-sm px-3 py-2">
          <option value="">All profile statuses</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, phone" className="border rounded-md text-sm px-3 py-2" />
        <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm">Search</button>
      </form>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Profile</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={4} className="p-6 text-center text-slate-500">Loading...</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{r.profile_verification_status || 'NO PROFILE'}</div>
                  <div className="text-xs text-slate-500">{r.city} {r.religion}</div>
                </td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/customers/${r.id}`} className="text-blue-600">Review</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
