'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminDisputeDetail() {
  const [dispute, setDispute] = useState<any>(null);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [statusUpdate, setStatusUpdate] = useState('');
  const [responsibilityUpdate, setResponsibilityUpdate] = useState('');
  const [resolutionUpdate, setResolutionUpdate] = useState('');

  // 10B State
  const [internalNotes, setInternalNotes] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [resolutionReason, setResolutionReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [relatedFinancialRef, setRelatedFinancialRef] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const params = useParams();
  const disputeId = params.id as string;
  const router = useRouter();

  const fetchDisputeDetails = async () => {
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        const d = data.dispute;
        setDispute(d);
        setStatusUpdate(d.status);
        setResponsibilityUpdate(d.responsibility);
        setResolutionUpdate(d.resolution || '');
        setInternalNotes(d.internal_notes || '');
        setEscalationReason(d.escalation_reason || '');
        setResolutionReason(d.resolution_reason || '');
        setResolutionNotes(d.resolution_notes || '');
        setRelatedFinancialRef(d.related_financial_ref || '');
        setDeadlineDate(d.deadline_date ? d.deadline_date.substring(0, 10) : '');
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchEvidence = async () => {
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/evidence`);
      const data = await res.json();
      if (data.success) {
        setEvidenceList(data.evidence);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (disputeId) {
      Promise.all([fetchDisputeDetails(), fetchEvidence()]).then(() => setLoading(false));
    }
  }, [disputeId]);

  const handleUpdate = async (overrides: any = {}) => {
    try {
      const payload = {
        status: statusUpdate,
        responsibility: responsibilityUpdate,
        resolution: resolutionUpdate,
        internal_notes: internalNotes,
        escalation_reason: escalationReason,
        resolution_reason: resolutionReason,
        resolution_notes: resolutionNotes,
        related_financial_ref: relatedFinancialRef,
        deadline_date: deadlineDate || null,
        ...overrides
      };

      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Dispute updated successfully');
        fetchDisputeDetails();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error updating dispute: ' + err.message);
    }
  };

  const handleEvidenceUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', description);

      const res = await fetch(`/api/admin/disputes/${disputeId}/evidence`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (data.success) {
        alert('Evidence uploaded successfully');
        setFile(null);
        setDescription('');
        fetchEvidence();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error uploading evidence: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;
  if (error || !dispute) return <div className="p-6 text-center text-red-500">{error || 'Dispute not found'}</div>;

  const isResolved = dispute.status === 'RESOLVED' || dispute.status === 'REJECTED' || dispute.status === 'CLOSED';
  const isOverdue = dispute.deadline_date && new Date(dispute.deadline_date) < new Date() && !isResolved;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/admin/disputes" className="text-indigo-600 hover:underline mb-2 inline-block">&larr; Back to List</Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Case #{dispute.id.substring(0, 8)}</h1>
            {isOverdue && <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">OVERDUE</span>}
          </div>
          <p className="text-gray-500 text-sm mt-1">Created: {new Date(dispute.created_at).toLocaleString()}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${dispute.type === 'CHARGEBACK' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {dispute.type} - {dispute.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Case Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Reason</p>
                <p className="font-medium">{dispute.reason}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount Under Dispute</p>
                <p className="font-medium text-red-600">₹{dispute.amount || '0.00'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded mt-1">{dispute.description || 'No description provided.'}</p>
              </div>
            </div>

            <div className="mt-6 border-t pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Booking Reference</p>
                <p className="font-medium">{dispute.booking_number} (₹{dispute.booking_amount})</p>
                <p className="text-xs text-gray-500">Status: {dispute.booking_status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Reference</p>
                <p className="font-medium">{dispute.payment_ref || dispute.payment_reference || 'N/A'} (₹{dispute.payment_amount})</p>
                <p className="text-xs text-gray-500">Status: {dispute.payment_status}</p>
              </div>
            </div>

            <div className="mt-6 border-t pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{dispute.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vendor</p>
                <p className="font-medium">{dispute.vendor_name}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Internal Review Notes (Private)</h2>
            <textarea
              className="w-full border rounded-md p-3 text-sm"
              rows={4}
              placeholder="Add internal notes for staff visibility only..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
            <div className="mt-2 text-right">
              <button 
                onClick={() => handleUpdate({})} 
                className="px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
              >
                Save Notes
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Evidence & Documentation</h2>
            
            {!isResolved && (
              <form onSubmit={handleEvidenceUpload} className="mb-6 p-4 border rounded-md bg-gray-50">
                <h3 className="text-sm font-medium mb-3">Upload New Evidence</h3>
                <div className="space-y-3">
                  <input 
                    type="file" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Description / Notes" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                  <button 
                    type="submit" 
                    disabled={uploading || !file}
                    className="px-4 py-2 bg-indigo-600 text-white rounded text-sm disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Evidence'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {evidenceList.length === 0 ? (
                <p className="text-gray-500 text-sm">No evidence uploaded yet.</p>
              ) : (
                evidenceList.map(ev => (
                  <div key={ev.id} className="flex items-start p-3 border rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-600 hover:underline">
                        <a href={ev.file_url} target="_blank" rel="noreferrer">
                          View File ({ev.file_type || 'Unknown Type'})
                        </a>
                      </p>
                      <p className="text-sm text-gray-700 mt-1">{ev.description || 'No description'}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Uploaded by: {ev.uploader_name || ev.uploaded_by_user_id} ({ev.uploader_role || 'ADMIN'}) • {new Date(ev.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Management */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Case Management</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  value={statusUpdate} 
                  onChange={(e) => setStatusUpdate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  disabled={isResolved}
                >
                  <option value="OPEN">Open</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="EVIDENCE_REQUIRED">Evidence Required</option>
                  <option value="ESCALATED">Escalated</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsibility</label>
                <select 
                  value={responsibilityUpdate} 
                  onChange={(e) => setResponsibilityUpdate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  disabled={isResolved}
                >
                  <option value="UNDETERMINED">Undetermined</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="PLATFORM">Platform</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline Date</label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  disabled={isResolved}
                />
              </div>

              {statusUpdate === 'ESCALATED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Escalation Reason</label>
                  <textarea 
                    value={escalationReason} 
                    onChange={(e) => setEscalationReason(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                    rows={2}
                    disabled={isResolved}
                  ></textarea>
                </div>
              )}

              {(statusUpdate === 'RESOLVED' || statusUpdate === 'REJECTED') && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-3">
                  <h3 className="font-medium text-blue-900">Resolution Details</h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                    <input 
                      type="text" 
                      value={resolutionReason} 
                      onChange={(e) => setResolutionReason(e.target.value)}
                      className="w-full border rounded-md px-2 py-1 text-sm"
                      disabled={isResolved && dispute.status === statusUpdate}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <textarea 
                      value={resolutionNotes} 
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full border rounded-md px-2 py-1 text-sm"
                      rows={2}
                      disabled={isResolved && dispute.status === statusUpdate}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Related Financial Ref (e.g. Refund ID)</label>
                    <input 
                      type="text" 
                      value={relatedFinancialRef} 
                      onChange={(e) => setRelatedFinancialRef(e.target.value)}
                      className="w-full border rounded-md px-2 py-1 text-sm"
                      placeholder="Optional refund or txn ID"
                      disabled={isResolved && dispute.status === statusUpdate}
                    />
                  </div>
                </div>
              )}

              {!isResolved && (
                <button 
                  onClick={() => handleUpdate({})}
                  className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
                >
                  Update Case
                </button>
              )}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Status Timeline</h2>
            <div className="space-y-4">
              <div className="flex flex-col gap-2 border-l-2 border-indigo-200 pl-4">
                <div className="text-sm">
                  <span className="font-semibold text-gray-900">Created</span>
                  <p className="text-xs text-gray-500">{new Date(dispute.created_at).toLocaleString()}</p>
                </div>
                {dispute.escalated_at && (
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900">Escalated</span>
                    <p className="text-xs text-gray-500">{new Date(dispute.escalated_at).toLocaleString()}</p>
                    <p className="text-xs text-gray-700 italic">"{dispute.escalation_reason}"</p>
                  </div>
                )}
                {dispute.resolved_at && (
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900">Resolved/Rejected</span>
                    <p className="text-xs text-gray-500">{new Date(dispute.resolved_at).toLocaleString()}</p>
                    <p className="text-xs text-gray-700 italic">"{dispute.resolution_reason}"</p>
                  </div>
                )}
                <div className="text-sm">
                  <span className="font-semibold text-indigo-600">Current Status: {dispute.status}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
