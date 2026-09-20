'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type CaseRow = {
  id: string;
  category?: string;
  status?: string;
  reporter_name?: string;
  reported_name?: string;
  booking_number?: string;
  reason?: string;
};

export default function SupportCasesPage() {
  const [reports, setReports] = useState<CaseRow[]>([]);
  const [disputes, setDisputes] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/reports', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/admin/disputes', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([reportJson, disputeJson]) => {
        const openReports = ((reportJson.data || []) as CaseRow[]).filter(
          (row) => !['RESOLVED', 'DISMISSED'].includes(row.status || '')
        );
        const openDisputes = ((disputeJson.disputes || []) as CaseRow[]).filter(
          (row) => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(row.status || '')
        );
        setReports(openReports);
        setDisputes(openDisputes);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="support-hero">
        <div>
          <p className="support-kicker">Case queue</p>
          <h1>Support Cases</h1>
          <p>Open abuse/fraud reports and unresolved disputes in one place. Use Reports or Disputes for full detail.</p>
        </div>
        <span className="support-hero-chip">{reports.length + disputes.length} open</span>
      </div>

      {loading ? (
        <p className="support-empty">Loading cases…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="support-panel">
            <div className="support-panel-head">
              <h2>Open reports</h2>
              <Link href="/admin/support/reports">View all</Link>
            </div>
            <CaseList
              rows={reports}
              empty="No open reports."
              href={() => '/admin/support/reports'}
              title={(r: CaseRow) => r.category || 'Report'}
              meta={(r: CaseRow) => `${r.status || ''} · ${r.reporter_name || ''} → ${r.reported_name || ''}`}
            />
          </section>
          <section className="support-panel">
            <div className="support-panel-head">
              <h2>Open disputes</h2>
              <Link href="/admin/disputes">View all</Link>
            </div>
            <CaseList
              rows={disputes}
              empty="No open disputes."
              href={(d: CaseRow) => `/admin/disputes/${d.id}`}
              title={(d: CaseRow) => d.status || 'Dispute'}
              meta={(d: CaseRow) => d.booking_number || d.reason || d.id}
            />
          </section>
        </div>
      )}
    </div>
  );
}

function CaseList({
  rows,
  empty,
  href,
  title,
  meta,
}: {
  rows: CaseRow[];
  empty: string;
  href: (row: CaseRow) => string;
  title: (row: CaseRow) => string;
  meta: (row: CaseRow) => string;
}) {
  if (!rows.length) return <div className="support-empty">{empty}</div>;
  return (
    <div>
      {rows.slice(0, 2).map((row) => (
        <Link key={row.id} href={href(row)} className="support-row">
          <b>{title(row)}</b>
          <small>{meta(row)}</small>
        </Link>
      ))}
    </div>
  );
}
