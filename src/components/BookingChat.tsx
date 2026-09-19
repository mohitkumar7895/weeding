'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function BookingChat({ bookingId, currentUserId }: { bookingId: string, currentUserId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Real-time readiness: In the future, attach a socket listener here
    // const interval = setInterval(fetchMessages, 5000);
    // return () => clearInterval(interval);
  }, [bookingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage, message_type: 'TEXT' })
      });
      const data = await res.json();
      if (data.success) {
        setMessages([...messages, data.message]);
        setNewMessage('');
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleReport = async (messageId: string) => {
    if (!confirm('Are you sure you want to report this message?')) return;
    
    try {
      const res = await fetch(`/api/bookings/messages/${messageId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Inappropriate Content' })
      });
      const data = await res.json();
      if (data.success) {
        alert('Message reported to administrators.');
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ padding: '20px', color: '#a0aec0' }}>Loading conversation...</div>;
  if (error) return <div style={{ padding: '20px', color: '#ff6b9d' }}>Error: {error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '600px', background: '#0a251b', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.3)', overflow: 'hidden' }}>
      {/* Header Context */}
      <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#e5c158', fontSize: '16px' }}>Booking Conversation</h3>
        <span style={{ fontSize: '12px', color: '#a0aec0', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>#{bookingId.slice(0,8)}</span>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: 'auto', marginBottom: 'auto' }}>
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: isMe ? '16px 16px 0 16px' : '16px 16px 16px 0',
                  background: isMe ? '#e5c158' : 'rgba(255,255,255,0.05)',
                  color: isMe ? '#031710' : '#fff',
                  border: isMe ? 'none' : '1px solid rgba(255,255,255,0.1)'
                }}>
                  {msg.message_type === 'TEXT' && <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>}
                  {msg.message_type === 'IMAGE' && <img src={msg.attachment_url} alt="Attachment" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: msg.content ? '8px' : '0' }} />}
                  {msg.message_type === 'DOCUMENT' && <a href={msg.attachment_url} target="_blank" rel="noreferrer" style={{ color: isMe ? '#000' : '#63b3ed', textDecoration: 'underline' }}>View Attached Document</a>}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#718096' }}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  {!isMe && (
                    <button onClick={() => handleReport(msg.id)} style={{ background: 'none', border: 'none', color: '#fc8181', fontSize: '11px', cursor: 'pointer', padding: 0 }}>Report</button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSendMessage} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px' }}>
        <button type="button" title="Attach File" style={{ padding: '0 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#a0aec0', borderRadius: '8px', cursor: 'pointer' }}>
          📎
        </button>
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..." 
          style={{ flex: 1, padding: '12px', background: '#031710', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
        />
        <button type="submit" disabled={sending || !newMessage.trim()} style={{ padding: '0 20px', background: '#e5c158', color: '#031710', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: (sending || !newMessage.trim()) ? 'not-allowed' : 'pointer' }}>
          {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
