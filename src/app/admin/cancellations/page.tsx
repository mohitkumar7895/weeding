'use client';

import React, { useState, useEffect } from 'react';

export default function CancellationsDashboard() {
  const [activeTab, setActiveTab] = useState<'records' | 'rules'>('records');
  const [records, setRecords] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for records
  const [filters, setFilters] = useState({ initiator_role: '', booking_id: '' });

  // New Rule Form
  const [newRule, setNewRule] = useState({
    initiator_role: 'CUSTOMER', days_before_event_min: '', days_before_event_max: '', refund_percentage: '', penalty_percentage: '0'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'records') {
        const params = new URLSearchParams();
        if (filters.initiator_role) params.append('initiator_role', filters.initiator_role);
        if (filters.booking_id) params.append('booking_id', filters.booking_id);
        const res = await fetch(\`/api/admin/cancellations/records?\${params.toString()}\`);
        const data = await res.json();
        if (data.success) setRecords(data.data);
      } else {
        const res = await fetch('/api/admin/cancellations/rules');
        const data = await res.json();
        if (data.success) setRules(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, filters.initiator_role]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/cancellations/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setNewRule({ initiator_role: 'CUSTOMER', days_before_event_min: '', days_before_event_max: '', refund_percentage: '', penalty_percentage: '0' });
        fetchData();
      }
    } catch (e) {
      alert('Error creating rule');
    }
  };

  const toggleRule = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(\`/api/admin/cancellations/rules/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if ((await res.json()).success) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cancellation Management</h1>
          <p className="text-slate-500 text-sm mt-1">Review historical cancellations and manage refund policies.</p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab('records')} className={\`py-4 px-1 border-b-2 font-medium text-sm \${activeTab === 'records' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}>Cancellation History</button>
          <button onClick={() => setActiveTab('rules')} className={\`py-4 px-1 border-b-2 font-medium text-sm \${activeTab === 'rules' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}>Configuration Rules</button>
        </nav>
      </div>

      {activeTab === 'records' && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Initiator Role</label>
              <select value={filters.initiator_role} onChange={e => setFilters({...filters, initiator_role: e.target.value})} className="border-slate-300 rounded-md text-sm w-40">
                <option value="">All Roles</option>
                <option value="CUSTOMER">Customer</option>
                <option value="VENDOR">Vendor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Booking ID</label>
              <input type="text" placeholder="UUID" value={filters.booking_id} onChange={e => setFilters({...filters, booking_id: e.target.value})} className="border-slate-300 rounded-md text-sm w-48" />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Filter</button>
          </form>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-slate-600">Booking Info</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Cancelled By</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Reason</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Rule Applied</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading...</td></tr> : records.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">No cancellations found</td></tr> : records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-blue-600 mb-1">{r.booking_id.substring(0,8)}...</div>
                      <div className="font-medium text-slate-800">Total: ₹{parseFloat(r.total_amount).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={\`px-2 py-1 rounded text-xs font-bold \${
                        r.cancelled_by_role === 'CUSTOMER' ? 'bg-purple-100 text-purple-800' :
                        r.cancelled_by_role === 'VENDOR' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-red-100 text-red-800'
                      }\`}>{r.cancelled_by_role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 text-xs italic max-w-xs truncate" title={r.reason}>"{r.reason}"</div>
                    </td>
                    <td className="px-6 py-4">
                      {r.refund_percentage !== null ? (
                        <div className="text-xs text-slate-700">
                          <span className="font-bold">{r.refund_percentage}% Refund</span>
                          {r.penalty_percentage > 0 && <span className="block text-red-600">{r.penalty_percentage}% Penalty</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Admin Override / No Rule</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 border-b pb-2 mb-4">Create New Policy</h2>
            <form onSubmit={handleCreateRule} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Initiator</label>
                <select value={newRule.initiator_role} onChange={e => setNewRule({...newRule, initiator_role: e.target.value})} className="w-full border-slate-300 rounded-md text-sm">
                  <option value="CUSTOMER">Customer</option>
                  <option value="VENDOR">Vendor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Min Days Before Event</label>
                <input required type="number" min="0" value={newRule.days_before_event_min} onChange={e => setNewRule({...newRule, days_before_event_min: e.target.value})} className="w-full border-slate-300 rounded-md text-sm" placeholder="e.g. 30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Max Days Before Event</label>
                <input type="number" min="0" value={newRule.days_before_event_max} onChange={e => setNewRule({...newRule, days_before_event_max: e.target.value})} className="w-full border-slate-300 rounded-md text-sm" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Refund %</label>
                <input required type="number" step="0.01" min="0" max="100" value={newRule.refund_percentage} onChange={e => setNewRule({...newRule, refund_percentage: e.target.value})} className="w-full border-slate-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Penalty % (Vendor)</label>
                <input required type="number" step="0.01" min="0" max="100" value={newRule.penalty_percentage} onChange={e => setNewRule({...newRule, penalty_percentage: e.target.value})} className="w-full border-slate-300 rounded-md text-sm" />
              </div>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 font-medium">Add Rule</button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-slate-600">Role</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Time Window</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Refund / Penalty</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading...</td></tr> : rules.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-800">{r.initiator_role}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {r.days_before_event_max ? \`\${r.days_before_event_min} - \${r.days_before_event_max} Days\` : \`\${r.days_before_event_min}+ Days\`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-blue-700">{r.refund_percentage}% Refund</span>
                      {r.penalty_percentage > 0 && <span className="ml-2 font-bold text-red-600">({r.penalty_percentage}% Penalty)</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={\`px-2 py-1 rounded text-xs font-semibold \${r.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}\`}>
                        {r.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleRule(r.id, r.is_active)} className="text-blue-600 hover:underline font-medium text-xs">
                        {r.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
