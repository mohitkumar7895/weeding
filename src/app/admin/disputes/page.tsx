'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminDisputesList() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: '',
    escalated: false,
    overdue: false
  });

  const router = useRouter();

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.type) queryParams.set('type', filters.type);
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.escalated) queryParams.set('escalated', 'true');
      if (filters.overdue) queryParams.set('overdue', 'true');

      const res = await fetch(`/api/admin/disputes?${queryParams.toString()}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setDisputes(data.disputes);
      } else {
        setError(data.error || 'Failed to fetch disputes');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFilters({ ...filters, [e.target.name]: value });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Disputes & Chargebacks</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="ID, Customer, Vendor..."
            className="border rounded-md px-3 py-2 w-64"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select name="type" value={filters.type} onChange={handleFilterChange} className="border rounded-md px-3 py-2">
            <option value="">All Types</option>
            <option value="DISPUTE">Dispute</option>
            <option value="CHARGEBACK">Chargeback</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange} className="border rounded-md px-3 py-2">
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="EVIDENCE_REQUIRED">Evidence Required</option>
            <option value="ESCALATED">Escalated</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            name="escalated"
            id="escalatedFilter"
            checked={filters.escalated}
            onChange={handleFilterChange}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="escalatedFilter" className="text-sm font-medium text-gray-700">Escalated Only</label>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            name="overdue"
            id="overdueFilter"
            checked={filters.overdue}
            onChange={handleFilterChange}
            className="rounded text-red-600 focus:ring-red-500"
          />
          <label htmlFor="overdueFilter" className="text-sm font-medium text-gray-700">Overdue Only</label>
        </div>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {/* List */}
      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID / Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking / Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer / Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status / Resp.</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td>
              </tr>
            ) : disputes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No cases found.</td>
              </tr>
            ) : (
              disputes.map((dispute) => (
                <tr key={dispute.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{dispute.id.substring(0, 8)}...</div>
                    <div className="text-sm text-gray-500">{new Date(dispute.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${dispute.type === 'CHARGEBACK' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {dispute.type || 'DISPUTE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{dispute.booking_number || 'N/A'}</div>
                    <div className="text-sm text-gray-500">₹{dispute.amount || '0.00'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{dispute.customer_name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{dispute.vendor_name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{dispute.status}</div>
                    <div className="text-xs text-gray-500">{dispute.responsibility || 'UNDETERMINED'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/admin/disputes/${dispute.id}`} className="text-indigo-600 hover:text-indigo-900">
                      View
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
