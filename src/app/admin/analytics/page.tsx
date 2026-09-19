'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAnalyticsDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [customers, setCustomers] = useState<any>(null);
  const [vendors, setVendors] = useState<any>(null);
  const [financials, setFinancials] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date filters
  const [dateRange, setDateRange] = useState('ALL_TIME');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const router = useRouter();

  const fetchAnalytics = async () => {
    setLoading(true);
    let query = '';
    if (startDate && endDate) {
      query = `?startDate=${startDate} 00:00:00&endDate=${endDate} 23:59:59`;
    }

    try {
      const [overviewRes, customersRes, vendorsRes, financialsRes, performanceRes] = await Promise.all([
        fetch(`/api/admin/analytics/overview${query}`),
        fetch(`/api/admin/analytics/customers${query}`),
        fetch(`/api/admin/analytics/vendors${query}`),
        fetch(`/api/admin/analytics/financials${query}`),
        fetch(`/api/admin/analytics/performance${query}`)
      ]);

      if (overviewRes.status === 401 || overviewRes.status === 403) {
        router.push('/admin/login');
        return;
      }

      const [overviewData, customersData, vendorsData, financialsData, performanceData] = await Promise.all([
        overviewRes.json(),
        customersRes.json(),
        vendorsRes.json(),
        financialsRes.json(),
        performanceRes.json()
      ]);

      if (overviewData.success) setOverview(overviewData.data);
      if (customersData.success) setCustomers(customersData.data);
      if (vendorsData.success) setVendors(vendorsData.data);
      if (financialsData.success) setFinancials(financialsData.data);
      if (performanceData.success) setPerformance(performanceData.data);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const handleDateChange = (val: string) => {
    setDateRange(val);
    if (val === 'ALL_TIME') {
      setStartDate('');
      setEndDate('');
    } else {
      const end = new Date();
      const start = new Date();
      if (val === '7D') start.setDate(start.getDate() - 7);
      if (val === '30D') start.setDate(start.getDate() - 30);
      if (val === '1Y') start.setFullYear(start.getFullYear() - 1);
      
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  if (loading && !overview) return <div className="p-6 text-center text-gray-500">Loading Analytics...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Platform Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time platform metrics aggregated from the database.</p>
        </div>
        <div className="flex gap-4">
          <select 
            className="border rounded px-3 py-2 text-sm bg-white"
            value={dateRange}
            onChange={(e) => handleDateChange(e.target.value)}
          >
            <option value="ALL_TIME">All Time</option>
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
            <option value="1Y">Last Year</option>
          </select>
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Users</h3>
            <div className="text-2xl font-bold text-gray-900">{overview.totalUsers.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Vendors</h3>
            <div className="text-2xl font-bold text-gray-900">{overview.totalVendors.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Bookings</h3>
            <div className="text-2xl font-bold text-gray-900">{overview.totalBookings.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Gross Booking Value</h3>
            <div className="text-2xl font-bold text-green-600">${Number(overview.grossBookingValue).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Customer Funnel */}
        {customers && (
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-bold mb-4">Customer Funnel</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-600 font-medium">1. Registrations</span>
                <span className="font-bold">{customers.registrations}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-600 font-medium">2. Profiles Created</span>
                <span className="font-bold">{customers.profilesCompleted}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-600 font-medium">3. Shortlist Actions</span>
                <span className="font-bold">{customers.shortlistActions}</span>
              </div>
            </div>
          </div>
        )}

        {/* Vendor Funnel */}
        {vendors && (
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-bold mb-4">Vendor Pipeline</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border-l-4 border-yellow-400">
                <span className="text-gray-600 font-medium">Pending Approvals</span>
                <span className="font-bold">{vendors.statuses['PENDING'] || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border-l-4 border-green-400">
                <span className="text-gray-600 font-medium">Approved</span>
                <span className="font-bold">{vendors.statuses['APPROVED'] || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border-l-4 border-blue-400">
                <span className="text-gray-600 font-medium">Verified Accounts</span>
                <span className="font-bold">{vendors.verified}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border-l-4 border-purple-400">
                <span className="text-gray-600 font-medium">Total Active Services</span>
                <span className="font-bold">{vendors.totalServices}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Overview (Requires Access) */}
      {financials && financials.payments && (
        <div className="bg-white p-6 rounded-lg border shadow-sm mt-6">
          <h2 className="text-lg font-bold mb-4">Financial Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded text-center">
              <p className="text-sm text-gray-500 mb-1">Total Commission</p>
              <p className="text-xl font-bold text-gray-900">${Number(financials.totalCommission).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded text-center">
              <p className="text-sm text-gray-500 mb-1">Completed Payouts</p>
              <p className="text-xl font-bold text-gray-900">${Number(financials.payouts.total).toLocaleString()} ({financials.payouts.count})</p>
            </div>
            <div className="p-4 bg-gray-50 rounded text-center">
              <p className="text-sm text-gray-500 mb-1">Completed Refunds</p>
              <p className="text-xl font-bold text-gray-900">${Number(financials.refunds.total).toLocaleString()} ({financials.refunds.count})</p>
            </div>
            <div className="p-4 bg-gray-50 rounded text-center">
              <p className="text-sm text-gray-500 mb-1">Open Disputes</p>
              <p className="text-xl font-bold text-red-600">${Number(financials.activeDisputes.total).toLocaleString()} ({financials.activeDisputes.count})</p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tables */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50"><h2 className="font-bold">Top Cities (by Vendors)</h2></div>
            <table className="min-w-full">
              <tbody className="divide-y divide-gray-100 text-sm">
                {performance.topCities.length === 0 ? (
                  <tr><td className="p-4 text-center text-gray-500">No data available.</td></tr>
                ) : (
                  performance.topCities.map((c: any, i: number) => (
                    <tr key={i}>
                      <td className="px-6 py-3">{c.city || 'Unknown'}</td>
                      <td className="px-6 py-3 text-right font-medium">{c.vendor_count} Vendors</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50"><h2 className="font-bold">Top Categories (by Services)</h2></div>
            <table className="min-w-full">
              <tbody className="divide-y divide-gray-100 text-sm">
                {performance.topCategories.length === 0 ? (
                  <tr><td className="p-4 text-center text-gray-500">No data available.</td></tr>
                ) : (
                  performance.topCategories.map((c: any, i: number) => (
                    <tr key={i}>
                      <td className="px-6 py-3">{c.category || 'Unknown'}</td>
                      <td className="px-6 py-3 text-right font-medium">{c.service_count} Services</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
