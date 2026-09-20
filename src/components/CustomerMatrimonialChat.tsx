'use client';

import React, { useEffect, useState } from 'react';

type Thread = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  user_a_name: string;
  user_b_name: string;
};

type Message = {
  id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
};

export default function CustomerMatrimonialChat({
  currentUserId,
  initialPeerUserId,
}: {
  currentUserId?: string;
  initialPeerUserId?: string | null;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string | null>(initialPeerUserId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadThreads = async () => {
    const res = await fetch('/api/matrimonial/chat');
    const data = await res.json();
    if (res.status === 404 || data.enabled === false) {
      setEnabled(false);
      setError(data.message || 'Matrimonial chat is disabled');
      return;
    }
    if (data.success) setThreads(data.data || []);
    else setError(data.message);
  };

  const loadMessages = async (id: string) => {
    const res = await fetch(`/api/matrimonial/chat?thread_id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (data.success) setMessages(data.data || []);
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (threadId) loadMessages(threadId);
  }, [threadId]);

  useEffect(() => {
    if (initialPeerUserId) setPeerId(initialPeerUserId);
  }, [initialPeerUserId]);

  const send = async () => {
    if (!peerId || !draft.trim()) return;
    const res = await fetch('/api/matrimonial/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peer_user_id: peerId, message: draft.trim() }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.message || 'Could not send');
      return;
    }
    setDraft('');
    setThreadId(data.thread_id);
    await loadThreads();
    await loadMessages(data.thread_id);
  };

  const peerName = (thread: Thread) =>
    thread.user_a_id === currentUserId ? thread.user_b_name : thread.user_a_name;

  if (!enabled) {
    return <p style={{ color: '#9cb1a6' }}>{error}</p>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, minHeight: 420 }}>
      <aside style={{ borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 12 }}>
        <h3 style={{ color: '#e5c158' }}>Chats</h3>
        {threads.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => {
              setThreadId(thread.id);
              setPeerId(thread.user_a_id === currentUserId ? thread.user_b_id : thread.user_a_id);
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: 10,
              marginBottom: 6,
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              background: threadId === thread.id ? 'rgba(230,0,92,0.25)' : 'rgba(255,255,255,0.04)',
              color: '#fff',
            }}
          >
            {peerName(thread)}
          </button>
        ))}
        {!threads.length && <p style={{ color: '#9cb1a6', fontSize: 13 }}>Accept an interest to start chatting.</p>}
      </aside>
      <section>
        <div style={{ minHeight: 280, marginBottom: 12 }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: 10, textAlign: msg.sender_id === currentUserId ? 'right' : 'left' }}>
              <div
                style={{
                  display: 'inline-block',
                  maxWidth: '80%',
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: msg.sender_id === currentUserId ? '#e6005c' : 'rgba(255,255,255,0.08)',
                  color: '#fff',
                }}
              >
                {msg.message}
              </div>
            </div>
          ))}
          {!messages.length && <p style={{ color: '#9cb1a6' }}>Select a conversation or accept an interest first.</p>}
        </div>
        {error && <p style={{ color: '#ff8fab' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: '#031710', color: '#fff' }}
          />
          <button
            type="button"
            onClick={send}
            disabled={!peerId}
            style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#e5c158', color: '#031710', fontWeight: 800, cursor: 'pointer' }}
          >
            Send
          </button>
        </div>
      </section>
    </div>
  );
}
