'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SupportDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/support/summary', { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.message || 'Unable to load support summary');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const cards = data
    ? [
        { label: 'Pending reports', value: data.reports.pending, hint: 'Needs first review', href: '/admin/support/reports' },
        { label: 'In review', value: data.reports.investigating, hint: 'Active investigations', href: '/admin/support/reports' },
        { label: 'Resolved reports', value: data.reports.resolved, hint: 'Closed this queue', href: '/admin/support/reports' },
        { label: 'Open disputes', value: data.disputes.open, hint: 'Booking disagreements', href: '/admin/disputes' },
        { label: 'Escalated', value: data.disputes.escalated, hint: 'Needs senior attention', href: '/admin/disputes' },
        { label: 'Booking help', value: data.bookings.needs_attention, hint: 'Cancelled / disputed', href: '/admin/support/bookings' },
        { label: 'Customers', value: data.customers.total, hint: 'Assistance directory', href: '/admin/customers' },
        { label: 'Suspended', value: data.customers.suspended, hint: 'Restricted accounts', href: '/admin/customers' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="support-hero">
        <div>
          <p className="support-kicker">WedWithMe Support</p>
          <h1>Support Console</h1>
          <p>Work cases, customer help, booking issues, reports, and disputes. Finance and role admin stay out of this console.</p>
        </div>
        <span className="support-hero-chip">Operational queue</span>
      </div>

      {loading && <p className="support-empty">Loading operational summary…</p>}
      {error && <div className="p-4 text-red-500 bg-red-50 rounded-lg border">{error}</div>}

      <section className="support-metrics">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="support-metric">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <em>{card.hint}</em>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="support-panel">
          <div className="support-panel-head">
            <h2>Reports needing review</h2>
            <Link href="/admin/support/reports">Open reports</Link>
          </div>
          <QueueList
            rows={data?.queues?.reports || []}
            empty="No open reports."
            href={() => '/admin/support/reports'}
            primary={(row) => row.category}
            secondary={(row) => `${row.reporter_name || 'Reporter'} → ${row.reported_name || 'Profile'}`}
          />
        </section>
        <section className="support-panel">
          <div className="support-panel-head">
            <h2>Open disputes</h2>
            <Link href="/admin/disputes">Open disputes</Link>
          </div>
          <QueueList
            rows={data?.queues?.disputes || []}
            empty="No open disputes."
            href={(row) => `/admin/disputes/${row.id}`}
            primary={(row) => row.status}
            secondary={(row) => row.reason || row.booking_id}
          />
        </section>
        <section className="support-panel">
          <div className="support-panel-head">
            <h2>Booking assistance</h2>
            <Link href="/admin/support/bookings">Open bookings</Link>
          </div>
          <QueueList
            rows={data?.queues?.bookings || []}
            empty="No bookings need attention."
            href={() => '/admin/support/bookings'}
            primary={(row) => row.booking_number || row.id}
            secondary={(row) => `${row.status} · ${row.customer_name || 'Customer'} / ${row.vendor_name || 'Vendor'}`}
          />
        </section>
      </div>
    </div>
  );
}

function QueueList({
  rows,
  empty,
  href,
  primary,
  secondary,
}: {
  rows: any[];
  empty: string;
  href: (row: any) => string;
  primary: (row: any) => string;
  secondary: (row: any) => string;
}) {
  if (!rows.length) return <div className="support-empty">{empty}</div>;
  return (
    <div>
      {rows.map((row) => (
        <Link key={row.id} href={href(row)} className="support-row">
          <b>{primary(row)}</b>
          <small>{secondary(row)}</small>
        </Link>
      ))}
    </div>
  );
}
