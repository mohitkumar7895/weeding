'use client';

import React, { useEffect, useState } from 'react';

interface AIAssistantBannerProps {
  onOpenSagun: () => void;
}

const SAGUN_TYPEWRITER =
  'नमस्ते! मैं हूँ शगुन, आपकी AI वेडिंग असिस्टेंट! आप कैसे मदद कर सकती हूँ?';

export default function AIAssistantBanner({ onOpenSagun }: AIAssistantBannerProps) {
  const [typewriterReady, setTypewriterReady] = useState(false);

  useEffect(() => {
    setTypewriterReady(true);
  }, []);

  return (
    <section className="assistant-section">
      <div className="container-custom">
        <div className="assistant-card reveal-on-scroll">
          {/* Gold Traditional Corner Flourishes (Matching screenshot) */}
          <div className="corner-flourish top-left">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <path d="M4 56 V20 C4 11 11 4 20 4 H56" stroke="#e5c158" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
              <path d="M12 48 V22 C12 16 16 12 22 12 H48" stroke="#e5c158" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
              <circle cx="20" cy="20" r="3" fill="#e5c158" opacity="0.35" />
            </svg>
          </div>

          <div className="corner-flourish bottom-right">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <path d="M56 4 V40 C56 49 49 56 40 56 H4" stroke="#e5c158" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
              <path d="M48 12 V38 C48 44 44 48 38 48 H12" stroke="#e5c158" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
              <circle cx="40" cy="40" r="3" fill="#e5c158" opacity="0.35" />
            </svg>
          </div>

          <div className="assistant-grid">
            {/* Left Side: Voice Wave Arcs + Avatar + Details */}
            <div className="assistant-left">
              {/* Speaking Voice Arcs on the left of Sagun (Exact match with screenshot) */}
              <div className="voice-waves-left">
                <svg width="24" height="52" viewBox="0 0 24 52" fill="none">
                  <path d="M20 4 C11 16 11 36 20 48" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
                  <path d="M13 11 C7 19 7 33 13 41" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
                  <path d="M6 18 C3 22 3 30 6 34" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
                </svg>
              </div>

              {/* Avatar in gold ring with green online dot */}
              <div className="avatar-container" onClick={onOpenSagun}>
                <div className="avatar-img-wrap">
                  <img
                    src="/images/sagun.jpg"
                    alt="Sagun - AI Wedding Assistant"
                    className="avatar-img"
                  />
                  <div className="online-badge" />
                </div>
              </div>

              {/* Copy & Gold CTA Button */}
              <div className="assistant-details">
                <h2 className="assistant-title">Meet Sagun</h2>
                <h3 className="assistant-role">Your AI Wedding Assistant</h3>
                <p className="assistant-tagline">
                  Ask, Plan, Book — in your language, with your voice.
                </p>
                {/* Gold Pill Button matching screenshot exactly */}
                <button className="btn-try-sagun-gold" onClick={onOpenSagun}>
                  <span>Try Now</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right Side: Hindi Dialogue Bubble & Golden Audio Wave */}
            <div className="assistant-right">
              <div className="speech-bubble-card" onClick={onOpenSagun}>
                <div
                  className="hindi-message"
                  {...(typewriterReady
                    ? { 'data-typewriter': SAGUN_TYPEWRITER }
                    : {})}
                >
                  नमस्ते! मैं हूँ शगुन,<br />
                  आपकी AI वेडिंग असिस्टेंट!<br />
                  आप कैसे मदद कर सकती हूँ?
                </div>

                {/* Animated Audio Sound Wave Visualizer in Gold */}
                <div className="audio-wave-visualizer">
                  <span className="wave-bar bar-1"></span>
                  <span className="wave-bar bar-2"></span>
                  <span className="wave-bar bar-3"></span>
                  <span className="wave-bar bar-4"></span>
                  <span className="wave-bar bar-5"></span>
                  <span className="wave-bar bar-6"></span>
                  <span className="wave-bar bar-7"></span>
                  <span className="wave-bar bar-8"></span>
                  <span className="wave-bar bar-9"></span>
                  <span className="wave-bar bar-10"></span>
                  <span className="wave-bar bar-11"></span>
                  <span className="wave-bar bar-12"></span>
                  <span className="wave-bar bar-13"></span>
                  <span className="wave-bar bar-14"></span>
                  <span className="wave-bar bar-15"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .assistant-section {
          padding: 24px 0 46px;
          background-color: #ffffff;
        }

        .assistant-card {
          position: relative;
          background: linear-gradient(135deg, #032417 0%, #063121 50%, #032417 100%);
          border-radius: 26px;
          padding: 38px 46px;
          overflow: hidden;
          box-shadow: 0 16px 48px rgba(3, 33, 21, 0.22);
          border: 1px solid rgba(229, 193, 88, 0.32);
        }

        .corner-flourish {
          position: absolute;
          pointer-events: none;
          z-index: 1;
        }

        .top-left {
          top: 10px;
          left: 10px;
        }

        .bottom-right {
          bottom: 10px;
          right: 10px;
        }

        .assistant-grid {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 36px;
          position: relative;
          z-index: 2;
        }

        .assistant-left {
          display: flex;
          align-items: center;
          gap: 24px;
          flex: 1;
        }

        .voice-waves-left {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          animation: pulseSpeaking 2s ease-in-out infinite;
        }

        @keyframes pulseSpeaking {
          0%, 100% {
            opacity: 0.8;
            transform: scale(0.96);
          }
          50% {
            opacity: 1;
            transform: scale(1.06);
          }
        }

        .avatar-container {
          position: relative;
          width: 96px;
          height: 96px;
          flex-shrink: 0;
          cursor: pointer;
        }

        .avatar-img-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid #e5c158;
          box-shadow: 0 0 20px rgba(229, 193, 88, 0.35);
        }

        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .online-badge {
          position: absolute;
          bottom: 5px;
          right: 5px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #10b981;
          border: 2px solid #032115;
          box-shadow: 0 0 6px #10b981;
        }

        .assistant-details {
          display: flex;
          flex-direction: column;
        }

        .assistant-title {
          font-family: var(--font-serif);
          font-size: 32px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.15;
          margin-bottom: 4px;
          letter-spacing: -0.2px;
        }

        .assistant-role {
          font-size: 16.5px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 8px;
          letter-spacing: 0.1px;
        }

        .assistant-tagline {
          font-size: 13.5px;
          color: #b3c9be;
          margin-bottom: 18px;
          max-width: 380px;
          line-height: 1.4;
        }

        /* Gold Pill Button matching screenshot */
        .btn-try-sagun-gold {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #fae8a4 0%, #e5c158 100%) !important;
          color: #121c17 !important;
          font-size: 13.5px;
          font-weight: 800;
          padding: 9px 24px;
          border-radius: 9999px;
          width: fit-content;
          box-shadow: 0 4px 16px rgba(229, 193, 88, 0.35) !important;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
        }

        .btn-try-sagun-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 22px rgba(229, 193, 88, 0.5) !important;
          filter: brightness(1.05);
        }

        /* Speech Bubble Card on the right */
        .assistant-right {
          flex-shrink: 0;
        }

        .speech-bubble-card {
          background: rgba(4, 38, 26, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(229, 193, 88, 0.4);
          border-radius: 22px;
          padding: 18px 28px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease;
          max-width: 380px;
          text-align: center;
        }

        .speech-bubble-card:hover {
          transform: scale(1.02);
          border-color: #e5c158;
        }

        .hindi-message {
          font-size: 14.5px;
          line-height: 1.55;
          color: #ffffff;
          font-weight: 500;
          text-align: center;
          margin-bottom: 12px;
        }

        .audio-wave-visualizer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 22px;
        }

        .wave-bar {
          width: 3px;
          background: #e5c158;
          border-radius: 2px;
          animation: waveBar 1.2s infinite ease-in-out;
        }

        .bar-1 { height: 5px; animation-delay: 0.1s; }
        .bar-2 { height: 13px; animation-delay: 0.25s; }
        .bar-3 { height: 19px; animation-delay: 0.4s; }
        .bar-4 { height: 7px; animation-delay: 0.15s; }
        .bar-5 { height: 17px; animation-delay: 0.5s; }
        .bar-6 { height: 22px; animation-delay: 0.3s; }
        .bar-7 { height: 11px; animation-delay: 0.2s; }
        .bar-8 { height: 18px; animation-delay: 0.6s; }
        .bar-9 { height: 6px; animation-delay: 0.35s; }
        .bar-10 { height: 20px; animation-delay: 0.45s; }
        .bar-11 { height: 10px; animation-delay: 0.25s; }
        .bar-12 { height: 15px; animation-delay: 0.55s; }
        .bar-13 { height: 20px; animation-delay: 0.3s; }
        .bar-14 { height: 8px; animation-delay: 0.15s; }
        .bar-15 { height: 5px; animation-delay: 0.05s; }

        @media (max-width: 992px) {
          .assistant-grid {
            flex-direction: column;
            align-items: stretch;
          }
          .assistant-right {
            display: flex;
            justify-content: center;
          }
          .speech-bubble-card {
            max-width: 100%;
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .assistant-card {
            padding: 26px 18px;
            border-radius: 20px;
          }
          .assistant-left {
            flex-direction: column;
            text-align: center;
            align-items: center;
            gap: 16px;
          }
          .voice-waves-left {
            display: none;
          }
          .assistant-details {
            align-items: center;
          }
          .assistant-title {
            font-size: 26px;
          }
          .hindi-message {
            font-size: 13.5px;
          }
        }
      `}</style>
    </section>
  );
}
