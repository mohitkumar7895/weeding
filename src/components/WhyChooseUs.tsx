'use client';

import React from 'react';

export default function WhyChooseUs() {
  const items = [
    {
      id: 'ai',
      line1: 'AI-Powered',
      line2: 'Personalization',
      circleBg: '#ffe8f0',
      iconColor: '#ff2a73',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Butterfly / AI wings symbol */}
          <path d="M12 3c-1.5 2.5-3.5 4-6 4C3 7 2 9 2 11c0 3 2.5 5 5 5 1.5 0 3-.5 5-2m0-11c1.5 2.5 3.5 4 6 4 3 0 4 2 4 4 0 3-2.5 5-5 5-1.5 0-3-.5-5-2m0-11v18" />
          <path d="M7 14c-1.5 0-3 1-3 2.5 0 1.5 1.5 2.5 3 2.5 2 0 3.5-1.5 5-3m2 0c1.5 1.5 3 3 5 3 1.5 0 3-1 3-2.5 0-1.5-1.5-2.5-3-2.5" />
        </svg>
      ),
    },
    {
      id: 'vendors',
      line1: 'Verified',
      line2: 'Vendors',
      circleBg: '#ffe8f0',
      iconColor: '#ff2a73',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Heart shield verified */}
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          <path d="M9.5 12l1.8 1.8 3.5-3.5" strokeWidth="2.4" />
        </svg>
      ),
    },
    {
      id: 'payments',
      line1: 'Secure',
      line2: 'Payments',
      circleBg: '#fff2eb',
      iconColor: '#ff7043',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Credit card / Escrow document */}
          <rect x="2" y="4" width="20" height="16" rx="3" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <line x1="6" y1="15" x2="10" y2="15" />
          <circle cx="16" cy="15" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'global',
      line1: 'Global',
      line2: 'Reach',
      circleBg: '#fff3e0',
      iconColor: '#f57c00',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Globe */}
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      id: 'support',
      line1: '24/7',
      line2: 'Support',
      circleBg: '#ffebee',
      iconColor: '#e91e63',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* 24/7 Headset operator */}
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="why-choose-section">
      <div className="container-custom">
        {/* Left-aligned title matching reference screenshot exactly */}
        <h2 className="why-title">Why Choose WedWithMe?</h2>

        {/* 5-Column Grid with Circular Pastel Icons & 2-Line Labels */}
        <div className="why-grid">
          {items.map((item) => (
            <div key={item.id} className="why-card">
              <div
                className="icon-circle"
                style={{ backgroundColor: item.circleBg, color: item.iconColor }}
              >
                {item.icon}
              </div>
              <div className="card-text">
                <span className="text-line-1">{item.line1}</span>
                <span className="text-line-2">{item.line2}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .why-choose-section {
          padding: 44px 0 54px;
          background-color: #ffffff;
        }

        .why-title {
          font-family: var(--font-serif);
          font-size: 30px;
          font-weight: 700;
          color: #122119;
          margin-bottom: 26px;
          letter-spacing: -0.3px;
          text-align: left;
        }

        .why-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
        }

        .why-card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #f8faf8;
          border: 1px solid #e7eee9;
          padding: 14px 18px;
          border-radius: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
        }

        .why-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
          border-color: rgba(229, 193, 88, 0.45);
          background: #ffffff;
        }

        .icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }

        .why-card:hover .icon-circle {
          transform: scale(1.08);
        }

        .card-text {
          display: flex;
          flex-direction: column;
          line-height: 1.25;
        }

        .text-line-1 {
          font-size: 13.5px;
          font-weight: 700;
          color: #1a2c22;
          letter-spacing: -0.1px;
        }

        .text-line-2 {
          font-size: 12.5px;
          font-weight: 600;
          color: #485c51;
        }

        @media (max-width: 1100px) {
          .why-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .why-choose-section {
            padding: 34px 0 42px;
          }
          .why-title {
            font-size: 26px;
            margin-bottom: 20px;
          }
          .why-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .why-card {
            padding: 12px 14px;
            gap: 10px;
          }
          .icon-circle {
            width: 40px;
            height: 40px;
          }
        }

        @media (max-width: 480px) {
          .why-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
