'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function PayoutDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    const res = await fetch(`/api/admin/finance/payouts/${id}`);
    const resData = await res.json();
    if (resData.success) setData(resData.data);
    setLoading(false);
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleStatusChange = async (target_status: string) => {
    const note = prompt(`Enter note for changing status to ${target_status}:`);
    if (note === null) return;

    try {
      const res = await fetch(`/api/admin/finance/payouts/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_status, note })
      });
      const resData = await res.json();
      alert(resData.message);
      if (resData.success) fetchDetail();
    } catch (e: any) {
      alert('Status change failed');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading payout details...</div>;
  if (!data) return <div className="p-8 text-red-500">Payout not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-start">
        <div>
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-800 mb-2">&larr; Back to payouts</button>
          <h1 className="text-2xl font-bold text-slate-800">Payout ID: {data.id}</h1>
        </div>
        <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
          data.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
          data.status === 'FAILED' ? 'bg-red-100 text-red-800' :
          data.status === 'MANUAL_REVIEW' ? 'bg-purple-100 text-purple-800' :
          'bg-amber-100 text-amber-800'
        }`}>
          {data.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">Financial Breakdown</h2>
          <div className="flex justify-between"><span className="text-slate-500">Gross Booking Amount</span><span>₹{parseFloat(data.gross_booking_amount).toLocaleString()}</span></div>
          <div className="flex justify-between text-red-600"><span className="text-red-500">Platform Commission ({data.commission_percentage}%)</span><span>- ₹{parseFloat(data.commission_amount).toLocaleString()}</span></div>
          <div className="flex justify-between pt-2 border-t font-bold text-lg text-emerald-700"><span>Net Payable Amount</span><span>₹{parseFloat(data.amount).toLocaleString()}</span></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">Vendor Information</h2>
          <div className="flex justify-between"><span className="text-slate-500">Business Name</span><span className="font-medium text-blue-700">{data.vendor_name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Owner Name</span><span>{data.owner_name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Owner Email</span><span>{data.vendor_email}</span></div>
        </div>
      </div>

      {data.status !== 'PAID' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 mb-4 border-b pb-2">Administrative Actions</h2>
          <div className="flex gap-4">
            <button onClick={() => handleStatusChange('PROCESSING')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm">Mark Processing</button>
            <button onClick={() => handleStatusChange('PAID')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm">Mark Paid (Settled)</button>
            <button onClick={() => handleStatusChange('FAILED')} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm">Mark Failed</button>
            <button onClick={() => handleStatusChange('MANUAL_REVIEW')} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm">Send to Manual Review</button>
            <button onClick={() => handleStatusChange('PENDING')} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-md font-medium text-sm transition-colors">Retry (Mark Pending)</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <h2 className="font-bold text-slate-800 p-4 border-b">Payout Attempt History</h2>
        {data.attempts.length === 0 ? <div className="p-4 text-slate-500 text-sm">No recorded attempts yet.</div> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 font-semibold text-slate-600">Attempt #</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Status</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Note / Error</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.attempts.map((a: any) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">{a.attempt_number}</td>
                  <td className="px-4 py-3 font-semibold">{a.status}</td>
                  <td className="px-4 py-3 text-slate-600">{a.error_message || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
