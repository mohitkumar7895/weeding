'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminNotificationConfig() {
  const [settings, setSettings] = useState<any[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications/config');
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setPendingChanges(new Map());
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
    fetchSettings();
  }, []);

  const handleToggle = (eventType: string, channel: string, currentValue: boolean) => {
    const newSettings = [...settings];
    const targetIdx = newSettings.findIndex(s => s.event_type === eventType);
    if (targetIdx === -1) return;

    // Optimistic UI update
    newSettings[targetIdx][channel] = !currentValue ? 1 : 0;
    setSettings(newSettings);

    // Track pending changes
    const updatedMap = new Map(pendingChanges);
    const existingChange = updatedMap.get(eventType) || {};
    updatedMap.set(eventType, { ...existingChange, [channel]: !currentValue });
    setPendingChanges(updatedMap);
  };

  const handleSave = async () => {
    if (pendingChanges.size === 0) return;
    
    setSaving(true);
    try {
      const updates = Array.from(pendingChanges.entries()).map(([event_type, changes]) => ({
        event_type,
        ...changes
      }));

      const res = await fetch('/api/admin/notifications/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      const data = await res.json();
      
      if (data.success) {
        alert('Configuration saved successfully');
        setPendingChanges(new Map());
        fetchSettings();
      } else {
        alert('Error saving configuration: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading Configuration...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  // Group settings by category
  const groupedSettings = settings.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  const hasUnsavedChanges = pendingChanges.size > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Platform Notification Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Configure which communication channels are active for specific system events.</p>
        </div>
        <div className="flex items-center gap-4">
          {hasUnsavedChanges && <span className="text-sm font-medium text-amber-600">Unsaved changes pending...</span>}
          <button 
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedSettings).map(([category, events]) => (
          <div key={category} className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">{category} EVENTS</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Event Type</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">In-App</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">SMS</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Push</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {events.map((ev) => (
                    <tr key={ev.event_type} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{ev.event_type}</span>
                          {!!ev.is_mandatory && (
                            <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-red-100 text-red-700 rounded-full" title="Bypasses user opt-outs">
                              Mandatory
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {['in_app_enabled', 'email_enabled', 'sms_enabled', 'push_enabled', 'whatsapp_enabled'].map((channel) => {
                        const isEnabled = !!ev[channel];
                        return (
                          <td key={channel} className="px-6 py-4 text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={isEnabled}
                                onChange={() => handleToggle(ev.event_type, channel, isEnabled)}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
        <h4 className="font-bold mb-1">How this works:</h4>
        <p>This configuration acts as the <strong>Global Master Switch</strong> for the platform. If a channel is disabled here, it will not be sent, regardless of a user's personal preference settings. If a channel is enabled here, the final delivery still depends on the user's notification preferences, unless the event is marked as <span className="font-bold text-red-600 uppercase text-xs">Mandatory</span>.</p>
      </div>

    </div>
  );
}
