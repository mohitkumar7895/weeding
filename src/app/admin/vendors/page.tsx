'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminVendorsList() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? \`/api/admin/vendors?status=\${statusFilter}\` : '/api/admin/vendors';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setVendors(data.data);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Vendor Management</h1>
        <div className="flex space-x-4">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-slate-300 rounded-md text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <a href="/api/admin/vendors/export" target="_blank" className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-700">
            Export Data
          </a>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-600">Business Name</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Owner</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Category / City</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading vendors...</td></tr>
            ) : vendors.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No vendors found.</td></tr>
            ) : (
              vendors.map(v => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{v.business_name}</div>
                    <div className="text-xs text-slate-500">ID: {v.id.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700">{v.owner_name}</div>
                    <div className="text-xs text-slate-500">{v.owner_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700">{v.category_name}</div>
                    <div className="text-xs text-slate-500">{v.city}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={\`px-2 py-1 rounded text-xs font-medium \${v.verification_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : v.verification_status === 'PENDING' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}\`}>
                      {v.verification_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={\`/admin/vendors/\${v.id}\`} className="text-blue-600 hover:text-blue-800 font-medium">
                      Manage &rarr;
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
