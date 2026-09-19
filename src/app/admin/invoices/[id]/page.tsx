'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminInvoiceDetail() {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const params = useParams();
  const invoiceId = params.id as string;
  const router = useRouter();

  const fetchInvoiceDetails = async () => {
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setInvoice(data.invoice);
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
    if (invoiceId) {
      fetchInvoiceDetails();
    }
  }, [invoiceId]);

  const handleStatusChange = async (status: string) => {
    if (!confirm(`Are you sure you want to change status to ${status}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        alert('Invoice updated successfully');
        fetchInvoiceDetails();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error updating invoice: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateReceipt = async (paymentId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, invoice_id: invoiceId })
      });
      const data = await res.json();
      if (data.success) {
        alert('Receipt generated successfully: ' + data.receipt.receipt_reference);
        fetchInvoiceDetails();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error generating receipt: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;
  if (error || !invoice) return <div className="p-6 text-center text-red-500">{error || 'Invoice not found'}</div>;

  const cbill = invoice.customer_billing_info || {};
  const vbill = invoice.vendor_billing_info || {};
  const isDraft = invoice.status === 'DRAFT';
  const isIssued = invoice.status === 'ISSUED';
  const isCancelled = invoice.status === 'CANCELLED';

  const hasPayment = !!invoice.payment_id;
  const hasReceipt = invoice.receipts && invoice.receipts.length > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/admin/invoices" className="text-indigo-600 hover:underline mb-2 inline-block">&larr; Back to Invoices</Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Invoice: {invoice.invoice_number}</h1>
            <span className={`px-3 py-1 text-xs rounded-full font-bold ${
              isIssued ? 'bg-green-100 text-green-800' : 
              isCancelled ? 'bg-red-100 text-red-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {invoice.status}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Issued At: {invoice.issued_at ? new Date(invoice.issued_at).toLocaleString() : 'Not Issued'}</p>
        </div>
        
        <div className="flex gap-2">
          {isDraft && (
            <button 
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50"
              onClick={() => handleStatusChange('ISSUED')}
              disabled={actionLoading}
            >
              Issue Invoice
            </button>
          )}
          {isIssued && (
            <button 
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50"
              onClick={() => handleStatusChange('CANCELLED')}
              disabled={actionLoading}
            >
              Cancel Invoice
            </button>
          )}
          <button 
            className="px-4 py-2 bg-white border shadow-sm text-sm font-medium rounded hover:bg-gray-50"
            onClick={() => window.print()}
          >
            Print / PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Document */}
        <div className="lg:col-span-2 bg-white p-8 rounded-lg shadow-sm border">
          {/* Header / Parties */}
          <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Billed To (Customer)</h3>
              <p className="font-medium text-gray-900">{cbill.name}</p>
              <p className="text-sm text-gray-600">{cbill.email}</p>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{cbill.address}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">From (Vendor)</h3>
              <p className="font-medium text-gray-900">{vbill.business_name}</p>
              <p className="text-sm text-gray-600">{vbill.email}</p>
              <p className="text-sm text-gray-600 mt-1">GSTIN: <span className="font-medium">{vbill.gstin}</span></p>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{vbill.address}</p>
            </div>
          </div>

          {/* References */}
          <div className="flex justify-between mb-8 pb-8 border-b">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Booking Ref</h3>
              <p className="font-medium text-gray-900">{invoice.booking_number}</p>
              <p className="text-xs text-gray-500">Status: {invoice.booking_status}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Payment Ref</h3>
              <p className="font-medium text-gray-900">{invoice.payment_ref || 'N/A'}</p>
              <p className="text-xs text-gray-500">Status: {invoice.payment_status || 'N/A'}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Invoice Date</h3>
              <p className="font-medium text-gray-900">{new Date(invoice.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Totals & Taxes */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 text-gray-900 border-b pb-2">Financial Breakdown</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Taxable Amount</span>
                <span className="font-medium">₹{invoice.taxable_amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST Rate</span>
                <span className="font-medium">{invoice.tax_rate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST Amount</span>
                <span className="font-medium">₹{invoice.tax_amount}</span>
              </div>
              
              <div className="pt-3 mt-3 border-t flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Grand Total</span>
                <span className="text-xl font-bold text-indigo-600">₹{invoice.total_amount}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-gray-400">
            <p>This is a computer generated invoice and requires no signature.</p>
            <p>Invoice ID: {invoice.id}</p>
          </div>
        </div>

        {/* Sidebar: Related Records Timeline */}
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-bold mb-4">Receipts</h2>
            {invoice.receipts && invoice.receipts.length > 0 ? (
              <div className="space-y-3">
                {invoice.receipts.map((r: any) => (
                  <div key={r.id} className="p-3 border rounded-md bg-green-50 border-green-100">
                    <p className="font-bold text-green-800 text-sm">{r.receipt_reference}</p>
                    <p className="text-xs text-green-700">Amount: ₹{r.amount}</p>
                    <p className="text-xs text-green-600">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-3">No receipts generated yet.</p>
                {hasPayment && invoice.payment_status === 'SUCCESS' && isIssued && (
                  <button 
                    onClick={() => handleGenerateReceipt(invoice.payment_id)}
                    disabled={actionLoading}
                    className="w-full px-3 py-2 bg-indigo-50 text-indigo-700 font-medium text-sm rounded hover:bg-indigo-100 disabled:opacity-50"
                  >
                    Generate Receipt
                  </button>
                )}
              </div>
            )}
          </div>

          {(invoice.cancellations?.length > 0 || invoice.refunds?.length > 0) && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-bold mb-4">Traceability</h2>
              
              <div className="space-y-4">
                {invoice.cancellations?.map((c: any) => (
                  <div key={c.id} className="p-3 border-l-4 border-yellow-400 bg-yellow-50 rounded-r-md">
                    <p className="font-bold text-yellow-800 text-sm">Booking Cancelled</p>
                    <p className="text-xs text-yellow-700">By {c.cancelled_by_role} • {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
                
                {invoice.refunds?.map((rf: any) => (
                  <div key={rf.id} className="p-3 border-l-4 border-blue-400 bg-blue-50 rounded-r-md">
                    <p className="font-bold text-blue-800 text-sm">Refund {rf.status}</p>
                    <p className="text-xs text-blue-700">Ref: {rf.reference_id || 'N/A'}</p>
                    <p className="text-xs font-semibold text-blue-900">₹{rf.amount}</p>
                    <p className="text-xs text-blue-600">{new Date(rf.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
