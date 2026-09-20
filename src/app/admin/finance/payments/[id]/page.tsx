'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function FinancePaymentDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    const res = await fetch(`/api/admin/finance/payments/${id}`);
    const resData = await res.json();
    if (resData.success) setData(resData.data);
    setLoading(false);
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleReconcile = async (target_status: string) => {
    const reason = prompt(`Enter reason for forcing ${target_status}:`);
    if (!reason) return;

    try {
      const res = await fetch(`/api/admin/finance/payments/${id}/reconcile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_status, reason })
      });
      const resData = await res.json();
      alert(resData.message);
      if (resData.success) fetchDetail();
    } catch (e: any) {
      alert('Reconciliation failed');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading payment details...</div>;
  if (!data) return <div className="p-8 text-red-500">Payment not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-start">
        <div>
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-800 mb-2">&larr; Back to payments</button>
          <h1 className="text-2xl font-bold text-slate-800">Transaction: {data.transaction_ref}</h1>
          <p className="text-slate-500 text-sm mt-1">UUID: {data.id}</p>
        </div>
        <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
          data.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
          data.status === 'FAILED' ? 'bg-red-100 text-red-800' :
          'bg-amber-100 text-amber-800'
        }`}>
          {data.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">Payment Details</h2>
          <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-bold text-lg">{parseFloat(data.amount).toLocaleString()} {data.currency}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Provider</span><span className="capitalize">{data.provider}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Created At</span><span>{new Date(data.created_at).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Last Updated</span><span>{new Date(data.updated_at).toLocaleString()}</span></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">Linked Booking</h2>
          <div className="flex justify-between"><span className="text-slate-500">Booking ID</span><span className="font-mono text-xs truncate max-w-[150px]">{data.booking_id}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Booking Status</span><span className="font-medium text-blue-700">{data.booking_status}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Customer</span><span>{data.customer_name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Vendor</span><span>{data.vendor_name}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-bold text-slate-800 border-b pb-2 mb-4">Provider Metadata (Safe)</h2>
        <pre className="bg-slate-50 p-4 rounded-lg text-xs overflow-auto max-h-64 border border-slate-100 text-slate-700">
          {data.payment_details ? JSON.stringify(data.payment_details, null, 2) : 'No provider metadata available.'}
        </pre>
      </div>

      {(data.status === 'PENDING' || data.status === 'FAILED') && (
        <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-6">
          <h2 className="font-bold text-amber-900 mb-2">Manual Reconciliation (Finance Only)</h2>
          <p className="text-sm text-amber-700 mb-4">If the payment provider confirmed this transaction outside of the automated webhook flow, you can manually reconcile the state here. This will automatically update the booking status if forced to SUCCESS.</p>
          <div className="flex gap-4">
            <button onClick={() => handleReconcile('SUCCESS')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm">
              Force Reconcile to SUCCESS
            </button>
            <button onClick={() => handleReconcile('FAILED')} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-md font-medium text-sm transition-colors">
              Mark as FAILED
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
