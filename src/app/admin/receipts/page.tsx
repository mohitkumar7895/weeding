'use client';

import React, { useEffect, useState } from 'react';

export default function AdminReceiptsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/receipts');
      const data = await res.json();
      if (data.success) setRows(data.data || data.receipts || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payment receipts</h1>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left">Reference</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? <tr><td className="p-4" colSpan={4}>Loading...</td></tr> : rows.map((r: any) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-mono text-xs">{r.receipt_reference}</td>
                <td className="px-4 py-2">₹{parseFloat(r.amount || 0).toLocaleString()}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2 text-xs">{r.payment_date || r.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
