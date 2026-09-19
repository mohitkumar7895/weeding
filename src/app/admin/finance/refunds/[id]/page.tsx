'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminRefundDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [refund, setRefund] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRefund();
  }, [resolvedParams.id]);

  const fetchRefund = async () => {
    try {
      const res = await fetch(\`/api/admin/finance/refunds/\${resolvedParams.id}\`);
      const data = await res.json();
      if (data.success) {
        setRefund(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!confirm(\`Are you sure you want to transition this refund to \${status}?\`)) return;
    setProcessing(true);
    try {
      const res = await fetch(\`/api/admin/finance/refunds/\${resolvedParams.id}/status\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        fetchRefund();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert('Error updating status');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!refund) return <div className="p-8">Refund not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/finance/refunds" className="text-slate-500 hover:text-slate-700">← Back to Ledger</Link>
        <h1 className="text-2xl font-bold text-slate-800">Refund Review: {refund.id.split('-')[0].toUpperCase()}</h1>
        <span className={\`px-3 py-1 rounded-full text-xs font-bold \${
            ['COMPLETED', 'PROCESSED'].includes(refund.status) ? 'bg-emerald-100 text-emerald-800' :
            refund.status === 'FAILED' ? 'bg-red-100 text-red-800' :
            refund.status === 'MANUAL_REVIEW' ? 'bg-purple-100 text-purple-800' :
            refund.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
            'bg-amber-100 text-amber-800'
          }\`}>
            {refund.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Core Financials */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Financial Breakdown</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="text-xs font-medium text-slate-500 mb-1">Gross Booking Paid</div>
                <div className="text-xl font-bold text-slate-800">₹{parseFloat(refund.original_amount).toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <div className="text-xs font-medium text-red-500 mb-1">Rule Deduction ({refund.penalty_percentage || 0}%)</div>
                <div className="text-xl font-bold text-red-600">-₹{parseFloat(refund.deduction_amount).toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 shadow-inner">
                <div className="text-xs font-medium text-emerald-600 mb-1">Net Refund Payable</div>
                <div className="text-2xl font-bold text-emerald-700">₹{parseFloat(refund.amount).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="text-sm text-slate-600 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <strong>Applied Cancellation Policy:</strong> <br/>
              Initiator: {refund.cancelled_by_role} <br/>
              Rule Outcome: {refund.refund_percentage}% Refund allowed, {refund.penalty_percentage}% penalty assessed.
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Lifecycle Management</h2>
            <p className="text-sm text-slate-600 mb-4">Advance the refund through the processing pipeline once triggered with the gateway.</p>
            
            <div className="flex flex-wrap gap-3">
              {['PENDING', 'REQUESTED'].includes(refund.status) && (
                <button disabled={processing} onClick={() => updateStatus('PROCESSING')} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 text-sm font-medium">Mark as PROCESSING</button>
              )}
              {['PROCESSING'].includes(refund.status) && (
                <button disabled={processing} onClick={() => updateStatus('COMPLETED')} className="bg-emerald-600 text-white px-4 py-2 rounded shadow hover:bg-emerald-700 text-sm font-medium">Mark as COMPLETED</button>
              )}
              {['PENDING', 'PROCESSING', 'MANUAL_REVIEW'].includes(refund.status) && (
                <button disabled={processing} onClick={() => updateStatus('FAILED')} className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 text-sm font-medium">Mark as FAILED</button>
              )}
              {['FAILED'].includes(refund.status) && (
                <button disabled={processing} onClick={() => updateStatus('MANUAL_REVIEW')} className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 text-sm font-medium">Escalate to MANUAL_REVIEW</button>
              )}
              {['FAILED', 'MANUAL_REVIEW'].includes(refund.status) && (
                <button disabled={processing} onClick={() => updateStatus('PENDING')} className="bg-slate-600 text-white px-4 py-2 rounded shadow hover:bg-slate-700 text-sm font-medium">Retry (Requeue as PENDING)</button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">Booking Context</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="block text-xs text-slate-500">Booking ID</span>
                <span className="font-medium">{refund.booking_number}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">Customer</span>
                <span className="font-medium">{refund.customer_name} ({refund.customer_email})</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">Vendor</span>
                <span className="font-medium">{refund.vendor_name}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">Cancellation Reason</span>
                <span className="italic text-slate-700">"{refund.reason}"</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">System Audit</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="block text-xs text-slate-500">Generated At</span>
                <span className="font-medium">{new Date(refund.created_at).toLocaleString()}</span>
              </div>
              {refund.processed_at && (
                <div>
                  <span className="block text-xs text-slate-500">Processed At</span>
                  <span className="font-medium">{new Date(refund.processed_at).toLocaleString()}</span>
                </div>
              )}
              <div>
                <span className="block text-xs text-slate-500">Payment Reference ID</span>
                <span className="font-mono text-xs">{refund.reference_id || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
