'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminReconciliationDetail() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [statusUpdate, setStatusUpdate] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const params = useParams();
  const recId = params.id as string;
  const router = useRouter();

  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/admin/reconciliations/${recId}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
        setStatusUpdate(json.reconciliation.status);
        setInternalNotes(json.reconciliation.internal_notes || '');
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recId) fetchDetails();
  }, [recId]);

  const handleUpdate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/reconciliations/${recId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusUpdate, internal_notes: internalNotes })
      });
      const json = await res.json();
      if (json.success) {
        alert('Reconciliation updated successfully');
        fetchDetails();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Error updating reconciliation: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;
  if (error || !data) return <div className="p-6 text-center text-red-500">{error || 'Record not found'}</div>;

  const rec = data.reconciliation;
  const ctx = data.context;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/admin/reconciliations" className="text-indigo-600 hover:underline mb-2 inline-block">&larr; Back to List</Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Reconciliation Context: {rec.booking_number}</h1>
            <span className={`px-3 py-1 text-xs rounded-full font-bold ${
              rec.status === 'MATCHED' ? 'bg-green-100 text-green-800' : 
              rec.status === 'MISMATCH' ? 'bg-red-100 text-red-800' :
              rec.status === 'PENDING_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {rec.status}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Last Run: {new Date(rec.last_run_at).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Context Panels */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200 bg-red-50">
            <h2 className="text-lg font-bold text-red-900 mb-3">Detected Mismatches</h2>
            {rec.mismatch_details && rec.mismatch_details.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2 text-sm text-red-800">
                {rec.mismatch_details.map((m: string, i: number) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-700 font-medium">No mismatches detected in the last run.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-bold mb-4">Booking Snapshot</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Booking ID:</span> <span className="font-medium">{rec.booking_id}</span></div>
              <div><span className="text-gray-500">Booking Total:</span> <span className="font-medium">₹{rec.booking_total}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="font-medium">{rec.booking_status}</span></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-bold mb-4">Payments ({ctx.payments.length})</h2>
            <div className="space-y-3 text-sm">
              {ctx.payments.length === 0 ? <p className="text-gray-500">No payments found.</p> : 
                ctx.payments.map((p: any) => (
                  <div key={p.id} className="p-3 bg-gray-50 rounded border">
                    <p><span className="font-medium text-gray-900">{p.transaction_ref}</span> • ₹{p.amount}</p>
                    <p className="text-xs text-gray-500">Status: {p.status} • {new Date(p.created_at).toLocaleString()}</p>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-bold mb-4">Invoices ({ctx.invoices.length})</h2>
            <div className="space-y-3 text-sm">
              {ctx.invoices.length === 0 ? <p className="text-gray-500">No invoices found.</p> : 
                ctx.invoices.map((inv: any) => (
                  <div key={inv.id} className="p-3 bg-gray-50 rounded border">
                    <p><span className="font-medium text-gray-900">{inv.invoice_number}</span> • ₹{inv.total_amount}</p>
                    <p className="text-xs text-gray-500">Status: {inv.status} • {new Date(inv.created_at).toLocaleString()}</p>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-bold mb-4">Refunds ({ctx.refunds.length})</h2>
            <div className="space-y-3 text-sm">
              {ctx.refunds.length === 0 ? <p className="text-gray-500">No refunds found.</p> : 
                ctx.refunds.map((r: any) => (
                  <div key={r.id} className="p-3 bg-gray-50 rounded border">
                    <p><span className="font-medium text-gray-900">{r.reference_id || 'No Ref'}</span> • ₹{r.amount}</p>
                    <p className="text-xs text-gray-500">Status: {r.status} • {new Date(r.created_at).toLocaleString()}</p>
                  </div>
                ))
              }
            </div>
          </div>

        </div>

        {/* Right Column: Management */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-bold mb-4">Manual Review</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  value={statusUpdate} 
                  onChange={(e) => setStatusUpdate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="MATCHED">Matched</option>
                  <option value="MISMATCH">Mismatch</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                <textarea 
                  value={internalNotes} 
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm h-32"
                  placeholder="Explain resolution or review findings..."
                ></textarea>
              </div>

              <button 
                onClick={handleUpdate}
                disabled={actionLoading}
                className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm"
              >
                Save Review
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Saving updates here will not modify the authoritative historical records on the left.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
