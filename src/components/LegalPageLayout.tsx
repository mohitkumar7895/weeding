'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';

export interface LegalSection {
  id: string;
  number: number;
  title: string;
  content: React.ReactNode;
}

interface LegalPageLayoutProps {
  currentSlug: 'privacy-policy' | 'terms-condition' | 'payment-refund';
  documentTitle: string;
  documentSubtitle?: string;
  effectiveDate?: string;
  lastUpdated?: string;
  sections: LegalSection[];
  summaryHighlights?: {
    icon: string;
    title: string;
    description: string;
  }[];
}

export default function LegalPageLayout({
  currentSlug,
  documentTitle,
  documentSubtitle,
  effectiveDate = '8 October 2026',
  lastUpdated = '8 October 2026',
  sections,
  summaryHighlights,
}: LegalPageLayoutProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id || '');
  const [copiedLink, setCopiedLink] = useState(false);

  const filteredSections = searchQuery.trim()
    ? sections.filter(
        (sec) =>
          sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (typeof sec.content === 'string' &&
            sec.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : sections;

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="legal-page-root">
      <Navbar
        onOpenLogin={() => {
          setAuthMode('login');
          setAuthModalOpen(true);
        }}
        onOpenRegister={() => {
          setAuthMode('register');
          setAuthModalOpen(true);
        }}
      />

      <main className="legal-main">
        {/* Hero Banner */}
        <section className="legal-hero">
          <div className="container-custom">
            <div className="breadcrumbs">
              <Link href="/" className="bc-link">Home</Link>
              <span className="bc-sep">/</span>
              <span className="bc-current">Legal &amp; Policies</span>
              <span className="bc-sep">/</span>
              <span className="bc-active">{documentTitle}</span>
            </div>

            <div className="hero-badge-row">
              <span className="company-badge">WEDWITHME PLATFORM PRIVATE LIMITED</span>
              <span className="policy-badge">Official Legal Document</span>
            </div>

            <h1 className="legal-title">{documentTitle}</h1>
            {documentSubtitle && <p className="legal-subtitle">{documentSubtitle}</p>}

            {/* Document Meta Information */}
            <div className="meta-card">
              <div className="meta-item">
                <span className="meta-lbl">Platform</span>
                <strong className="meta-val">WedWithMe</strong>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Effective Date</span>
                <strong className="meta-val">{effectiveDate}</strong>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Last Updated</span>
                <strong className="meta-val">{lastUpdated}</strong>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Jurisdiction</span>
                <strong className="meta-val">Laws of India (DPDP Act, 2023)</strong>
              </div>
            </div>

            {/* Document Switcher Tabs */}
            <div className="policy-nav-tabs">
              <Link
                href="/privacy-policy"
                className={`policy-tab ${currentSlug === 'privacy-policy' ? 'active' : ''}`}
              >
                <span className="tab-icon">🔒</span>
                <span>Privacy Policy</span>
              </Link>
              <Link
                href="/terms-condition"
                className={`policy-tab ${currentSlug === 'terms-condition' ? 'active' : ''}`}
              >
                <span className="tab-icon">📜</span>
                <span>Terms &amp; Conditions</span>
              </Link>
              <Link
                href="/payment-refund"
                className={`policy-tab ${currentSlug === 'payment-refund' ? 'active' : ''}`}
              >
                <span className="tab-icon">💳</span>
                <span>Payment &amp; Refund Policy</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Summary Highlights if any */}
        {summaryHighlights && summaryHighlights.length > 0 && (
          <section className="summary-highlights-section">
            <div className="container-custom">
              <div className="highlights-grid">
                {summaryHighlights.map((hl, idx) => (
                  <div key={idx} className="highlight-card">
                    <span className="highlight-icon">{hl.icon}</span>
                    <h3 className="highlight-title">{hl.title}</h3>
                    <p className="highlight-desc">{hl.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Content Section with Sticky Sidebar */}
        <section className="legal-body-section">
          <div className="container-custom">
            <div className="legal-layout-grid">
              {/* Left Column: Table of Contents & Quick Actions */}
              <aside className="legal-sidebar">
                <div className="sticky-sidebar-inner">
                  {/* Action Bar */}
                  <div className="sidebar-action-box">
                    <button onClick={handlePrint} className="action-btn" title="Print this document">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Print
                    </button>
                    <button onClick={handleCopyLink} className="action-btn" title="Copy page link">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {copiedLink ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>

                  {/* Search within document */}
                  <div className="sidebar-search">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search in policy..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="search-clear-btn">
                        ×
                      </button>
                    )}
                  </div>

                  {/* Table of Contents list */}
                  <div className="toc-box">
                    <h3 className="toc-title">Table of Contents</h3>
                    <ul className="toc-list">
                      {sections.map((sec) => (
                        <li key={sec.id}>
                          <button
                            onClick={() => scrollToSection(sec.id)}
                            className={`toc-btn ${activeSectionId === sec.id ? 'active' : ''}`}
                          >
                            <span className="toc-num">{sec.number}.</span>
                            <span className="toc-text">{sec.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Official Grievance & Support Box */}
                  <div className="sidebar-support-box">
                    <h4 className="support-heading">Grievance &amp; Legal Support</h4>
                    <p className="support-desc">
                      WedWithMe Platform Private Limited is committed to transparent resolutions under Indian law.
                    </p>
                    <div className="support-links">
                      <a href="tel:6399239252" className="support-link">
                        📞 +91 6399239252
                      </a>
                      <a href="mailto:primepixelgmb@gmail.com" className="support-link">
                        ✉️ primepixelgmb@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Right Column: Sections Content */}
              <div className="legal-content-column">
                <div className="doc-preamble-card">
                  <div className="preamble-header">
                    <div className="preamble-shield">⚖️</div>
                    <div>
                      <h2 className="preamble-title">Binding Agreement &amp; Transparency Notice</h2>
                      <p className="preamble-text">
                        Please read this policy carefully. It outlines your rights, our obligations, data security measures,
                        and the legal framework under which WedWithMe operates in accordance with applicable laws in India.
                      </p>
                    </div>
                  </div>
                </div>

                {filteredSections.length === 0 ? (
                  <div className="no-results-card">
                    <p>No matching sections found for "{searchQuery}".</p>
                    <button onClick={() => setSearchQuery('')} className="btn-reset-search">
                      Reset Search
                    </button>
                  </div>
                ) : (
                  <div className="sections-container">
                    {filteredSections.map((sec) => (
                      <article key={sec.id} id={sec.id} className="section-card">
                        <header className="section-header">
                          <span className="section-num-pill">{sec.number}</span>
                          <h2 className="section-title">{sec.title}</h2>
                        </header>
                        <div className="section-body">{sec.content}</div>
                      </article>
                    ))}
                  </div>
                )}

                {/* Bottom Legal Acknowledgement Card */}
                <div className="legal-ack-card">
                  <div className="ack-seal">🏛️</div>
                  <div>
                    <h3 className="ack-title">WedWithMe Platform Private Limited</h3>
                    <p className="ack-text">
                      Registered in India. We comply with Indian consumer protection standards, digital intermediary guidelines,
                      and the Digital Personal Data Protection Act, 2023.
                    </p>
                    <p className="ack-contact">
                      For grievance inquiries, write to: <strong>primepixelgmb@gmail.com</strong> or call <strong>+91 6399239252</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />

      <Footer />

      <style jsx>{`
        .legal-page-root {
          min-height: 100vh;
          background: #fbf9f6;
          display: flex;
          flex-direction: column;
          color: #1a221f;
        }

        .legal-main {
          flex: 1;
        }

        /* Hero */
        .legal-hero {
          background-color: #031710;
          background-image: radial-gradient(circle at 50% 30%, rgba(6, 42, 28, 0.9) 0%, rgba(3, 23, 16, 0.98) 100%);
          border-bottom: 1px solid rgba(229, 193, 88, 0.22);
          color: #ffffff;
          padding: 40px 0 32px;
        }

        .breadcrumbs {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #9cb1a6;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .bc-link {
          color: #9cb1a6;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .bc-link:hover {
          color: #e5c158;
        }

        .bc-sep {
          color: rgba(229, 193, 88, 0.4);
        }

        .bc-current {
          color: #c9d6ce;
        }

        .bc-active {
          color: #e5c158;
          font-weight: 600;
        }

        .hero-badge-row {
          display: flex;
          gap: 10px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .company-badge {
          display: inline-block;
          background: rgba(229, 193, 88, 0.12);
          color: #e5c158;
          border: 1px solid rgba(229, 193, 88, 0.35);
          padding: 4px 12px;
          border-radius: 50px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .policy-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 50px;
          font-size: 11.5px;
          font-weight: 600;
        }

        .legal-title {
          font-family: var(--font-playfair, Georgia, serif);
          font-size: 38px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .legal-subtitle {
          font-size: 15px;
          color: #b8ccbe;
          max-width: 780px;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .meta-card {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(229, 193, 88, 0.18);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 26px;
          backdrop-filter: blur(8px);
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-lbl {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #8fa699;
          font-weight: 600;
        }

        .meta-val {
          font-size: 13.5px;
          color: #f5ede0;
          font-weight: 600;
        }

        /* Policy Switcher Tabs */
        .policy-nav-tabs {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          border-top: 1px solid rgba(229, 193, 88, 0.12);
          padding-top: 18px;
        }

        .policy-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          color: #c9d6ce;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(229, 193, 88, 0.2);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .policy-tab:hover {
          background: rgba(229, 193, 88, 0.15);
          color: #ffffff;
          border-color: #e5c158;
          transform: translateY(-1px);
        }

        .policy-tab.active {
          background: #e5c158;
          color: #031710;
          border-color: #e5c158;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(229, 193, 88, 0.3);
        }

        .tab-icon {
          font-size: 15px;
        }

        /* Summary Highlights */
        .summary-highlights-section {
          padding: 28px 0 8px;
          background: #fdfaf6;
        }

        .highlights-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .highlight-card {
          background: #ffffff;
          border: 1px solid #ebd8bd;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          transition: transform 0.2s ease;
        }

        .highlight-card:hover {
          transform: translateY(-2px);
        }

        .highlight-icon {
          font-size: 26px;
          display: block;
          margin-bottom: 10px;
        }

        .highlight-title {
          font-size: 15px;
          font-weight: 700;
          color: #031710;
          margin-bottom: 6px;
        }

        .highlight-desc {
          font-size: 13px;
          color: #5d6763;
          line-height: 1.55;
          margin: 0;
        }

        /* Body Section */
        .legal-body-section {
          padding: 36px 0 70px;
        }

        .legal-layout-grid {
          display: grid;
          grid-template-columns: 310px 1fr;
          gap: 36px;
          align-items: flex-start;
        }

        /* Sticky Sidebar */
        .legal-sidebar {
          position: sticky;
          top: 90px;
        }

        .sticky-sidebar-inner {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sidebar-action-box {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #ffffff;
          border: 1px solid #e0d7c7;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12.5px;
          font-weight: 600;
          color: #2b3a32;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: #031710;
          color: #e5c158;
          border-color: #031710;
        }

        .sidebar-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e0d7c7;
          border-radius: 8px;
          padding: 8px 12px;
        }

        .sidebar-search input {
          border: none;
          outline: none;
          font-size: 13px;
          width: 100%;
          background: transparent;
        }

        .search-clear-btn {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: #888;
        }

        .toc-box {
          background: #ffffff;
          border: 1px solid #e0d7c7;
          border-radius: 12px;
          padding: 18px 16px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.02);
          max-height: 440px;
          overflow-y: auto;
        }

        .toc-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #8c733e;
          margin-bottom: 12px;
        }

        .toc-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .toc-btn {
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 13px;
          color: #4a5951;
          cursor: pointer;
          display: flex;
          align-items: baseline;
          gap: 6px;
          transition: all 0.15s ease;
          line-height: 1.4;
        }

        .toc-btn:hover {
          background: #f7f3eb;
          color: #031710;
        }

        .toc-btn.active {
          background: #031710;
          color: #e5c158;
          font-weight: 700;
        }

        .toc-num {
          font-weight: 700;
          font-size: 12px;
          min-width: 18px;
        }

        .toc-text {
          flex: 1;
        }

        .sidebar-support-box {
          background: #ffffff;
          border: 1px solid #ebd8bd;
          border-left: 4px solid #e5c158;
          border-radius: 10px;
          padding: 16px;
        }

        .support-heading {
          font-size: 13.5px;
          font-weight: 700;
          color: #031710;
          margin-bottom: 6px;
        }

        .support-desc {
          font-size: 12px;
          color: #616e67;
          line-height: 1.5;
          margin-bottom: 10px;
        }

        .support-links {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .support-link {
          font-size: 12.5px;
          font-weight: 600;
          color: #031710;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .support-link:hover {
          color: #b8932f;
        }

        /* Right Content Column */
        .legal-content-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .doc-preamble-card {
          background: linear-gradient(135deg, #fbf7ee 0%, #f4ede0 100%);
          border: 1px solid #e2d1b8;
          border-radius: 14px;
          padding: 20px 24px;
        }

        .preamble-header {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .preamble-shield {
          font-size: 28px;
          line-height: 1;
        }

        .preamble-title {
          font-size: 16px;
          font-weight: 800;
          color: #031710;
          margin-bottom: 4px;
        }

        .preamble-text {
          font-size: 13.5px;
          color: #4a5650;
          line-height: 1.6;
          margin: 0;
        }

        .sections-container {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .section-card {
          background: #ffffff;
          border: 1px solid #ebd8bd;
          border-radius: 14px;
          padding: 28px 32px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
          scroll-margin-top: 100px;
          transition: border-color 0.2s ease;
        }

        .section-card:hover {
          border-color: #d1b47b;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-bottom: 14px;
          margin-bottom: 16px;
          border-bottom: 1px solid #f3ece1;
        }

        .section-num-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #031710;
          color: #e5c158;
          font-size: 14px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .section-title {
          font-family: var(--font-playfair, Georgia, serif);
          font-size: 20px;
          font-weight: 700;
          color: #031710;
          margin: 0;
          letter-spacing: -0.2px;
        }

        .section-body {
          font-size: 14.5px;
          color: #3b4742;
          line-height: 1.75;
        }

        .section-body :global(p) {
          margin-bottom: 14px;
        }

        .section-body :global(p:last-child) {
          margin-bottom: 0;
        }

        .section-body :global(ul) {
          padding-left: 20px;
          margin: 12px 0;
        }

        .section-body :global(li) {
          margin-bottom: 8px;
          line-height: 1.65;
        }

        .section-body :global(.highlight-box) {
          background: #f9f6ed;
          border-left: 3px solid #e5c158;
          padding: 14px 18px;
          border-radius: 6px;
          margin: 14px 0;
          font-size: 13.5px;
          color: #37423d;
        }

        .section-body :global(.important-box) {
          background: #fdf2f2;
          border-left: 3px solid #ff4d6d;
          padding: 14px 18px;
          border-radius: 6px;
          margin: 14px 0;
          font-size: 13.5px;
          color: #5c2020;
        }

        .legal-ack-card {
          background: #ffffff;
          border: 1px solid #d8caa7;
          border-radius: 14px;
          padding: 24px 28px;
          display: flex;
          gap: 20px;
          align-items: center;
          margin-top: 10px;
        }

        .ack-seal {
          font-size: 38px;
          flex-shrink: 0;
        }

        .ack-title {
          font-size: 16px;
          font-weight: 800;
          color: #031710;
          margin-bottom: 4px;
        }

        .ack-text {
          font-size: 13px;
          color: #59645f;
          line-height: 1.6;
          margin-bottom: 6px;
        }

        .ack-contact {
          font-size: 12.5px;
          color: #031710;
          margin: 0;
        }

        .no-results-card {
          background: #ffffff;
          border: 1px dashed #cca;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          color: #666;
        }

        .btn-reset-search {
          margin-top: 10px;
          background: #031710;
          color: #e5c158;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .meta-card {
            grid-template-columns: repeat(2, 1fr);
          }
          .legal-layout-grid {
            grid-template-columns: 1fr;
          }
          .legal-sidebar {
            position: static;
          }
          .highlights-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .legal-hero {
            padding: 28px 0 20px;
          }
          .legal-title {
            font-size: 28px;
          }
          .meta-card {
            grid-template-columns: 1fr;
            padding: 12px 16px;
          }
          .section-card {
            padding: 20px 18px;
          }
          .section-title {
            font-size: 18px;
          }
          .policy-tab {
            font-size: 12px;
            padding: 8px 12px;
          }
        }
      `}</style>
    </div>
  );
}
