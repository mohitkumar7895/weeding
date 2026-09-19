'use client';
import React, { useState, useEffect } from 'react';

export default function CancellationModal({ bookingId, onClose, onSuccess }: { bookingId: string, onClose: () => void, onSuccess: () => void }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch preview on mount
    fetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preview: true })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setPreviewData(data.preview);
        } else {
          setError(data.message);
        }
      })
      .catch(e => setError(e.message));
  }, [bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#0a251b', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', border: '1px solid rgba(229,193,88,0.3)' }}>
        <h3 style={{ color: '#e5c158', fontSize: '20px', marginBottom: '16px' }}>Cancel Booking</h3>
        
        {error ? (
          <div style={{ color: '#ff6b9d', marginBottom: '12px', fontSize: '14px' }}>{error}</div>
        ) : !previewData ? (
          <div style={{ color: '#a0aec0', marginBottom: '12px', fontSize: '14px' }}>Calculating cancellation terms...</div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
             <p style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '8px' }}>Based on the cancellation policy ({previewData.daysBeforeEvent} days before event):</p>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#fff' }}>Paid Amount:</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>₹{previewData.paidAmount}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#ff6b9d' }}>Penalty ({previewData.penaltyPercentage}%):</span>
                <span style={{ color: '#ff6b9d', fontWeight: 'bold' }}>₹{previewData.calculatedPenalty}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: '#48bb78' }}>Eligible Refund:</span>
                <span style={{ color: '#48bb78', fontWeight: 'bold' }}>₹{previewData.calculatedRefund}</span>
             </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#a0aec0', marginBottom: '8px' }}>Reason for Cancellation</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#031710', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} required />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" disabled={loading || !previewData} style={{ flex: 1, padding: '12px', background: '#e6005c', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: (loading || !previewData) ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Processing...' : 'Confirm Cancellation'}
            </button>
            <button type="button" onClick={onClose} style={{ padding: '12px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer' }}>
              Keep Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
