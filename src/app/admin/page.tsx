'use client';

import React, { useState, useEffect } from 'react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData.data);
        } else {
          setError(resData.message || 'Failed to fetch dashboard data');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Dashboard Data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500 bg-red-50 rounded-lg border border-red-200">Error: {error}</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* 1. PLATFORM COUNTS */}
      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wider">Platform Counts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-sm font-semibold text-slate-500 uppercase">Total Customers</div>
            <div className="text-3xl font-bold text-slate-800 mt-2">{data.platform_counts.customers}</div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-sm font-semibold text-slate-500 uppercase">Total Vendors</div>
            <div className="text-3xl font-bold text-slate-800 mt-2">{data.platform_counts.vendors}</div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-sm font-semibold text-slate-500 uppercase">Matrimonial Profiles</div>
            <div className="text-3xl font-bold text-slate-800 mt-2">{data.platform_counts.profiles}</div>
          </div>
        </div>
      </section>

      {/* 4. FINANCIAL SUMMARY (Restricted) */}
      {data.financial_summary && (
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wider">Financial Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 shadow-sm">
              <div className="text-sm font-semibold text-emerald-700 uppercase">GMV</div>
              <div className="text-2xl font-bold text-emerald-900 mt-2">₹{data.financial_summary.gmv.toLocaleString()}</div>
            </div>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
              <div className="text-sm font-semibold text-blue-700 uppercase">Commission</div>
              <div className="text-2xl font-bold text-blue-900 mt-2">₹{data.financial_summary.commission.toLocaleString()}</div>
            </div>
            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 shadow-sm">
              <div className="text-sm font-semibold text-orange-700 uppercase">Payouts</div>
              <div className="text-2xl font-bold text-orange-900 mt-2">₹{data.financial_summary.payouts.toLocaleString()}</div>
            </div>
            <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
              <div className="text-sm font-semibold text-red-700 uppercase">Refunds</div>
              <div className="text-2xl font-bold text-red-900 mt-2">₹{data.financial_summary.refunds.toLocaleString()}</div>
            </div>
          </div>
        </section>
      )}

      {/* 2 & 3. RECORD STATUS & BOOKING OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wider">Booking Overview</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-slate-600">Booking Status</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.booking_overview.length === 0 ? (
                  <tr><td colSpan={2} className="px-6 py-4 text-center text-slate-500">No bookings found</td></tr>
                ) : (
                  data.booking_overview.map((b: any) => (
                    <tr key={b.status} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-700">{b.status.replace('_', ' ')}</td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900">{b.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wider">Record Status Summary</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-slate-600">Category</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.record_status.users.map((u: any) => (
                  <tr key={`user-${u.status}`}>
                    <td className="px-6 py-2 text-slate-500">Users</td>
                    <td className="px-6 py-2 font-medium text-slate-700">{u.status}</td>
                    <td className="px-6 py-2 text-right font-bold text-slate-900">{u.count}</td>
                  </tr>
                ))}
                {data.record_status.vendors.map((v: any) => (
                  <tr key={`vendor-${v.verification_status}`}>
                    <td className="px-6 py-2 text-slate-500">Vendors</td>
                    <td className="px-6 py-2 font-medium text-slate-700">{v.verification_status}</td>
                    <td className="px-6 py-2 text-right font-bold text-slate-900">{v.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* 5 & 6. RECENT ACTIVITY & PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wider">Recent Operational Activity</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase">Recent Vendor Registrations</h3>
              {data.recent_activity.registrations.length === 0 ? <p className="text-sm text-slate-400">No recent registrations</p> : (
                <ul className="space-y-2">
                  {data.recent_activity.registrations.map((v: any) => (
                    <li key={v.id} className="text-sm text-slate-700 flex justify-between">
                      <span>{v.name} ({v.email})</span>
                      <span className="text-slate-400">{new Date(v.created_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase">Recent Disputes</h3>
              {data.recent_activity.disputes.length === 0 ? <p className="text-sm text-slate-400">No open disputes</p> : (
                <ul className="space-y-2">
                  {data.recent_activity.disputes.map((d: any) => (
                    <li key={d.id} className="text-sm text-slate-700 flex justify-between">
                      <span>Booking: {d.booking_id.substring(0,8)}... - <span className="font-semibold text-red-600">{d.status}</span></span>
                      <span className="text-slate-400">{new Date(d.created_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase">Recent Fraud Alerts</h3>
              {data.recent_activity.alerts.length === 0 ? <p className="text-sm text-slate-400">No fraud alerts</p> : (
                <ul className="space-y-2">
                  {data.recent_activity.alerts.map((a: any) => (
                    <li key={a.id} className="text-sm text-slate-700 flex justify-between">
                      <span>{a.entity_type}: {a.flag_reason} <span className="px-2 py-0.5 ml-2 bg-orange-100 text-orange-800 rounded text-xs">{a.severity}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wider">Performance Summaries</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 mb-4 uppercase">Customer Funnel</h3>
              {data.performance.funnel.length === 0 ? <p className="text-sm text-slate-400">No funnel data available</p> : (
                <div className="space-y-3">
                  {data.performance.funnel.slice(0, 5).map((f: any, i: number) => {
                    const max = data.performance.funnel[0].completions;
                    const percent = (f.completions / max) * 100;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">{f.step_name} ({f.funnel_type})</span>
                          <span className="text-slate-500">{f.completions}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: \`\${percent}%\` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-500 mb-4 uppercase">Top Cities (Profiles)</h3>
              {data.performance.cities.length === 0 ? <p className="text-sm text-slate-400">No city data available</p> : (
                <div className="space-y-3">
                  {data.performance.cities.map((c: any, i: number) => {
                    const max = data.performance.cities[0].profile_count;
                    const percent = (c.profile_count / max) * 100;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">{c.city}</span>
                          <span className="text-slate-500">{c.profile_count}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full" style={{ width: \`\${percent}%\` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
