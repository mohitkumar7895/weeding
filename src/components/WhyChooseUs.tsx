'use client';

import React from 'react';

export default function WhyChooseUs() {
  const reasons = [
    {
      id: 'ai',
      title: 'AI-Powered Personalization',
      iconColor: '#ec4899',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      ),
    },
    {
      id: 'vendors',
      title: 'Verified Vendors',
      iconColor: '#f43f5e',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      ),
    },
    {
      id: 'payments',
      title: 'Secure Payments',
      iconColor: '#f97316',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
    },
    {
      id: 'global',
      title: 'Global Reach',
      iconColor: '#ef4444',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      id: 'support',
      title: '24/7 Support',
      iconColor: '#e11d48',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="why-choose-section">
      <div className="container-custom">
        <h2 className="why-title">Why Choose WedWithMe?</h2>

        <div className="pills-container">
          {reasons.map((item) => (
            <div key={item.id} className="badge-pill">
              <span className="pill-icon" style={{ color: item.iconColor }}>
                {item.icon}
              </span>
              <span className="pill-label">{item.title}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .why-choose-section {
          padding: 36px 0 44px;
          background-color: #ffffff;
          text-align: center;
        }

        .why-title {
          font-family: var(--font-serif);
          font-size: 32px;
          font-weight: 700;
          color: #122119;
          margin-bottom: 24px;
          letter-spacing: -0.2px;
        }

        .pills-container {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 14px;
        }

        .badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          border: 1px solid #e2eae5;
          padding: 10px 20px;
          border-radius: 9999px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .badge-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.07);
          border-color: #cbd8cf;
        }

        .pill-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pill-label {
          font-size: 13.5px;
          font-weight: 600;
          color: #1a2c22;
        }

        @media (max-width: 640px) {
          .why-title {
            font-size: 26px;
            margin-bottom: 18px;
          }
          .pills-container {
            gap: 10px;
          }
          .badge-pill {
            padding: 8px 14px;
            font-size: 12px;
          }
        }
      `}</style>
    </section>
  );
}
