'use client';

import React, { useState, useEffect } from 'react';

export default function MarketplaceConfiguration() {
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    const res = await fetch('/api/admin/marketplace/configuration');
    const data = await res.json();
    if (data.success) {
      const map: any = {};
      data.data.forEach((s: any) => map[s.key] = s.value);
      
      // Defaults if not set
      if (!map['RANKING_WEIGHT_RATING']) map['RANKING_WEIGHT_RATING'] = '40';
      if (!map['RANKING_WEIGHT_RELEVANCE']) map['RANKING_WEIGHT_RELEVANCE'] = '30';
      if (!map['RANKING_WEIGHT_DISTANCE']) map['RANKING_WEIGHT_DISTANCE'] = '20';
      if (!map['RANKING_WEIGHT_AVAILABILITY']) map['RANKING_WEIGHT_AVAILABILITY'] = '10';
      if (!map['DISCOVERY_DEFAULT_RADIUS_KM']) map['DISCOVERY_DEFAULT_RADIUS_KM'] = '50';
      
      setConfig(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async () => {
    const payload = Object.keys(config).map(k => ({ key: k, value: String(config[k]) }));
    try {
      const res = await fetch('/api/admin/marketplace/configuration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload })
      });
      const data = await res.json();
      alert(data.message);
    } catch (e: any) {
      alert('Error saving configuration');
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading configuration...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Ranking & Discovery Configuration</h1>
        <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Changes</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Organic Ranking Signals (Weights 0-100)</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rating Weight</label>
            <input type="number" min="0" max="100" className="w-full border-slate-300 rounded-md" value={config.RANKING_WEIGHT_RATING} onChange={e => setConfig({...config, RANKING_WEIGHT_RATING: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Relevance Weight</label>
            <input type="number" min="0" max="100" className="w-full border-slate-300 rounded-md" value={config.RANKING_WEIGHT_RELEVANCE} onChange={e => setConfig({...config, RANKING_WEIGHT_RELEVANCE: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Distance Weight</label>
            <input type="number" min="0" max="100" className="w-full border-slate-300 rounded-md" value={config.RANKING_WEIGHT_DISTANCE} onChange={e => setConfig({...config, RANKING_WEIGHT_DISTANCE: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Availability Weight</label>
            <input type="number" min="0" max="100" className="w-full border-slate-300 rounded-md" value={config.RANKING_WEIGHT_AVAILABILITY} onChange={e => setConfig({...config, RANKING_WEIGHT_AVAILABILITY: e.target.value})} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Location Discovery</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Default Search Radius (KM)</label>
          <input type="number" className="w-full md:w-1/2 border-slate-300 rounded-md" value={config.DISCOVERY_DEFAULT_RADIUS_KM} onChange={e => setConfig({...config, DISCOVERY_DEFAULT_RADIUS_KM: e.target.value})} />
          <p className="text-xs text-slate-500 mt-1">Used when a customer searches by location without specifying a radius.</p>
        </div>
      </div>
    </div>
  );
}
