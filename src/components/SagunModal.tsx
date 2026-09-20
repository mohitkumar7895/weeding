'use client';

import React, { useState } from 'react';

interface SagunModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  sender: 'sagun' | 'user';
  text: string;
  time: string;
}

export default function SagunModal({ isOpen, onClose }: SagunModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'sagun',
      text: 'नमस्ते! मैं हूँ शगुन, आपकी पर्सनल AI वेडिंग असिस्टेंट! आप अपने वेडिंग वेन्यू, बजट, केटरिंग या मैचमेकिंग के बारे में कुछ भी पूछ सकते हैं।',
      time: 'Just now',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<string[]>([
    'Delhi NCR me best venues?',
    '300 guests catering budget kitna hoga?',
    'Top candid wedding photographers?',
    'Plan a 20 Lakh Indian wedding budget',
  ]);

  if (!isOpen) return null;

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (data.success && data.data) {
        setConversationId(data.data.conversationId);
        if (data.data.suggestedPrompts && data.data.suggestedPrompts.length > 0) {
          setPrompts(data.data.suggestedPrompts);
        }

        let replyText = data.data.reply || 'Sagun se abhi jawab nahi aaya. Server restart karke phir try karein.';
        if (data.data.structuredData && data.data.structuredData.items) {
          if (data.data.structuredData.type === 'VENDORS') {
            const vNames = data.data.structuredData.items.map((v: any) => `• ${v.business_name} (${v.city}) - Starting ₹${parseFloat(v.starting_price).toLocaleString('en-IN')}`).join('\n');
            replyText += `\n\n${vNames}`;
          } else if (data.data.structuredData.type === 'BUDGET_BREAKDOWN') {
            const bItems = data.data.structuredData.items.map((b: any) => `• ${b.category}: ₹${b.amount.toLocaleString('en-IN')} (${b.percentage}%)`).join('\n');
            replyText += `\n\n${bItems}`;
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            sender: 'sagun',
            text: replyText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        throw new Error(data.message || `Sagun API ${res.status}`);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'sagun',
          text: `माफ़ कीजियेगा, Sagun reply nahi de paayi: ${err.message || 'network error'}. Server restart karke phir try karein.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="assistant-profile">
            <div className="avatar-ring">
              <img src="/images/sagun.jpg" alt="Sagun Avatar" className="modal-avatar" />
              <span className="online-indicator"></span>
            </div>
            <div>
              <div className="profile-name">
                Sagun <span className="ai-tag">AI Wedding Expert</span>
              </div>
              <div className="profile-status">Online • 24/7 Voice & Chat Concierge</div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Chat History */}
        <div className="chat-body">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-message ${m.sender === 'user' ? 'user-msg' : 'sagun-msg'}`}>
              {m.sender === 'sagun' && (
                <img src="/images/sagun.jpg" alt="Sagun" className="chat-avatar-mini" />
              )}
              <div className="bubble-content">
                <div className="bubble-text">{m.text}</div>
                <div className="bubble-time">{m.time}</div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="chat-message sagun-msg">
              <img src="/images/sagun.jpg" alt="Sagun" className="chat-avatar-mini" />
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="chips-container">
          {prompts.map((q, i) => (
            <button key={i} className="chip-btn" onClick={() => handleSendMessage(q)}>
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          className="chat-input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal);
          }}
        >
          <input
            type="text"
            placeholder="Type a message or question in Hindi/English..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="text-input"
          />
          <button type="submit" className="send-btn" aria-label="Send message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(2, 18, 12, 0.75);
          backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.2s ease;
        }

        .modal-card {
          width: 100%;
          max-width: 540px;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(229, 193, 88, 0.4);
          display: flex;
          flex-direction: column;
          height: 620px;
          max-height: 92vh;
          animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-header {
          background: linear-gradient(135deg, #032115 0%, #063121 100%);
          padding: 18px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(229, 193, 88, 0.2);
        }

        .assistant-profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar-ring {
          position: relative;
          width: 46px;
          height: 46px;
        }

        .modal-avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e5c158;
        }

        .online-indicator {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 11px;
          height: 11px;
          background: #10b981;
          border: 2px solid #032115;
          border-radius: 50%;
        }

        .profile-name {
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-tag {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 9999px;
          background: rgba(229, 193, 88, 0.2);
          color: #f5d475;
          border: 1px solid rgba(229, 193, 88, 0.4);
          font-weight: 600;
        }

        .profile-status {
          font-size: 11.5px;
          color: #8da597;
        }

        .close-btn {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: background 0.2s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .chat-body {
          flex: 1;
          overflow-y: auto;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #f8faf8;
        }

        .chat-message {
          display: flex;
          gap: 10px;
          max-width: 85%;
        }

        .user-msg {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .sagun-msg {
          align-self: flex-start;
        }

        .chat-avatar-mini {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid #e5c158;
          flex-shrink: 0;
        }

        .bubble-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .bubble-text {
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 13.5px;
          line-height: 1.5;
        }

        .sagun-msg .bubble-text {
          background: #ffffff;
          color: #122119;
          border: 1px solid #e2ece6;
          border-top-left-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .user-msg .bubble-text {
          background: linear-gradient(135deg, #032115 0%, #063121 100%);
          color: #ffffff;
          border: 1px solid rgba(229, 193, 88, 0.35);
          border-top-right-radius: 4px;
        }

        .bubble-time {
          font-size: 10.5px;
          color: #8fa096;
          align-self: flex-end;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 12px 16px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2ece6;
          width: fit-content;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #0d9488;
          border-radius: 50%;
          animation: waveBar 0.9s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        .chips-container {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 10px 20px;
          background: #ffffff;
          border-top: 1px solid #edf2ee;
          white-space: nowrap;
          scrollbar-width: none;
        }

        .chips-container::-webkit-scrollbar {
          display: none;
        }

        .chip-btn {
          font-size: 11.5px;
          padding: 6px 12px;
          border-radius: 9999px;
          background: #f0f6f2;
          color: #1a3327;
          border: 1px solid #dbe6df;
          transition: all 0.15s ease;
        }

        .chip-btn:hover {
          background: #063121;
          color: #ffffff;
          border-color: #063121;
        }

        .chat-input-bar {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: #ffffff;
          border-top: 1px solid #edf2ee;
          gap: 10px;
        }

        .text-input {
          flex: 1;
          padding: 10px 14px;
          border-radius: 9999px;
          background: #f2f6f3;
          border: 1px solid #dce6e0;
          font-size: 13.5px;
          color: #122119;
        }

        .send-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f5d475 0%, #d4a937 100%);
          color: #031710;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(229, 193, 88, 0.4);
          transition: transform 0.2s ease;
        }

        .send-btn:hover {
          transform: scale(1.05);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
