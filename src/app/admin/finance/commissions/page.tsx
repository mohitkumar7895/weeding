'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CommissionReviewList() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ booking_id: '', status: '' });
  const [manualCalcBookingId, setManualCalcBookingId] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.booking_id) params.append('booking_id', filters.booking_id);
      if (filters.status) params.append('status', filters.status);

      const res = await fetch(`/api/admin/finance/commissions/records?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [filters.status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleManualCalc = async () => {
    if (!manualCalcBookingId) return;
    try {
      const res = await fetch('/api/admin/finance/commissions/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: manualCalcBookingId })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setManualCalcBookingId('');
        fetchRecords();
      }
    } catch (e: any) {
      alert('Calculation failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Commission Review</h1>
        <Link href="/admin/finance/commissions/rules" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium">
          Manage Rules
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Filters */}
        <form onSubmit={handleSearch} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end h-full">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="border-slate-300 rounded-md text-sm w-32">
              <option value="">All</option>
              <option value="UNSETTLED">Unsettled</option>
              <option value="SETTLED">Settled</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Booking ID</label>
            <input type="text" placeholder="UUID" value={filters.booking_id} onChange={e => setFilters({...filters, booking_id: e.target.value})} className="border-slate-300 rounded-md text-sm w-full" />
          </div>
          <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-900 w-full sm:w-auto">Filter</button>
        </form>

        {/* Manual Calc */}
        <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200 flex flex-col justify-center h-full">
          <h2 className="text-sm font-bold text-emerald-900 mb-2">Manual Commission Trigger</h2>
          <div className="flex gap-2">
            <input type="text" placeholder="Booking ID to Calculate" value={manualCalcBookingId} onChange={e => setManualCalcBookingId(e.target.value)} className="border-emerald-300 rounded-md text-sm flex-1 bg-white" />
            <button onClick={handleManualCalc} className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm hover:bg-emerald-700 font-medium whitespace-nowrap">Calculate Now</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-600">Booking / Record ID</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Customer & Vendor</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Gross Amount</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Rate Applied</th>
              <th className="px-6 py-3 font-semibold text-blue-700">Commission (Net)</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={6} className="p-6 text-center text-slate-500">Loading...</td></tr> : records.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-slate-500">No records found</td></tr> : records.map(r => {
              const gross = parseFloat(r.gross_amount);
              const comm = parseFloat(r.commission_amount);
              const vendorNet = gross - comm;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    <span className="block text-slate-800 font-semibold mb-1">B: {r.booking_id.substring(0,8)}...</span>
                    <span>R: {r.id.substring(0,8)}...</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{r.customer_name}</div>
                    <div className="text-slate-500 text-xs">&rarr; {r.vendor_name}</div>
                  </td>
                  <td className="px-6 py-4 font-medium">₹{gross.toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-600 text-xs bg-slate-50 text-center font-mono border-x border-slate-100">
                    {r.percentage}%
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-blue-700">₹{comm.toLocaleString()}</div>
                    <div className="text-xs text-emerald-600 font-medium mt-1">Vendor Net: ₹{vendorNet.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      r.is_settled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {r.is_settled ? 'SETTLED' : 'UNSETTLED'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
