'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CommissionRulesConfig() {
  const router = useRouter();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newRule, setNewRule] = useState({
    rule_name: '', commission_value: '', min_fee: '', max_fee: '', effective_from: new Date().toISOString().split('T')[0]
  });

  const fetchRules = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/finance/commissions/rules');
    const data = await res.json();
    if (data.success) setRules(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchRules(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/finance/commissions/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setNewRule({ rule_name: '', commission_value: '', min_fee: '', max_fee: '', effective_from: new Date().toISOString().split('T')[0] });
        fetchRules();
      }
    } catch (e: any) {
      alert('Error creating rule');
    }
  };

  const toggleRule = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(\`/api/admin/finance/commissions/rules/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if ((await res.json()).success) fetchRules();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-start">
        <div>
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-800 mb-2">&larr; Back to review</button>
          <h1 className="text-2xl font-bold text-slate-800">Commission Configuration</h1>
          <p className="text-slate-600 text-sm mt-1">Manage active commission formulas. Historical records remain unchanged.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-bold text-slate-800 border-b pb-2 mb-4">Create New Rule</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Rule Name</label>
            <input required type="text" placeholder="e.g. 2026 Base Rate" value={newRule.rule_name} onChange={e => setNewRule({...newRule, rule_name: e.target.value})} className="w-full border-slate-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Percentage (%)</label>
            <input required type="number" step="0.01" min="0" max="100" placeholder="10.00" value={newRule.commission_value} onChange={e => setNewRule({...newRule, commission_value: e.target.value})} className="w-full border-slate-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Effective Date</label>
            <input required type="date" value={newRule.effective_from} onChange={e => setNewRule({...newRule, effective_from: e.target.value})} className="w-full border-slate-300 rounded-md text-sm" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 font-medium w-full">Create Rule</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-600">Rule Name</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Type & Value</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Effective Date</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading...</td></tr> : rules.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{r.rule_name}</td>
                <td className="px-6 py-4 text-blue-700 font-semibold">{r.commission_value}{r.commission_type === 'PERCENTAGE' ? '%' : ' Flat'}</td>
                <td className="px-6 py-4 font-mono text-slate-600">{new Date(r.effective_from).toISOString().split('T')[0]}</td>
                <td className="px-6 py-4">
                  <span className={\`px-2 py-1 rounded text-xs font-semibold \${r.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}\`}>
                    {r.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleRule(r.id, r.is_active)} className="text-blue-600 hover:underline font-medium">
                    {r.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
