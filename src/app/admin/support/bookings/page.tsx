'use client';

import { useEffect, useState } from 'react';

function pillClass(status: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'DISPUTED' || s === 'CANCELLED') return 'support-pill bad';
  if (s === 'CONFIRMED' || s === 'COMPLETED') return 'support-pill ok';
  if (s.includes('REFUND')) return 'support-pill warn';
  return 'support-pill pending';
}

export default function SupportBookingsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/support/bookings?${params.toString()}`, { credentials: 'include' });
    const json = await res.json();
    if (json.success) setRows(json.bookings || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="support-hero">
        <div>
          <p className="support-kicker">Customer assistance</p>
          <h1>Booking Assistance</h1>
          <p>Look up booking status to help customers. Commission and payout amounts are not shown here.</p>
        </div>
        <span className="support-hero-chip">{rows.length} shown</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="support-toolbar"
      >
        <div>
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="REQUESTED">Requested</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DISPUTED">Disputed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUND_PENDING">Refund pending</option>
          </select>
        </div>
        <div className="grow">
          <label>Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Booking no, customer, vendor"
          />
        </div>
        <button type="submit" className="support-btn">Search</button>
      </form>
      <div className="support-panel">
        <table>
          <thead>
            <tr>
              <th>Booking</th>
              <th>Customer</th>
              <th>Vendor</th>
              <th>Event</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="support-empty">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="support-empty">No bookings found.</td></tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.booking_number || b.id}</td>
                  <td>
                    {b.customer_name}
                    <div className="text-xs text-slate-500">{b.customer_email}</div>
                  </td>
                  <td>{b.vendor_name || '—'}</td>
                  <td>{b.event_date ? new Date(b.event_date).toLocaleDateString() : '—'}</td>
                  <td><span className={pillClass(b.status)}>{b.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
