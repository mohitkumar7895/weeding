'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminNotificationTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    event_type: 'BOOKING_CONFIRMED',
    channel: 'EMAIL',
    content: ''
  });

  const router = useRouter();

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications/templates');
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
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
    fetchTemplates();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ event_type: 'BOOKING_CONFIRMED', channel: 'EMAIL', content: '' });
    setIsModalOpen(true);
  };

  const openEdit = (template: any) => {
    setEditingId(template.id);
    setFormData({
      event_type: template.event_type,
      channel: template.channel,
      content: template.content
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/notifications/templates/${editingId}` : '/api/admin/notifications/templates';
      const method = editingId ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchTemplates();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading Templates...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notification Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Manage active templates for all communication channels.</p>
        </div>
        <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700">
          + New Template
        </button>
      </div>

      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Event Type</th>
              <th className="px-6 py-3 text-left">Channel</th>
              <th className="px-6 py-3 text-left">Version</th>
              <th className="px-6 py-3 text-left">Last Updated</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100 text-sm">
            {templates.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No active templates found.</td></tr>
            ) : (
              templates.map((tpl) => (
                <tr key={tpl.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{tpl.event_type}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-bold">
                      {tpl.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">v{tpl.version}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(tpl.updated_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(tpl)} className="text-indigo-600 hover:text-indigo-900 font-medium">Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Template' : 'Create Template'}</h2>
            
            <div className="space-y-4">
              {!editingId && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                    <select 
                      className="w-full border rounded-md p-2 text-sm"
                      value={formData.event_type}
                      onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                    >
                      <option value="BOOKING_CONFIRMED">BOOKING_CONFIRMED</option>
                      <option value="BOOKING_CANCELLED">BOOKING_CANCELLED</option>
                      <option value="PAYMENT_SUCCESS">PAYMENT_SUCCESS</option>
                      <option value="ACCOUNT_CREATED">ACCOUNT_CREATED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                    <select 
                      className="w-full border rounded-md p-2 text-sm"
                      value={formData.channel}
                      onChange={(e) => setFormData({...formData, channel: e.target.value})}
                    >
                      <option value="EMAIL">EMAIL</option>
                      <option value="SMS">SMS</option>
                      <option value="WHATSAPP">WHATSAPP</option>
                      <option value="IN_APP">IN_APP</option>
                      <option value="PUSH">PUSH</option>
                    </select>
                  </div>
                </div>
              )}

              {editingId && (
                <div className="bg-gray-50 p-3 rounded border text-sm text-gray-600 mb-4">
                  Editing <span className="font-bold">{formData.event_type}</span> on <span className="font-bold">{formData.channel}</span>.
                  <br />Saving will create a new version to protect historical logs.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm h-32 font-mono"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Hello {{customer_name}}, your booking {{booking_id}} is confirmed."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Use curly braces for variables: {`{{customer_name}}`}, {`{{booking_id}}`}, {`{{amount}}`}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
