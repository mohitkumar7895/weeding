'use client';

import React from 'react';

export default function StatsBar() {
  const stats = [
    {
      id: 'couples',
      number: '50,000+',
      label: 'Happy Couples',
      icon: (
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" stroke="#e5c158" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {/* Interlocking wedding rings */}
          <circle cx="16" cy="22" r="10" />
          <circle cx="24" cy="22" r="10" />
          <path d="M20 9L21.5 12.5L25 14L21.5 15.5L20 19L18.5 15.5L15 14L18.5 12.5Z" fill="#e5c158" stroke="none" />
        </svg>
      ),
    },
    {
      id: 'vendors',
      number: '10,000+',
      label: 'Verified Vendors',
      icon: (
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" stroke="#e5c158" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {/* Storefront / Badge */}
          <path d="M7 14L10 6H30L33 14V32C33 33.1 32.1 34 31 34H9C7.9 34 7 33.1 7 32V14Z" />
          <path d="M7 14C8.5 16 11 16 12.5 14C14 16 16.5 16 18 14" />
          <path d="M22 14C23.5 16 26 16 27.5 14C29 16 31.5 16 33 14" />
          <path d="M16 23L19 26L25 19" stroke="#e5c158" strokeWidth="2" />
        </svg>
      ),
    },
    {
      id: 'cities',
      number: '100+',
      label: 'Cities in India',
      icon: (
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" stroke="#e5c158" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {/* Location map pin */}
          <path d="M20 6C14.48 6 10 10.48 10 16C10 23.5 20 34 20 34C20 34 30 23.5 30 16C30 10.48 25.52 6 20 6Z" />
          <circle cx="20" cy="16" r="4" />
        </svg>
      ),
    },
    {
      id: 'global',
      number: 'Global',
      label: 'Expansion Soon',
      icon: (
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" stroke="#e5c158" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {/* Globe */}
          <circle cx="20" cy="20" r="14" />
          <path d="M6 20H34" />
          <path d="M20 6C23.5 10 25.5 15 25.5 20C25.5 25 23.5 30 20 34" />
          <path d="M20 6C16.5 10 14.5 15 14.5 20C14.5 25 16.5 30 20 34" />
        </svg>
      ),
    },
  ];

  return (
    <section className="stats-section">
      <div className="container-custom">
        <div className="stats-grid">
          {stats.map((item) => (
            <div key={item.id} className="stat-col">
              <div className="stat-icon-wrap">{item.icon}</div>
              <div className="stat-number">{item.number}</div>
              <div className="stat-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .stats-section {
          background-color: #031710;
          background-image: radial-gradient(circle at 50% 50%, rgba(6, 42, 28, 0.6) 0%, rgba(3, 23, 16, 0.98) 100%);
          border-top: 1px solid rgba(229, 193, 88, 0.15);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 46px 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .stat-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: transform 0.2s ease;
        }

        .stat-col:hover {
          transform: translateY(-3px);
        }

        .stat-icon-wrap {
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 2px 8px rgba(229, 193, 88, 0.2));
        }

        .stat-number {
          font-family: var(--font-serif);
          font-size: 26px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 4px;
          letter-spacing: 0.3px;
        }

        .stat-label {
          font-size: 13.5px;
          color: #9cb1a6;
          font-weight: 500;
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            row-gap: 32px;
          }
        }

        @media (max-width: 480px) {
          .stats-section {
            padding: 36px 0;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
          .stat-number {
            font-size: 21px;
          }
          .stat-label {
            font-size: 12px;
          }
        }
      `}</style>
    </section>
  );
}
