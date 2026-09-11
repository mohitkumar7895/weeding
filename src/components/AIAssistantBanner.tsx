'use client';

import React from 'react';

interface AIAssistantBannerProps {
  onOpenSagun: () => void;
}

export default function AIAssistantBanner({ onOpenSagun }: AIAssistantBannerProps) {
  return (
    <section className="assistant-section">
      <div className="container-custom">
        <div className="assistant-card">
          {/* Subtle decorative gold line art watermark */}
          <div className="mandala-watermark">
            <svg width="240" height="240" viewBox="0 0 200 200" fill="none" opacity="0.1">
              <circle cx="100" cy="100" r="90" stroke="#e5c158" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="100" cy="100" r="70" stroke="#e5c158" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="50" stroke="#e5c158" strokeWidth="1" />
              <path d="M100 10 L100 190 M10 100 L190 100 M36 36 L164 164 M36 164 L164 36" stroke="#e5c158" strokeWidth="0.8" />
            </svg>
          </div>

          <div className="assistant-grid">
            {/* Left Side: Avatar & Intro */}
            <div className="assistant-left">
              {/* Avatar with audio wave rings */}
              <div className="avatar-container" onClick={onOpenSagun}>
                <div className="wave-ring ring-1"></div>
                <div className="wave-ring ring-2"></div>
                <div className="wave-ring ring-3"></div>
                <div className="avatar-img-wrap">
                  <img
                    src="/images/sagun.jpg"
                    alt="Sagun - AI Wedding Assistant"
                    className="avatar-img"
                  />
                  <div className="online-badge"></div>
                </div>
              </div>

              {/* Copy */}
              <div className="assistant-details">
                <h2 className="assistant-title">Meet Sagun</h2>
                <h3 className="assistant-role">Your AI Wedding Assistant</h3>
                <p className="assistant-tagline">
                  Ask, Plan, Book — in your language, with your voice.
                </p>
                <button className="btn-try-sagun" onClick={onOpenSagun}>
                  <span>Try Now</span>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right Side: Hindi Dialogue Bubble & Audio Wave */}
            <div className="assistant-right">
              <div className="speech-bubble-card" onClick={onOpenSagun}>
                <div className="hindi-message">
                  नमस्ते! मैं हूँ शगुन,
                  <br />
                  आपकी AI वेडिंग असिस्टेंट!
                  <br />
                  आपकी कैसे मदद कर सकती हूँ?
                </div>

                {/* Animated Audio Sound Wave */}
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
          background: linear-gradient(135deg, #032115 0%, #063121 50%, #032115 100%);
          border-radius: 28px;
          padding: 38px 46px;
          overflow: hidden;
          box-shadow: 0 16px 48px rgba(3, 33, 21, 0.22);
          border: 1px solid rgba(229, 193, 88, 0.22);
        }

        .mandala-watermark {
          position: absolute;
          right: -30px;
          bottom: -40px;
          pointer-events: none;
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
          gap: 28px;
          flex: 1;
        }

        /* Animated sound waves around Sagun */
        .avatar-container {
          position: relative;
          width: 104px;
          height: 104px;
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
          z-index: 3;
        }

        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .online-badge {
          position: absolute;
          bottom: 6px;
          right: 6px;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #10b981;
          border: 2px solid #032115;
        }

        .wave-ring {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid rgba(229, 193, 88, 0.4);
          pointer-events: none;
        }

        .ring-1 {
          inset: -8px;
          animation: pulseRings 2.8s infinite ease-out;
        }

        .ring-2 {
          inset: -18px;
          animation: pulseRings 2.8s infinite 0.9s ease-out;
        }

        .ring-3 {
          inset: -28px;
          animation: pulseRings 2.8s infinite 1.8s ease-out;
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
        }

        .assistant-role {
          font-size: 17px;
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
        }

        .btn-try-sagun {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 700;
          padding: 9px 24px;
          border-radius: 9999px;
          width: fit-content;
          box-shadow: 0 4px 14px rgba(230, 0, 92, 0.38);
          transition: all 0.2s ease;
        }

        .btn-try-sagun:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(230, 0, 92, 0.55);
          filter: brightness(1.08);
        }

        /* Speech Bubble */
        .assistant-right {
          flex-shrink: 0;
        }

        .speech-bubble-card {
          background: rgba(6, 44, 30, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(229, 193, 88, 0.45);
          border-radius: 22px;
          padding: 20px 28px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease;
          max-width: 380px;
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
          margin-bottom: 14px;
        }

        .audio-wave-visualizer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 24px;
        }

        .wave-bar {
          width: 3px;
          background: #e5c158;
          border-radius: 2px;
          animation: waveBar 1.2s infinite ease-in-out;
        }

        .bar-1 { height: 6px; animation-delay: 0.1s; }
        .bar-2 { height: 14px; animation-delay: 0.25s; }
        .bar-3 { height: 20px; animation-delay: 0.4s; }
        .bar-4 { height: 8px; animation-delay: 0.15s; }
        .bar-5 { height: 18px; animation-delay: 0.5s; }
        .bar-6 { height: 24px; animation-delay: 0.3s; }
        .bar-7 { height: 12px; animation-delay: 0.2s; }
        .bar-8 { height: 19px; animation-delay: 0.6s; }
        .bar-9 { height: 7px; animation-delay: 0.35s; }
        .bar-10 { height: 22px; animation-delay: 0.45s; }
        .bar-11 { height: 11px; animation-delay: 0.25s; }
        .bar-12 { height: 16px; animation-delay: 0.55s; }
        .bar-13 { height: 21px; animation-delay: 0.3s; }
        .bar-14 { height: 9px; animation-delay: 0.15s; }
        .bar-15 { height: 6px; animation-delay: 0.05s; }

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
            padding: 28px 20px;
            border-radius: 20px;
          }
          .assistant-left {
            flex-direction: column;
            text-align: center;
            align-items: center;
            gap: 18px;
          }
          .assistant-details {
            align-items: center;
          }
          .assistant-title {
            font-size: 27px;
          }
          .hindi-message {
            font-size: 13.5px;
          }
        }
      `}</style>
    </section>
  );
}
