'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDuplicateDetail({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newStatus, setNewStatus] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/admin/fraud/duplicates/${params.id}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setNewStatus(json.data.caseDetails.status);
        setNewNotes(json.data.caseDetails.review_notes || '');
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
    fetchDetail();
  }, [params.id]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/fraud/duplicates/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, review_notes: newNotes })
      });
      const json = await res.json();
      if (json.success) {
        alert('Duplicate case updated successfully.');
        fetchDetail();
      } else {
        alert(json.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading Pair Comparison...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!data) return <div className="p-6 text-center text-gray-500">Case not found.</div>;

  const { caseDetails, profileA, profileB } = data;
  const signals = JSON.parse(caseDetails.detection_signals);

  const renderProfileColumn = (profile: any, title: string) => {
    if (!profile) return <div className="p-4 bg-gray-50 rounded border text-gray-500 italic">Profile deleted or missing.</div>;
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-bold mb-4 border-b pb-2">{title}</h2>
        <div className="space-y-4 text-sm">
          <div><span className="block text-gray-500 font-semibold mb-1">User ID</span><div className="font-mono text-xs">{profile.user_id}</div></div>
          <div><span className="block text-gray-500 font-semibold mb-1">Account Status</span><div>{profile.account_status} (since {new Date(profile.user_created_at).toLocaleDateString()})</div></div>
          <div><span className="block text-gray-500 font-semibold mb-1">Masked Email</span><div>{profile.masked_email}</div></div>
          <div><span className="block text-gray-500 font-semibold mb-1">Name</span><div className="font-bold">{profile.first_name} {profile.last_name}</div></div>
          <div><span className="block text-gray-500 font-semibold mb-1">DOB</span><div>{new Date(profile.date_of_birth).toLocaleDateString()}</div></div>
          <div><span className="block text-gray-500 font-semibold mb-1">Gender</span><div>{profile.gender}</div></div>
          <div><span className="block text-gray-500 font-semibold mb-1">Religion / Community</span><div>{profile.religion} - {profile.community}</div></div>
          <div><span className="block text-gray-500 font-semibold mb-1">Location</span><div>{profile.city}, {profile.country}</div></div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="mb-6 border-b pb-4">
        <Link href="/admin/fraud/duplicates" className="text-sm text-indigo-600 hover:underline mb-2 inline-block">&larr; Back to Duplicates</Link>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          Duplicate Detection Review
          <span className={`px-2 py-1 text-sm rounded-full font-bold ${
            caseDetails.status === 'OPEN' ? 'bg-red-100 text-red-800' :
            caseDetails.status === 'CONFIRMED_DUPLICATE' ? 'bg-indigo-100 text-indigo-800' :
            caseDetails.status === 'NOT_DUPLICATE' ? 'bg-green-100 text-green-800' :
            caseDetails.status === 'UNDER_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {caseDetails.status}
          </span>
        </h1>
        <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
          <span>Matched on:</span>
          {signals.map((s: string) => (
            <span key={s} className="bg-gray-100 border text-gray-700 px-2 py-0.5 rounded font-mono text-xs">{s}</span>
          ))}
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderProfileColumn(profileA, 'Profile A (Primary Record)')}
        {renderProfileColumn(profileB, 'Profile B (Suspected Duplicate)')}
      </div>

      {/* Admin Action Box */}
      <div className="bg-white p-6 rounded-lg border shadow-sm mt-6">
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
              <option value="CONFIRMED_DUPLICATE">Confirmed Duplicate (Linked)</option>
              <option value="NOT_DUPLICATE">Not Duplicate (Resolved)</option>
              <option value="DISMISSED">Dismissed (False Positive)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Review Notes</label>
            <textarea 
              className="w-full border rounded-md p-3 text-sm h-32"
              placeholder="Enter rationale..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            ></textarea>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t mt-4">
            <div className="text-xs text-gray-500 mt-2">
              {caseDetails.reviewed_by ? `Last reviewed by ${caseDetails.reviewer_name || caseDetails.reviewed_by} on ${new Date(caseDetails.updated_at).toLocaleString()}` : 'Never reviewed.'}
              {caseDetails.risk_flag_id && <div className="mt-1">Linked to Risk Anomaly: {caseDetails.risk_flag_id}</div>}
            </div>
            <button 
              onClick={handleUpdate} 
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 mt-2"
            >
              {saving ? 'Saving...' : 'Save Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
