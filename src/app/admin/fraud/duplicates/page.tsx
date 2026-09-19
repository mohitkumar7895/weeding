'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDuplicateDashboard() {
  const [cases, setCases] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filterStatus, setFilterStatus] = useState('');

  const router = useRouter();

  const fetchCases = async () => {
    setLoading(true);
    try {
      let query = '';
      if (filterStatus) query = `?status=${filterStatus}`;

      const res = await fetch(`/api/admin/fraud/duplicates${query}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setCases(data.cases);
        if (!filterStatus) {
          setSummary(data.summary);
        }
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [filterStatus]);

  if (loading && !summary) return <div className="p-6 text-center text-gray-500">Loading Duplicate Cases...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">Duplicate Profile Detection</h1>
        <p className="text-sm text-gray-500 mt-1">Review potentially duplicate matrimonial profiles detected by deterministic signals.</p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Open</h3>
            <div className="text-xl font-bold text-red-600 mt-1">{summary.OPEN}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Under Review</h3>
            <div className="text-xl font-bold text-yellow-600 mt-1">{summary.UNDER_REVIEW}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Confirmed</h3>
            <div className="text-xl font-bold text-indigo-600 mt-1">{summary.CONFIRMED_DUPLICATE}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Not Duplicate</h3>
            <div className="text-xl font-bold text-green-600 mt-1">{summary.NOT_DUPLICATE}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Dismissed</h3>
            <div className="text-xl font-bold text-gray-400 mt-1">{summary.DISMISSED}</div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <select 
          className="border rounded px-3 py-2 text-sm bg-white min-w-[200px]"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="CONFIRMED_DUPLICATE">Confirmed Duplicate</option>
          <option value="NOT_DUPLICATE">Not Duplicate (Resolved)</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>

      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Profile A (Primary)</th>
              <th className="px-6 py-3 text-left">Profile B (Suspect)</th>
              <th className="px-6 py-3 text-left">Matched Signals</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100 text-sm">
            {cases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No duplicate cases found.
                </td>
              </tr>
            ) : (
              cases.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                    {new Date(c.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{c.p1_first} {c.p1_last}</div>
                    <div className="font-mono text-[10px] text-gray-400 mt-1">...{c.primary_profile_id.substring(28)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{c.p2_first} {c.p2_last}</div>
                    <div className="font-mono text-[10px] text-gray-400 mt-1">...{c.suspected_duplicate_id.substring(28)}</div>
                  </td>
                  <td className="px-6 py-4">
                    {JSON.parse(c.detection_signals).map((s: string) => (
                      <span key={s} className="inline-block bg-gray-100 text-gray-700 text-[10px] px-2 py-1 rounded mr-1 mb-1 font-mono">
                        {s}
                      </span>
                    ))}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                      c.status === 'OPEN' ? 'bg-red-100 text-red-800' :
                      c.status === 'CONFIRMED_DUPLICATE' ? 'bg-indigo-100 text-indigo-800' :
                      c.status === 'NOT_DUPLICATE' ? 'bg-green-100 text-green-800' :
                      c.status === 'UNDER_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/fraud/duplicates/${c.id}`} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                      Review Pair &rarr;
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
