'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PayoutsDashboard() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({ vendor_id: '', status: '', booking_id: '' });

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.vendor_id) params.append('vendor_id', filters.vendor_id);
      if (filters.booking_id) params.append('booking_id', filters.booking_id);

      const res = await fetch(`/api/admin/finance/payouts?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPayouts(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [filters.status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayouts();
  };

  const handleGenerate = async () => {
    if (!confirm('Run payout eligibility scan? This will convert settled commissions into PENDING payouts.')) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/finance/payouts/generate', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      if (data.success) fetchPayouts();
    } catch (e: any) {
      alert('Error generating payouts');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settlement & Vendor Payouts</h1>
          <p className="text-slate-500 text-sm mt-1">Manage vendor earnings and process payouts.</p>
        </div>
        <button 
          onClick={handleGenerate} 
          disabled={generating}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          {generating ? 'Scanning...' : 'Run Eligibility Scan'}
        </button>
      </div>
      
      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="border-slate-300 rounded-md text-sm">
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
            <option value="MANUAL_REVIEW">Manual Review</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Vendor ID</label>
          <input type="text" placeholder="UUID" value={filters.vendor_id} onChange={e => setFilters({...filters, vendor_id: e.target.value})} className="border-slate-300 rounded-md text-sm w-40" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Booking ID</label>
          <input type="text" placeholder="UUID" value={filters.booking_id} onChange={e => setFilters({...filters, booking_id: e.target.value})} className="border-slate-300 rounded-md text-sm w-40" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Filter</button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-600">Payout ID</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Vendor / Booking</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Amount (Net)</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading...</td></tr> : payouts.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">No payouts found</td></tr> : payouts.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <Link href={`/admin/finance/payouts/${p.id}`} className="font-medium text-blue-600 hover:underline">{p.id.substring(0,8)}...</Link>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-800 font-semibold">{p.vendor_name}</div>
                  <div className="text-slate-500 text-xs font-mono mt-1">B: {p.booking_id.substring(0,8)}...</div>
                </td>
                <td className="px-6 py-4 font-bold text-slate-700">
                  ₹{parseFloat(p.amount).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    p.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                    p.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                    p.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                    p.status === 'MANUAL_REVIEW' ? 'bg-purple-100 text-purple-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {new Date(p.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
