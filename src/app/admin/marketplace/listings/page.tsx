'use client';

import React, { useState, useEffect } from 'react';

export default function MarketplaceListings() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVendors = async () => {
    const res = await fetch('/api/admin/vendors?status=VERIFIED'); // Reusing existing vendor list but filtering VERIFIED
    const data = await res.json();
    if (data.success) setVendors(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchVendors(); }, []);

  const togglePromotion = async (id: string, field: 'is_featured' | 'is_sponsored', currentValue: boolean) => {
    await fetch(`/api/admin/marketplace/vendors/${id}/promotion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !currentValue })
    });
    fetchVendors();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Listings & Promotion</h1>
      <p className="text-slate-600 mb-4">Toggle Featured or Sponsored status for verified vendors.</p>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-600">Business / Category</th>
              <th className="px-6 py-3 font-semibold text-slate-600 text-center">Featured Status</th>
              <th className="px-6 py-3 font-semibold text-slate-600 text-center">Sponsored Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={3} className="p-6 text-center text-slate-500">Loading...</td></tr> : vendors.map(v => (
              <tr key={v.id}>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-800">{v.business_name}</div>
                  <div className="text-xs text-slate-500">{v.category_name} &middot; {v.city}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => togglePromotion(v.id, 'is_featured', v.is_featured)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${v.is_featured ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {v.is_featured ? '★ Featured' : 'Mark Featured'}
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => togglePromotion(v.id, 'is_sponsored', v.is_sponsored)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${v.is_sponsored ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {v.is_sponsored ? '$ Sponsored' : 'Mark Sponsored'}
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
