'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSecurityConfig() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Local state for editing
  const [rateLimit, setRateLimit] = useState({ windowMs: 900000, maxRequests: 100 });
  const [corsOrigins, setCorsOrigins] = useState('');

  const router = useRouter();

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/security/config');
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        
        if (data.config.RATE_LIMIT_GLOBAL?.value) {
          setRateLimit(data.config.RATE_LIMIT_GLOBAL.value);
        }
        if (data.config.CORS_ALLOWED_ORIGINS?.value?.origins) {
          setCorsOrigins(data.config.CORS_ALLOWED_ORIGINS.value.origins.join('\n'));
        }
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
    fetchConfig();
  }, [router]);

  const saveRateLimit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/security/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: 'RATE_LIMIT_GLOBAL', 
          value: { windowMs: Number(rateLimit.windowMs), maxRequests: Number(rateLimit.maxRequests) } 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Rate limit updated!');
        fetchConfig();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveCors = async () => {
    const origins = corsOrigins.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    if (origins.length === 0) {
      alert('Must provide at least one allowed origin to prevent application lock-out.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/security/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: 'CORS_ALLOWED_ORIGINS', 
          value: { origins } 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('CORS configuration updated!');
        fetchConfig();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading Configuration...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">API Security Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Manage global security policies. Invalid configurations are blocked server-side.</p>
      </div>

      <div className="space-y-8">
        {/* Rate Limiting */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-1">Global Rate Limiting</h2>
          <p className="text-sm text-gray-500 mb-6">Restricts the number of API requests a single IP can make within a time window.</p>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Window Size (milliseconds)</label>
              <input 
                type="number" 
                className="w-full border rounded-md p-2 text-sm" 
                value={rateLimit.windowMs} 
                onChange={(e) => setRateLimit({...rateLimit, windowMs: parseInt(e.target.value) || 0})} 
              />
              <p className="text-xs text-gray-400 mt-1">e.g., 900000 = 15 minutes</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Requests</label>
              <input 
                type="number" 
                className="w-full border rounded-md p-2 text-sm" 
                value={rateLimit.maxRequests} 
                onChange={(e) => setRateLimit({...rateLimit, maxRequests: parseInt(e.target.value) || 0})} 
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={saveRateLimit} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50">
              Save Rate Limit
            </button>
          </div>
        </div>

        {/* CORS */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-1">CORS Allowed Origins</h2>
          <p className="text-sm text-gray-500 mb-4">Domains permitted to make cross-origin requests to this API. Enter one URL per line.</p>
          
          <textarea 
            className="w-full border rounded-md p-3 text-sm font-mono h-32 bg-gray-50"
            value={corsOrigins}
            onChange={(e) => setCorsOrigins(e.target.value)}
            placeholder="http://localhost:3000&#10;https://wedwithme.com"
          />
          <div className="mt-4 flex justify-end">
            <button onClick={saveCors} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50">
              Save Origins
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
