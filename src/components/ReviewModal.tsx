'use client';
import React, { useState } from 'react';

export default function ReviewModal({ bookingId, vendorId, onClose, onSuccess }: { bookingId: string, vendorId: string, onClose: () => void, onSuccess: () => void }) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment })
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
        <h3 style={{ color: '#e5c158', fontSize: '20px', marginBottom: '16px' }}>Write a Review</h3>
        {error && <div style={{ color: '#ff6b9d', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#a0aec0', marginBottom: '8px' }}>Rating (1-5)</label>
            <input type="number" min="1" max="5" value={rating} onChange={e => setRating(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#031710', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} required />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#a0aec0', marginBottom: '8px' }}>Your Experience</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#031710', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} required />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', background: '#e5c158', color: '#031710', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              {loading ? 'Submitting...' : 'Submit Review'}
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
