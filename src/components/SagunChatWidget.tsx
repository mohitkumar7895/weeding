'use client';
import React, { useState, useEffect, useRef } from 'react';

interface SagunChatProps {
  contextType?: 'GENERAL' | 'VENDOR_DISCOVERY' | 'MATRIMONIAL' | 'BOOKING';
  contextId?: string;
}

export default function SagunChatWidget({ contextType = 'GENERAL', contextId }: SagunChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or fetch session on open
  useEffect(() => {
    if (isOpen && !sessionId) {
      initSession();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const initSession = async () => {
    try {
      const res = await fetch('/api/sagun/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_type: contextType, context_id: contextId })
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.session.id);
        setMessages([{
          id: 'welcome',
          role: 'ASSISTANT',
          content: 'Hi! I am Sagun, your WedWithMe assistant. How can I help you plan your perfect day?'
        }]);
      } else {
        setError('Could not initialize Sagun. Please try again later.');
      }
    } catch (e) {
      setError('Connection error.');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'USER', content: userMessage }]);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sagun/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, content: userMessage })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessages(prev => [...prev, data.assistant_message]);
      } else {
        setError(data.message || 'Sagun is currently unavailable.');
      }
    } catch (e) {
      setError('Failed to connect to Sagun.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse simple markdown links [text](url) into styled anchor tags
  const renderMessageContent = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Push text before link
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Push link
      parts.push(
        <a 
          key={lastIndex} 
          href={match[2]} 
          style={{ 
            display: 'inline-block',
            marginTop: '8px',
            padding: '6px 12px', 
            background: '#e5c158', 
            color: '#031710', 
            borderRadius: '16px', 
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '13px'
          }}
        >
          {match[1]} ↗
        </a>
      );
      lastIndex = match.index + match[0].length;
    }
    // Push remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          background: '#e5c158',
          color: '#031710',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          fontSize: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isOpen ? '✕' : '✨'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '24px',
          width: '350px',
          height: '500px',
          background: '#0a251b',
          border: '1px solid rgba(229,193,88,0.3)',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '6px', background: '#48bb78' }} />
            <div>
              <h3 style={{ margin: 0, color: '#e5c158', fontSize: '16px' }}>Sagun AI</h3>
              <p style={{ margin: 0, color: '#a0aec0', fontSize: '11px' }}>Your Wedding Assistant</p>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{ padding: '8px 16px', background: 'rgba(255,107,157,0.1)', borderBottom: '1px solid rgba(255,107,157,0.2)' }}>
            <p style={{ margin: 0, color: '#ff6b9d', fontSize: '10px', textAlign: 'center' }}>
              Sagun AI recommendations are informational only and not guaranteed.
            </p>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'USER';
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: isUser ? '16px 16px 0 16px' : '16px 16px 16px 0',
                    background: isUser ? 'rgba(229,193,88,0.15)' : 'rgba(255,255,255,0.05)',
                    color: isUser ? '#e5c158' : '#fff',
                    border: isUser ? '1px solid rgba(229,193,88,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    fontSize: '14px',
                    lineHeight: '1.4',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {isUser ? msg.content : renderMessageContent(msg.content)}
                  </div>
                </div>
              );
            })}
            
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                 <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 0', background: 'rgba(255,255,255,0.05)', color: '#a0aec0', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px' }}>
                    Sagun is thinking...
                 </div>
              </div>
            )}
            
            {error && (
              <div style={{ textAlign: 'center', color: '#fc8181', fontSize: '12px', marginTop: '8px' }}>
                {error}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Sagun..."
              disabled={loading || !sessionId}
              style={{ flex: 1, padding: '10px 12px', background: '#031710', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '20px', outline: 'none', fontSize: '14px' }}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim() || !sessionId}
              style={{ width: '40px', height: '40px', borderRadius: '20px', background: '#e5c158', color: '#031710', border: 'none', cursor: (loading || !input.trim() || !sessionId) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
