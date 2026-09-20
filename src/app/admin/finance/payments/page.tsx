'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function FinancePaymentsList() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', transaction_ref: '', booking_id: '' });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.transaction_ref) params.append('transaction_ref', filters.transaction_ref);
      if (filters.booking_id) params.append('booking_id', filters.booking_id);

      const res = await fetch(`/api/admin/finance/payments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filters.status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayments();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Payment Monitoring</h1>
      
      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="border-slate-300 rounded-md text-sm">
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Transaction Ref</label>
          <input type="text" placeholder="TXN-..." value={filters.transaction_ref} onChange={e => setFilters({...filters, transaction_ref: e.target.value})} className="border-slate-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Booking ID</label>
          <input type="text" placeholder="UUID" value={filters.booking_id} onChange={e => setFilters({...filters, booking_id: e.target.value})} className="border-slate-300 rounded-md text-sm" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Search</button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-600">Transaction Ref</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Booking ID</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Customer & Vendor</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Amount</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={6} className="p-6 text-center text-slate-500">Loading...</td></tr> : payments.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-slate-500">No payments found</td></tr> : payments.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <Link href={`/admin/finance/payments/${p.id}`} className="font-medium text-blue-600 hover:underline">{p.transaction_ref}</Link>
                </td>
                <td className="px-6 py-4 text-slate-500 font-mono text-xs">{p.booking_id.substring(0,8)}...</td>
                <td className="px-6 py-4">
                  <div className="text-slate-800 font-medium">{p.customer_name}</div>
                  <div className="text-slate-500 text-xs">&rarr; {p.vendor_name}</div>
                </td>
                <td className="px-6 py-4 font-bold text-slate-700">
                  {parseFloat(p.amount).toLocaleString()} {p.currency}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    p.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
                    p.status === 'FAILED' ? 'bg-red-100 text-red-800' :
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
