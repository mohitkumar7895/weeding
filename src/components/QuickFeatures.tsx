'use client';

import React from 'react';

interface QuickFeatureProps {
  onSelectFeature?: (id: string) => void;
}

export default function QuickFeatures({ onSelectFeature }: QuickFeatureProps) {
  const features = [
    {
      id: 'match',
      title: 'Find Your Match',
      subtitle: 'AI-Powered Compatibility',
      iconBg: '#fde8ef',
      iconColor: '#e6005c',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ),
    },
    {
      id: 'vendors',
      title: 'Wedding Vendors',
      subtitle: 'Verified & Trusted Professionals',
      iconBg: '#e6f3ee',
      iconColor: '#0b5336',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="14" r="5" />
          <circle cx="16" cy="14" r="5" />
          <path d="M8 9l1.5-3.5h5L16 9" />
          <circle cx="12" cy="5" r="1.5" />
        </svg>
      ),
    },
    {
      id: 'book',
      title: 'Book & Pay',
      subtitle: 'Secure & Simple Transactions',
      iconBg: '#fef7e9',
      iconColor: '#c59528',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <circle cx="6" cy="15" r="1" />
          <circle cx="10" cy="15" r="1" />
        </svg>
      ),
    },
    {
      id: 'track',
      title: 'Track & Manage',
      subtitle: 'Your Wedding with Ease',
      iconBg: '#e8f6f0',
      iconColor: '#126646',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      id: 'assistant',
      title: 'AI Assistant',
      subtitle: 'Sagun (Voice + Chat)',
      iconBg: '#fbf5e6',
      iconColor: '#d4a937',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      ),
    },
  ];

  return (
    <section className="quick-features-section">
      <div className="container-custom">
        <div className="features-grid">
          {features.map((item, index) => (
            <div
              key={item.id}
              className={`feature-card reveal-on-scroll stagger-${(index % 5) + 1}`}
              onClick={() => onSelectFeature && onSelectFeature(item.id)}
            >
              <div
                className="feature-icon-circle"
                style={{ backgroundColor: item.iconBg, color: item.iconColor }}
              >
                {item.icon}
              </div>
              <div className="feature-text">
                <h3 className="feature-title">{item.title}</h3>
                <p className="feature-subtitle">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .quick-features-section {
          padding: 32px 0 20px;
          background-color: #fbfcfa;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
        }

        .feature-card {
          background: #ffffff;
          border: 1px solid #e7eee9;
          border-radius: 20px;
          padding: 24px 14px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
          border-color: #cbdad1;
        }

        .feature-icon-circle {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          transition: transform 0.2s ease;
        }

        .feature-card:hover .feature-icon-circle {
          transform: scale(1.08);
        }

        .feature-title {
          font-size: 14.5px;
          font-weight: 700;
          color: #16241e;
          margin-bottom: 4px;
          letter-spacing: 0.1px;
        }

        .feature-subtitle {
          font-size: 12px;
          color: #6a7b72;
          line-height: 1.4;
        }

        @media (max-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 640px) {
          .quick-features-section {
            padding: 24px 0 16px;
          }
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .feature-card {
            padding: 16px 10px 14px;
            border-radius: 16px;
          }
          .feature-icon-circle {
            width: 42px;
            height: 42px;
            margin-bottom: 10px;
          }
          .feature-title {
            font-size: 13px;
          }
          .feature-subtitle {
            font-size: 11px;
          }
        }
      `}</style>
    </section>
  );
}
