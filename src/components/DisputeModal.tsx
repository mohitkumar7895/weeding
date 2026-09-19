'use client';
import React, { useState } from 'react';

export default function DisputeModal({ bookingId, onClose, onSuccess }: { bookingId: string, onClose: () => void, onSuccess: () => void }) {
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, amount_under_dispute: amount ? Number(amount) : null })
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
      <div style={{ background: '#0a251b', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', border: '1px solid rgba(255,107,157,0.3)' }}>
        <h3 style={{ color: '#ff6b9d', fontSize: '20px', marginBottom: '16px' }}>Raise a Dispute</h3>
        {error && <div style={{ color: '#ff6b9d', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#a0aec0', marginBottom: '8px' }}>Dispute Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Please detail the issue..." style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#031710', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} required />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#a0aec0', marginBottom: '8px' }}>Amount under dispute (Optional)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} placeholder="₹0.00" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#031710', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', background: '#e6005c', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              {loading ? 'Submitting...' : 'Submit Dispute'}
            </button>
            <button type="button" onClick={onClose} style={{ padding: '12px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
