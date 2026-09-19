'use client';
import React, { useState, useEffect } from 'react';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PUT' });
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', fontSize: '20px' }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: '-5px', right: '-10px', background: '#ff2a73', color: '#fff', fontSize: '10px', fontWeight: 'bold', borderRadius: '10px', padding: '2px 6px' }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{ position: 'absolute', top: '40px', right: 0, width: '320px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 9999, overflow: 'hidden' }}>
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#e5c158', fontSize: '16px' }}>Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} style={{ background: 'none', border: 'none', color: '#48bb78', fontSize: '12px', cursor: 'pointer' }}>Mark all as read</button>
            )}
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#a0aec0', fontSize: '14px' }}>No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: n.is_read ? 'transparent' : 'rgba(229,193,88,0.05)', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#63b3ed', textTransform: 'uppercase' }}>{n.category || 'SYSTEM'}</span>
                    <span style={{ fontSize: '10px', color: '#718096' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <h5 style={{ margin: '0 0 4px 0', color: n.is_read ? '#cbd5e0' : '#fff', fontSize: '14px' }}>{n.title}</h5>
                  <p style={{ margin: 0, color: '#a0aec0', fontSize: '13px' }}>{n.message}</p>
                  
                  {!n.is_read && (
                    <button 
                      onClick={() => handleMarkAsRead(n.id)}
                      style={{ marginTop: '8px', background: 'none', border: 'none', color: '#e5c158', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
