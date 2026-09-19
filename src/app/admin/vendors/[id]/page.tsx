'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AdminVendorDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(\`/api/admin/vendors/\${id}\`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData.data);
      } else {
        setError(resData.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleAction = async (url: string, payload: any) => {
    if (!confirm('Are you sure you want to perform this action?')) return;
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      if (resData.success) {
        alert('Action successful');
        fetchDetail(); // Refresh data
      } else {
        alert('Error: ' + resData.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading vendor details...</div>;
  if (error) return <div className="p-8 text-red-500 bg-red-50 rounded-lg">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-800 mb-2">&larr; Back to vendors</button>
          <h1 className="text-3xl font-bold text-slate-900">{data.business_name}</h1>
          <p className="text-slate-600">Owner: {data.owner_name} ({data.owner_email}) | City: {data.city}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={\`px-3 py-1 rounded-full text-sm font-semibold \${data.verification_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}\`}>
            {data.verification_status}
          </span>
          <div className="flex gap-2 mt-2">
            {data.verification_status !== 'VERIFIED' && (
              <button onClick={() => handleAction(\`/api/admin/vendors/\${id}/badge\`, { action: 'GRANT' })} className="bg-emerald-600 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700">Grant Verified Badge</button>
            )}
            {data.verification_status === 'VERIFIED' && (
              <button onClick={() => handleAction(\`/api/admin/vendors/\${id}/badge\`, { action: 'SUSPEND' })} className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700">Suspend Badge</button>
            )}
            <button onClick={() => handleAction(\`/api/admin/vendors/\${id}/badge\`, { action: 'REMOVE' })} className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">Reject Vendor</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: KYC & Onboarding */}
        <div className="lg:col-span-1 space-y-8">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">KYC Documents</h2>
            {data.documents.length === 0 ? <p className="text-sm text-slate-500">No documents submitted.</p> : (
              <div className="space-y-4">
                {data.documents.map((doc: any) => (
                  <div key={doc.id} className="border border-slate-100 p-3 rounded-lg bg-slate-50">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold text-slate-700">{doc.doc_type}</span>
                      <span className={\`text-xs px-2 py-1 rounded \${doc.verification_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : doc.verification_status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}\`}>{doc.verification_status}</span>
                    </div>
                    {doc.document_number && <p className="text-xs text-slate-500 mb-1">No: {doc.document_number}</p>}
                    {doc.file_url !== 'REDACTED' ? (
                      <a href={doc.file_url} target="_blank" className="text-blue-600 text-xs hover:underline block mb-3">View Document &#8599;</a>
                    ) : (
                      <p className="text-xs text-slate-400 italic mb-3">Document Redacted (RBAC)</p>
                    )}
                    
                    {doc.verification_status === 'PENDING' && doc.file_url !== 'REDACTED' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(\`/api/admin/vendors/\${id}/documents/\${doc.id}\`, { verification_status: 'VERIFIED' })} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200">Approve</button>
                        <button onClick={() => {
                          const reason = prompt('Rejection reason:');
                          if (reason) handleAction(\`/api/admin/vendors/\${id}/documents/\${doc.id}\`, { verification_status: 'REJECTED', rejection_reason: reason });
                        }} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Reject</button>
                      </div>
                    )}
                    {doc.rejection_reason && <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">Reason: {doc.rejection_reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Booking Performance</h2>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-600">Total Bookings</span><span className="font-bold">{data.performance?.total_bookings || 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Confirmed/Completed</span><span className="font-bold text-emerald-600">{data.performance?.confirmed_bookings || 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Cancelled</span><span className="font-bold text-red-600">{data.performance?.cancelled_bookings || 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Revenue Generated</span><span className="font-bold text-blue-600">₹{parseFloat(data.performance?.total_revenue || 0).toLocaleString()}</span></div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Content Moderation */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Content Moderation</h2>
            
            <h3 className="font-semibold text-slate-700 mt-4 mb-2">Services ({data.services.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {data.services.map((s: any) => (
                <div key={s.id} className="border border-slate-200 rounded p-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-800">{s.title}</span>
                    <span className="text-xs px-2 py-1 rounded bg-slate-100">{s.moderation_status}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">₹{parseFloat(s.starting_price).toLocaleString()}</p>
                  {s.moderation_status === 'PENDING_REVIEW' && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => handleAction(\`/api/admin/vendors/\${id}/moderation\`, { resource_type: 'service', resource_id: s.id, moderation_status: 'APPROVED' })} className="text-xs text-blue-600 font-medium">Approve</button>
                      <button onClick={() => handleAction(\`/api/admin/vendors/\${id}/moderation\`, { resource_type: 'service', resource_id: s.id, moderation_status: 'REJECTED' })} className="text-xs text-red-600 font-medium">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-slate-700 mt-4 mb-2">Packages ({data.packages.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {data.packages.map((p: any) => (
                <div key={p.id} className="border border-slate-200 rounded p-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-800">{p.name}</span>
                    <span className="text-xs px-2 py-1 rounded bg-slate-100">{p.moderation_status}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">₹{parseFloat(p.price).toLocaleString()} (Cap: {p.guest_capacity})</p>
                  {p.moderation_status === 'PENDING_REVIEW' && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => handleAction(\`/api/admin/vendors/\${id}/moderation\`, { resource_type: 'package', resource_id: p.id, moderation_status: 'APPROVED' })} className="text-xs text-blue-600 font-medium">Approve</button>
                      <button onClick={() => handleAction(\`/api/admin/vendors/\${id}/moderation\`, { resource_type: 'package', resource_id: p.id, moderation_status: 'REJECTED' })} className="text-xs text-red-600 font-medium">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-slate-700 mt-4 mb-2">Portfolio Items ({data.portfolios.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.portfolios.map((p: any) => (
                <div key={p.id} className="border border-slate-200 rounded overflow-hidden">
                  <img src={p.image_url} alt={p.caption} className="w-full h-32 object-cover bg-slate-100" />
                  <div className="p-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold">{p.is_cover ? 'Cover' : 'Gallery'}</span>
                      <span className="text-[10px] px-1 bg-slate-200 rounded">{p.moderation_status}</span>
                    </div>
                    {p.moderation_status === 'PENDING_REVIEW' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(\`/api/admin/vendors/\${id}/moderation\`, { resource_type: 'portfolio', resource_id: p.id, moderation_status: 'APPROVED' })} className="text-xs text-blue-600">Approve</button>
                        <button onClick={() => handleAction(\`/api/admin/vendors/\${id}/moderation\`, { resource_type: 'portfolio', resource_id: p.id, moderation_status: 'REJECTED' })} className="text-xs text-red-600">Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
