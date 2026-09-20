'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminRefundsDashboard() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({ status: '', booking_id: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.booking_id) params.append('booking_id', filters.booking_id);
      
      const res = await fetch(`/api/admin/finance/refunds?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRefunds(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleGenerateRefunds = async () => {
    if (!confirm('Are you sure you want to scan and generate pending refunds?')) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/finance/refunds/generate', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      if (data.success) fetchData();
    } catch (e) {
      alert('Failed to generate refunds.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Refund Management</h1>
          <p className="text-slate-500 text-sm mt-1">Review and process financial refunds for cancelled bookings.</p>
        </div>
        <button 
          onClick={handleGenerateRefunds} 
          disabled={generating}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {generating ? 'Processing...' : 'Generate Pending Refunds'}
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="border-slate-300 rounded-md text-sm w-40">
              <option value="">All Statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="MANUAL_REVIEW">Manual Review</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Booking ID</label>
            <input type="text" placeholder="UUID" value={filters.booking_id} onChange={e => setFilters({...filters, booking_id: e.target.value})} className="border-slate-300 rounded-md text-sm w-48" />
          </div>
          <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-900">Filter</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-600">Refund Ref</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Booking / Cancelled By</th>
              <th className="px-6 py-3 font-semibold text-slate-600 text-right">Net Refund</th>
              <th className="px-6 py-3 font-semibold text-slate-600 text-center">Status</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Generated On</th>
              <th className="px-6 py-3 font-semibold text-slate-600 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={6} className="p-6 text-center text-slate-500">Loading refunds...</td></tr> : refunds.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-slate-500">No refunds found</td></tr> : refunds.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-700">{r.id.substring(0,8).toUpperCase()}</td>
                <td className="px-6 py-4">
                  <div className="text-blue-600 font-medium">{r.booking_number}</div>
                  <div className="text-xs text-slate-500">{r.cancelled_by_role}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="font-bold text-emerald-600 text-base">₹{parseFloat(r.amount).toLocaleString('en-IN')}</div>
                  <div className="text-xs text-slate-400">Gross: ₹{parseFloat(r.original_amount).toLocaleString('en-IN')}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    ['COMPLETED', 'PROCESSED'].includes(r.status) ? 'bg-emerald-100 text-emerald-800' :
                    r.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                    r.status === 'MANUAL_REVIEW' ? 'bg-purple-100 text-purple-800' :
                    r.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/admin/finance/refunds/${r.id}`} className="text-blue-600 hover:underline font-medium text-sm">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
