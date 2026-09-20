'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminConfigGovernance() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValueStr, setEditValueStr] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/governance/config');
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setConfigs(data.configs);
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
    fetchConfigs();
  }, []);

  const startEdit = (config: any) => {
    setEditingKey(config.config_key);
    setEditValueStr(JSON.stringify(config.config_value, null, 2));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValueStr('');
  };

  const handleSave = async (key: string) => {
    let parsedValue;
    try {
      parsedValue = JSON.parse(editValueStr);
    } catch (e) {
      alert('Invalid JSON format. Please correct it before saving.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/governance/config/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_value: parsedValue })
      });
      const data = await res.json();
      if (data.success) {
        setEditingKey(null);
        fetchConfigs();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading System Configuration...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  // Group by category
  const groupedConfigs = configs.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">System Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Manage global platform variables safely. Invalid JSON will be rejected.</p>
      </div>

      <div className="space-y-8">
        {(Object.entries(groupedConfigs) as [string, any[]][]).map(([category, items]) => (
          <div key={category} className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">{category} SETTINGS</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {items.map((conf) => (
                <div key={conf.config_key} className="p-6 hover:bg-gray-50 flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <h3 className="font-bold text-gray-900 font-mono text-sm">{conf.config_key}</h3>
                    <p className="text-sm text-gray-500 mt-2">{conf.description}</p>
                    <div className="text-xs text-gray-400 mt-4">
                      Last Updated: {conf.updated_at ? new Date(conf.updated_at).toLocaleString() : 'N/A'}<br/>
                      By: {conf.updated_by_name || 'System'}
                    </div>
                  </div>
                  
                  <div className="md:w-2/3">
                    {editingKey === conf.config_key ? (
                      <div className="space-y-3">
                        <textarea 
                          className="w-full border rounded p-3 font-mono text-sm h-32 bg-gray-900 text-green-400"
                          value={editValueStr}
                          onChange={(e) => setEditValueStr(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={cancelEdit} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100">Cancel</button>
                          <button 
                            onClick={() => handleSave(conf.config_key)} 
                            disabled={saving}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <pre className="bg-gray-50 p-4 rounded border text-sm font-mono overflow-x-auto text-gray-700">
                          {JSON.stringify(conf.config_value, null, 2)}
                        </pre>
                        <div className="flex justify-end">
                          <button onClick={() => startEdit(conf)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                            Edit JSON
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
