'use client';

import React, { useEffect, useState } from 'react';

type InterestRow = {
  id: string;
  status: string;
  peer_name: string;
  peer_user_id: string;
  from_user_id: string;
  to_user_id: string;
  to_profile_id?: string;
  from_profile_id?: string;
  photo_url?: string;
};

export default function CustomerInterestsSection({
  onOpenChat,
}: {
  onOpenChat?: (peerUserId: string) => void;
}) {
  const [sent, setSent] = useState<InterestRow[]>([]);
  const [received, setReceived] = useState<InterestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/matrimonial/interests');
    const data = await res.json();
    if (data.success) {
      setSent(data.sent || []);
      setReceived(data.received || []);
    } else {
      setMessage(data.message || 'Could not load interests');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: 'ACCEPTED' | 'DECLINED') => {
    const res = await fetch(`/api/matrimonial/interests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setMessage(data.message || (data.success ? `Interest ${status.toLowerCase()}` : 'Update failed'));
    if (data.success) load();
  };

  const card = (row: InterestRow, incoming: boolean) => (
    <div
      key={row.id}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(229,193,88,0.18)',
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontWeight: 700, color: '#fff' }}>{row.peer_name}</div>
        <div style={{ fontSize: 12, color: '#9cb1a6', marginTop: 4 }}>{row.status}</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {incoming && row.status === 'PENDING' && (
          <>
            <button
              type="button"
              onClick={() => updateStatus(row.id, 'ACCEPTED')}
              style={{ padding: '8px 12px', borderRadius: 999, border: 'none', background: '#e6005c', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => updateStatus(row.id, 'DECLINED')}
              style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer' }}
            >
              Decline
            </button>
          </>
        )}
        {row.status === 'ACCEPTED' && onOpenChat && (
          <button
            type="button"
            onClick={() => onOpenChat(row.peer_user_id)}
            style={{ padding: '8px 12px', borderRadius: 999, border: 'none', background: '#e5c158', color: '#031710', cursor: 'pointer', fontWeight: 700 }}
          >
            Chat
          </button>
        )}
      </div>
    </div>
  );

  if (loading) return <p style={{ color: '#9cb1a6' }}>Loading interests…</p>;

  return (
    <div>
      <h2 style={{ color: '#e5c158', marginBottom: 8 }}>Interests</h2>
      {message && <p style={{ color: '#fae8a4' }}>{message}</p>}
      <h3 style={{ marginTop: 24 }}>Received</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {received.length ? received.map((row) => card(row, true)) : <p style={{ color: '#9cb1a6' }}>No incoming interests yet.</p>}
      </div>
      <h3 style={{ marginTop: 28 }}>Sent</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {sent.length ? sent.map((row) => card(row, false)) : <p style={{ color: '#9cb1a6' }}>You have not sent any interests yet.</p>}
      </div>
    </div>
  );
}
