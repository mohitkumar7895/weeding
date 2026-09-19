'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminFraudDetail({ params }: { params: { id: string } }) {
  const [flag, setFlag] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newStatus, setNewStatus] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const fetchFlag = async () => {
    try {
      const res = await fetch(`/api/admin/fraud/flags/${params.id}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setFlag(data.flag);
        setContext(data.context);
        setNewStatus(data.flag.status);
        setNewNotes(data.flag.review_notes || '');
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlag();
  }, [params.id]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/fraud/flags/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, review_notes: newNotes })
      });
      const data = await res.json();
      if (data.success) {
        alert('Risk flag updated successfully.');
        fetchFlag();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading Risk Details...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!flag) return <div className="p-6 text-center text-gray-500">Risk flag not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-6 border-b pb-4">
        <Link href="/admin/fraud" className="text-sm text-indigo-600 hover:underline mb-2 inline-block">&larr; Back to Monitoring</Link>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          Risk Detail Review 
          <span className={`px-2 py-1 text-sm rounded-full font-bold ${
            flag.status === 'OPEN' ? 'bg-red-100 text-red-800' :
            flag.status === 'UNDER_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
            flag.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {flag.status}
          </span>
        </h1>
        <p className="text-xs text-gray-500 mt-2 font-mono">ID: {flag.id}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Signal Information */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-4">Signal Details</h2>
          <div className="space-y-4 text-sm">
            <div>
              <span className="block text-gray-500 font-semibold mb-1">Category</span>
              <div className="font-medium">{flag.risk_category}</div>
            </div>
            <div>
              <span className="block text-gray-500 font-semibold mb-1">Severity</span>
              <div className={`font-bold ${flag.severity === 'CRITICAL' ? 'text-red-600' : 'text-gray-900'}`}>{flag.severity}</div>
            </div>
            <div>
              <span className="block text-gray-500 font-semibold mb-1">Detected Reason</span>
              <div className="bg-gray-50 p-3 rounded border text-gray-800">{flag.reason}</div>
            </div>
            <div>
              <span className="block text-gray-500 font-semibold mb-1">Created At</span>
              <div>{new Date(flag.created_at).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Entity Context */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-4">Entity Context</h2>
          <div className="space-y-4 text-sm">
            <div>
              <span className="block text-gray-500 font-semibold mb-1">Entity Type</span>
              <div className="font-bold">{flag.entity_type}</div>
            </div>
            <div>
              <span className="block text-gray-500 font-semibold mb-1">Entity Reference ID</span>
              <div className="font-mono bg-gray-100 p-1 px-2 rounded inline-block">{flag.entity_id}</div>
            </div>

            {/* Render safe context if available */}
            {context?.maskedEmail && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="mb-2">
                  <span className="block text-gray-500 font-semibold mb-1">Masked Contact</span>
                  <div>{context.maskedEmail}</div>
                </div>
                <div className="mb-2">
                  <span className="block text-gray-500 font-semibold mb-1">Account Status</span>
                  <div>{context.accountStatus}</div>
                </div>
              </div>
            )}
            
            {context?.bookingStatus && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="mb-2">
                  <span className="block text-gray-500 font-semibold mb-1">Booking Status</span>
                  <div>{context.bookingStatus}</div>
                </div>
                <div className="mb-2">
                  <span className="block text-gray-500 font-semibold mb-1">Amount</span>
                  <div>${Number(context.amount).toLocaleString()}</div>
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-400 italic mt-4">Note: PII is redacted according to privacy policies.</p>
          </div>
        </div>
      </div>

      {/* Admin Action Box */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-bold mb-4">Administrative Review</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
            <select 
              className="w-full md:w-1/3 border rounded-md p-2 text-sm"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="OPEN">Open</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="RESOLVED">Resolved (Action Taken)</option>
              <option value="DISMISSED">Dismissed (False Positive)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Review Notes</label>
            <textarea 
              className="w-full border rounded-md p-3 text-sm h-32"
              placeholder="Enter rationale for resolution or dismissal..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            ></textarea>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-gray-500">
              {flag.reviewed_by ? `Last reviewed by ${flag.reviewer_name || flag.reviewed_by} on ${new Date(flag.updated_at).toLocaleString()}` : 'Never reviewed.'}
            </div>
            <button 
              onClick={handleUpdate} 
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
