'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer-wrapper">
      <div className="container-custom">
        <div className="footer-top-grid">
          {/* Column 1: Brand */}
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <div className="footer-logo-svg">
                <img src="/logo.png" alt="WedWithMe Logo" style={{ height: '36px', width: 'auto', borderRadius: '4px' }} />
              </div>

              <div className="brand-text-block">
                <h3 className="brand-name brand-name-text">WedWithMe</h3>
                <p className="brand-motto">From Match to Marriage</p>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="footer-links-col">
            <h4 className="col-heading">Quick Links</h4>
            <ul className="footer-link-list">
              <li><Link href="/" className="footer-link">Home</Link></li>
              <li><Link href="/vendors" className="footer-link">Vendors</Link></li>
              <li><Link href="/matches" className="footer-link">Matches</Link></li>
              <li><Link href="/bookings" className="footer-link">Bookings</Link></li>
              <li><Link href="/about" className="footer-link">About Us</Link></li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="footer-links-col">
            <h4 className="col-heading">Support</h4>
            <ul className="footer-link-list">
              <li><Link href="#" className="footer-link">Help Center</Link></li>
              <li><Link href="#" className="footer-link">Contact Us</Link></li>
              <li><a href="mailto:primepixelgmb@gmail.com" className="footer-link">primepixelgmb@gmail.com</a></li>
              <li><Link href="#" className="footer-link">Terms & Conditions</Link></li>
              <li><Link href="#" className="footer-link">Privacy Policy</Link></li>
              <li><Link href="#" className="footer-link">FAQs</Link></li>
            </ul>
          </div>

          {/* Column 4: Follow Us */}
          <div className="footer-social-col">
            <h4 className="col-heading">Follow Us</h4>
            <div className="social-icons-row">
              {/* Facebook */}
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              {/* Instagram */}
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              {/* YouTube */}
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="YouTube">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 5: Download Our App */}
          <div className="footer-app-col">
            <h4 className="col-heading">Download Our App</h4>
            <div className="app-badges">
              {/* App Store Badge */}
              <a href="#" className="app-badge-btn" aria-label="Download on Apple App Store">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.35-.57.65-1.07 1.71-.93 2.73 1.01.08 2.03-.49 2.65-1.23z" />
                </svg>
                <div className="badge-text">
                  <span className="badge-sub">Download on the</span>
                  <span className="badge-main">App Store</span>
                </div>
              </a>

              {/* Google Play Badge */}
              <a href="#" className="app-badge-btn" aria-label="Get it on Google Play">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.6 2.4L13.8 12.6 3.6 22.8C3.2 22.4 3 21.8 3 21V4C3 3.2 3.2 2.6 3.6 2.4ZM15.2 14L17.5 16.3 5.4 23.3C4.6 23.7 3.9 23.6 3.6 23.1L15.2 14ZM19 12L15.9 8.9 19.3 12.3C19.7 11.9 19.7 12.1 19 12ZM15.2 10L3.6 1.9C3.9 1.4 4.6 1.3 5.4 1.7L17.5 8.7 15.2 10Z" />
                </svg>
                <div className="badge-text">
                  <span className="badge-sub">GET IT ON</span>
                  <span className="badge-main">Google Play</span>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Legal Bar */}
        <div className="footer-bottom-bar">
          <div className="copyright-text">
            © 2026 WedWithMe Platform Pvt. Ltd. All rights reserved.
          </div>
          <div className="market-tag">
            Transforming India&apos;s $130B+ Wedding Market
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer-wrapper {
          background-color: #031710;
          background-image: radial-gradient(circle at 50% 50%, rgba(6, 42, 28, 0.6) 0%, rgba(3, 23, 16, 0.98) 100%);
          border-top: 1px solid rgba(229, 193, 88, 0.2);
          color: #ffffff;
          padding: 56px 0 28px;
        }

        .footer-top-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 1fr 1.3fr;
          gap: 32px;
          padding-bottom: 44px;
        }

        .footer-brand-header {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-name {
          font-family: var(--font-serif);
          font-size: 22px;
          font-weight: 700;
          color: #e5c158;
          margin-bottom: 3px;
        }

        .brand-motto {
          font-size: 12.5px;
          color: #e5c158;
          font-weight: 600;
        }

        .col-heading {
          font-size: 14px;
          font-weight: 700;
          color: #e5c158;
          margin-bottom: 18px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }

        .footer-link-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .footer-link {
          font-size: 13.5px;
          color: #9cb1a6;
          transition: color 0.2s ease, transform 0.2s ease;
          display: inline-block;
        }

        .footer-link:hover {
          color: #ffffff;
          transform: translateX(3px);
        }

        .social-icons-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .social-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(229, 193, 88, 0.08);
          border: 1px solid rgba(229, 193, 88, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e5c158;
          transition: all 0.2s ease;
        }

        .social-btn:hover {
          background: #e5c158;
          border-color: #e5c158;
          color: #031710;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(229, 193, 88, 0.3);
        }

        .app-badges {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .app-badge-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(3, 23, 16, 0.9);
          border: 1px solid rgba(229, 193, 88, 0.25);
          border-radius: 9px;
          padding: 7px 16px;
          width: fit-content;
          transition: all 0.2s ease;
        }

        .app-badge-btn:hover {
          border-color: #e5c158;
          transform: translateY(-1px);
        }

        .badge-text {
          display: flex;
          flex-direction: column;
        }

        .badge-sub {
          font-size: 9px;
          color: #9cb1a6;
          line-height: 1;
        }

        .badge-main {
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
        }

        .footer-bottom-bar {
          border-top: 1px solid rgba(229, 193, 88, 0.12);
          padding-top: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12.5px;
          color: #9cb1a6;
        }

        .market-tag {
          color: #e5c158;
          font-weight: 500;
        }

        @media (max-width: 1024px) {
          .footer-top-grid {
            grid-template-columns: repeat(3, 1fr);
            row-gap: 28px;
          }
        }

        @media (max-width: 768px) {
          .footer-wrapper {
            padding: 22px 0 16px;
          }
          .footer-top-grid {
            grid-template-columns: 1fr 1fr;
            row-gap: 16px;
            column-gap: 16px;
            padding-bottom: 16px;
          }
          .footer-brand-col {
            grid-column: span 2;
          }
          .footer-brand-header {
            gap: 10px;
          }
          .brand-name {
            font-size: 18px;
            margin-bottom: 0;
          }
          .brand-motto {
            font-size: 11px;
          }
          .col-heading {
            font-size: 12px;
            margin-bottom: 8px;
          }
          .footer-link-list {
            gap: 5px;
          }
          .footer-link {
            font-size: 12px;
          }
          .footer-social-col {
            grid-column: span 2;
          }
          .social-icons-row {
            gap: 8px;
          }
          .social-btn {
            width: 32px;
            height: 32px;
          }
          .footer-app-col {
            grid-column: span 2;
          }
          .app-badges {
            flex-direction: row;
            gap: 8px;
          }
          .app-badge-btn {
            padding: 6px 10px;
            gap: 6px;
          }
          .badge-main {
            font-size: 11px;
          }
          .badge-sub {
            font-size: 8px;
          }
          .footer-bottom-bar {
            padding-top: 12px;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 4px;
            font-size: 11px;
          }
          .market-tag {
            font-size: 10.5px;
          }
        }
      `}</style>
    </footer>
  );
}
