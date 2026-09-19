'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminFinancialReports() {
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    vendorId: '',
    status: '',
    search: ''
  });

  const buildQueryString = (page = 1) => {
    const p = new URLSearchParams();
    if (filters.startDate) p.set('startDate', filters.startDate);
    if (filters.endDate) p.set('endDate', filters.endDate);
    if (filters.vendorId) p.set('vendorId', filters.vendorId);
    if (filters.status) p.set('status', filters.status);
    if (filters.search) p.set('search', filters.search);
    p.set('page', page.toString());
    p.set('limit', pagination.limit.toString());
    return p.toString();
  };

  const fetchReports = async (page = 1) => {
    setLoading(true);
    try {
      const query = buildQueryString(page);
      
      const [sumRes, txRes] = await Promise.all([
        fetch(`/api/admin/reports/financial/summary?${query}`),
        fetch(`/api/admin/reports/financial/transactions?${query}`)
      ]);

      if (sumRes.status === 401 || txRes.status === 401) {
        router.push('/admin/login');
        return;
      }

      const sumData = await sumRes.json();
      const txData = await txRes.json();

      if (sumData.success && txData.success) {
        setSummary(sumData.summary);
        setTransactions(txData.transactions);
        setPagination(txData.pagination);
      } else {
        setError(sumData.error || txData.error || 'Failed to fetch reports');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(1);
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleExport = () => {
    const query = buildQueryString(1);
    window.location.href = `/api/admin/reports/financial/export?${query}`;
  };

  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Financial Reports & Reconciliation</h1>
        <button 
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
          <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="border rounded-md px-2 py-1.5 w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
          <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="border rounded-md px-2 py-1.5 w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Reconciliation Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange} className="border rounded-md px-2 py-1.5 w-full text-sm">
            <option value="">All</option>
            <option value="MATCHED">Matched</option>
            <option value="MISMATCH">Mismatch</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Search (Booking, Customer, Vendor, Payment Ref)</label>
          <input type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search..." className="border rounded-md px-2 py-1.5 w-full text-sm" />
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-l-indigo-500">
            <h3 className="text-sm font-medium text-gray-500">Gross Booking Value</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹{summary.gross_booking_value}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-l-green-500">
            <h3 className="text-sm font-medium text-gray-500">Successful Payments</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹{summary.successful_payments}</p>
            <p className="text-xs text-red-500 mt-1">Failed/Pending: ₹{summary.failed_payments}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-l-yellow-500">
            <h3 className="text-sm font-medium text-gray-500">Total Refunds</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹{summary.total_refunds}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-l-blue-500">
            <h3 className="text-sm font-medium text-gray-500">Reconciliation</h3>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div><span className="text-green-600 font-bold">Matched:</span> {summary.reconciliation.MATCHED}</div>
              <div><span className="text-red-600 font-bold">Mismatch:</span> {summary.reconciliation.MISMATCH}</div>
              <div><span className="text-yellow-600 font-bold">Pending:</span> {summary.reconciliation.PENDING_REVIEW}</div>
              <div><span className="text-blue-600 font-bold">Resolved:</span> {summary.reconciliation.RESOLVED}</div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Log */}
      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 font-bold text-gray-700">Unified Transaction Report</div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Booking / Date</th>
                <th className="px-4 py-3 text-left">Parties</th>
                <th className="px-4 py-3 text-right">Gross Amt</th>
                <th className="px-4 py-3 text-left">Payment Status</th>
                <th className="px-4 py-3 text-right">Payout / Refund</th>
                <th className="px-4 py-3 text-left">Recon Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-4 text-center text-gray-500">No transactions found.</td></tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.booking_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/bookings/${tx.booking_id}`} className="font-medium text-indigo-600 hover:underline">{tx.booking_number}</Link>
                      <div className="text-xs text-gray-500 mt-1">{new Date(tx.booking_date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div><span className="text-gray-500 text-xs">C:</span> {tx.customer_name}</div>
                      <div><span className="text-gray-500 text-xs">V:</span> {tx.vendor_name}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ₹{tx.gross_amount}
                    </td>
                    <td className="px-4 py-3">
                      {tx.payment_id ? (
                        <div>
                          <div className={`text-xs font-bold ${tx.payment_status === 'SUCCESS' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {tx.payment_status}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{tx.transaction_ref}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No Payment</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {tx.total_payout_history > 0 && <div className="text-xs text-blue-600 font-medium">Payout: ₹{tx.total_payout_history}</div>}
                      {tx.total_refund > 0 && <div className="text-xs text-orange-600 font-medium">Refund: ₹{tx.total_refund}</div>}
                      {!tx.total_payout_history && !tx.total_refund && <span className="text-gray-300 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tx.reconciliation_status === 'MATCHED' ? 'bg-green-100 text-green-800' : 
                        tx.reconciliation_status === 'MISMATCH' ? 'bg-red-100 text-red-800' :
                        tx.reconciliation_status === 'PENDING_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                        tx.reconciliation_status === 'RESOLVED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {tx.reconciliation_status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium">
                      <Link href={`/admin/reconciliations/${tx.booking_id}?type=booking`} className="text-indigo-600 hover:text-indigo-900 ml-3">Investigate</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
            <span className="text-sm text-gray-700">Page {pagination.page} of {pagination.pages}</span>
            <div className="space-x-2">
              <button 
                disabled={pagination.page === 1}
                onClick={() => fetchReports(pagination.page - 1)}
                className="px-3 py-1 border rounded bg-white text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                disabled={pagination.page === pagination.pages}
                onClick={() => fetchReports(pagination.page + 1)}
                className="px-3 py-1 border rounded bg-white text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
