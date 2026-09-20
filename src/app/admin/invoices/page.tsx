'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminInvoicesList() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  const [bookingIdToGenerate, setBookingIdToGenerate] = useState('');
  const [generating, setGenerating] = useState(false);

  const router = useRouter();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.search) queryParams.set('search', filters.search);

      const res = await fetch(`/api/admin/invoices?${queryParams.toString()}`, { credentials: 'include' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
      } else {
        setError(data.error || 'Failed to fetch invoices');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingIdToGenerate) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingIdToGenerate })
      });
      const data = await res.json();
      if (data.success) {
        alert('Invoice generated successfully: ' + data.invoice.invoice_number);
        setBookingIdToGenerate('');
        fetchInvoices();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices & GST</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Generate Invoice Form */}
        <div className="bg-white p-4 rounded-lg shadow-sm border md:col-span-1">
          <h2 className="text-sm font-semibold mb-3">Generate Invoice</h2>
          <form onSubmit={handleGenerateInvoice} className="flex flex-col gap-3">
            <input 
              type="text" 
              placeholder="Enter Booking ID..." 
              value={bookingIdToGenerate}
              onChange={(e) => setBookingIdToGenerate(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
              required
            />
            <button 
              type="submit" 
              disabled={generating || !bookingIdToGenerate}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Invoice'}
            </button>
          </form>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border md:col-span-2 flex flex-wrap gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Invoice #, Customer, Vendor..."
              className="border rounded-md px-3 py-2 w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="border rounded-md px-3 py-2 text-sm w-32">
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {/* List */}
      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice # / Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking / Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer / Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading...</td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No invoices found.</td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{inv.invoice_number}</div>
                    <div className="text-sm text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{inv.booking_number || 'N/A'}</div>
                    <div className="text-sm text-gray-500 font-semibold">₹{inv.total_amount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{inv.customer_name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{inv.vendor_name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inv.status === 'ISSUED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/admin/invoices/${inv.id}`} className="text-indigo-600 hover:text-indigo-900">
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
