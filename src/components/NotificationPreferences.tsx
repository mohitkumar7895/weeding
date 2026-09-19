'use client';
import React, { useState, useEffect } from 'react';

const CATEGORIES = [
  { id: 'BOOKINGS', label: 'Booking Updates (Confirmed, Cancelled)' },
  { id: 'PAYMENTS', label: 'Payments & Refunds' },
  { id: 'CHAT', label: 'New Chat Messages' },
  { id: 'REVIEWS', label: 'Review Moderation & Alerts' },
  { id: 'SECURITY', label: 'Security & Account Alerts' },
];

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPreferences(data.preferences);
        }
        setLoading(false);
      });
  }, []);

  const handleToggle = async (categoryId: string, field: 'in_app_enabled' | 'email_enabled' | 'whatsapp_enabled') => {
    // Find current or construct default
    const existing = preferences.find(p => p.category === categoryId) || { in_app_enabled: 1, email_enabled: 1, whatsapp_enabled: 0 };
    
    const updated = {
      ...existing,
      [field]: existing[field] ? 0 : 1 // Toggle
    };

    // Optimistic update
    setPreferences(prev => {
      const clone = [...prev];
      const idx = clone.findIndex(p => p.category === categoryId);
      if (idx >= 0) clone[idx] = updated;
      else clone.push({ category: categoryId, ...updated });
      return clone;
    });

    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: categoryId,
          in_app_enabled: updated.in_app_enabled,
          email_enabled: updated.email_enabled,
          whatsapp_enabled: updated.whatsapp_enabled
        })
      });
    } catch (e) {
      console.error('Failed to save preference');
    }
  };

  const getPref = (categoryId: string) => {
    return preferences.find(p => p.category === categoryId) || { in_app_enabled: 1, email_enabled: 1, whatsapp_enabled: 0 };
  };

  if (loading) return <div style={{ color: '#a0aec0' }}>Loading preferences...</div>;

  return (
    <div style={{ background: '#0a251b', padding: '24px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.3)' }}>
      <h3 style={{ color: '#e5c158', fontSize: '20px', marginBottom: '8px', marginTop: 0 }}>Notification Preferences</h3>
      <p style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '24px' }}>Control how and when WedWithMe alerts you about platform activities.</p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
            <th style={{ padding: '12px 0', color: '#cbd5e0', fontSize: '14px' }}>Category</th>
            <th style={{ padding: '12px 0', color: '#cbd5e0', fontSize: '14px', textAlign: 'center' }}>In-App Alert</th>
            <th style={{ padding: '12px 0', color: '#cbd5e0', fontSize: '14px', textAlign: 'center' }}>Email</th>
            <th style={{ padding: '12px 0', color: '#cbd5e0', fontSize: '14px', textAlign: 'center' }}>WhatsApp</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map(cat => {
            const pref = getPref(cat.id);
            // Don't allow disabling security for in-app/email, but WhatsApp is always optional
            const isSecurity = cat.id === 'SECURITY';

            return (
              <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '16px 0', color: '#fff', fontSize: '14px' }}>{cat.label}</td>
                <td style={{ padding: '16px 0', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={!!pref.in_app_enabled} 
                    disabled={isSecurity}
                    onChange={() => handleToggle(cat.id, 'in_app_enabled')}
                    style={{ cursor: isSecurity ? 'not-allowed' : 'pointer' }}
                  />
                </td>
                <td style={{ padding: '16px 0', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={!!pref.email_enabled} 
                    disabled={isSecurity}
                    onChange={() => handleToggle(cat.id, 'email_enabled')}
                    style={{ cursor: isSecurity ? 'not-allowed' : 'pointer' }}
                  />
                </td>
                <td style={{ padding: '16px 0', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={!!pref.whatsapp_enabled} 
                    onChange={() => handleToggle(cat.id, 'whatsapp_enabled')}
                    style={{ cursor: 'pointer', accentColor: '#25D366' }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
