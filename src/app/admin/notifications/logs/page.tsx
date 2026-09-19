'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminNotificationLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState({
    eventType: '',
    channel: '',
    status: '',
    search: ''
  });

  const router = useRouter();

  const buildQueryString = (page = 1) => {
    const p = new URLSearchParams();
    if (filters.eventType) p.set('eventType', filters.eventType);
    if (filters.channel) p.set('channel', filters.channel);
    if (filters.status) p.set('status', filters.status);
    if (filters.search) p.set('search', filters.search);
    p.set('page', page.toString());
    p.set('limit', pagination.limit.toString());
    return p.toString();
  };

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const query = buildQueryString(page);
      const res = await fetch(`/api/admin/notifications/logs?${query}`);
      
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setPagination(data.pagination);
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
    fetchLogs(1);
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleRetry = async (logId: string) => {
    if (!confirm('Are you sure you want to retry this notification?')) return;
    
    try {
      const res = await fetch(`/api/admin/notifications/logs/${logId}/retry`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Retry queued successfully!');
        fetchLogs(pagination.page);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Notification Delivery Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor all outgoing platform communications and manage failures.</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange} className="border rounded-md px-2 py-1.5 w-full text-sm">
            <option value="">All Statuses</option>
            <option value="QUEUED">QUEUED</option>
            <option value="SENT">SENT</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="FAILED">FAILED</option>
            <option value="RETRY">RETRY</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
          <select name="channel" value={filters.channel} onChange={handleFilterChange} className="border rounded-md px-2 py-1.5 w-full text-sm">
            <option value="">All Channels</option>
            <option value="EMAIL">EMAIL</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WHATSAPP</option>
            <option value="IN_APP">IN_APP</option>
            <option value="PUSH">PUSH</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Event Type</label>
          <input type="text" name="eventType" value={filters.eventType} onChange={handleFilterChange} placeholder="e.g. BOOKING_CONFIRMED" className="border rounded-md px-2 py-1.5 w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Search Entity/Recipient ID</label>
          <input type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search..." className="border rounded-md px-2 py-1.5 w-full text-sm" />
        </div>
      </div>

      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Date / ID</th>
                <th className="px-4 py-3 text-left">Event / Channel</th>
                <th className="px-4 py-3 text-left">Recipient</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Details</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading Logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No logs found.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{new Date(log.created_at).toLocaleString()}</div>
                      <div className="text-xs text-gray-400 mt-1" title={log.id}>ID: {log.id.substring(0,8)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{log.event_type}</div>
                      <div className="text-xs font-bold text-gray-500 mt-1">{log.channel}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-gray-500">{log.recipient_type}</div>
                      <div className="text-xs text-gray-900 mt-1 truncate max-w-[120px]" title={log.recipient_id}>{log.recipient_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.status === 'DELIVERED' || log.status === 'SENT' ? 'bg-green-100 text-green-800' :
                        log.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        log.status === 'QUEUED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.entity_id && <div className="text-xs text-gray-500">Entity: {log.entity_id.substring(0,8)}</div>}
                      {log.template_version && <div className="text-xs text-gray-500">Tpl v{log.template_version}</div>}
                      {log.failure_reason && <div className="text-xs text-red-500 max-w-xs truncate" title={log.failure_reason}>{log.failure_reason}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {log.status === 'FAILED' && (
                        <button onClick={() => handleRetry(log.id)} className="text-xs font-bold text-indigo-600 hover:text-indigo-900">
                          RETRY
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
            <span className="text-sm text-gray-700">Page {pagination.page} of {pagination.pages}</span>
            <div className="space-x-2">
              <button disabled={pagination.page === 1} onClick={() => fetchLogs(pagination.page - 1)} className="px-3 py-1 border rounded bg-white text-sm disabled:opacity-50">Prev</button>
              <button disabled={pagination.page === pagination.pages} onClick={() => fetchLogs(pagination.page + 1)} className="px-3 py-1 border rounded bg-white text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
