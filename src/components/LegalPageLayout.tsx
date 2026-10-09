'use client';

import React, { useState, useEffect } from 'react';
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
  const [scrollProgress, setScrollProgress] = useState(0);

  // Scroll Progress listener
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver to auto-update active TOC item on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -55% 0px', threshold: 0.1 }
    );

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const filteredSections = searchQuery.trim()
    ? sections.filter((sec) => {
        const q = searchQuery.toLowerCase();
        return (
          sec.title.toLowerCase().includes(q) ||
          (typeof sec.content === 'string' && sec.content.toLowerCase().includes(q))
        );
      })
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
      {/* Golden Scroll Progress Bar */}
      <div className="reading-progress-track" aria-hidden>
        <div className="reading-progress-bar" style={{ width: `${scrollProgress}%` }} />
      </div>

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
        {/* Luxury Hero Banner */}
        <section className="legal-hero">
          {/* Subtle gold ambient glow */}
          <div className="hero-gold-glow" aria-hidden />

          <div className="container-custom hero-inner-container">
            {/* Breadcrumb Navigation */}
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <Link href="/" className="bc-link">Home</Link>
              <span className="bc-sep">/</span>
              <span className="bc-parent">Legal Transparency</span>
              <span className="bc-sep">/</span>
              <span className="bc-active">{documentTitle}</span>
            </nav>

            {/* Official Seal / Company Header */}
            <div className="official-company-row">
              <div className="seal-emblem" aria-hidden>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e5c158" strokeWidth="2">
                  <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                  <path d="M9 12l2 2 4-4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="company-text-meta">
                <span className="company-name-pill">WEDWITHME PLATFORM PRIVATE LIMITED</span>
                <span className="compliance-tag">CIN Registered • Digital Intermediary Notice</span>
              </div>
            </div>

            {/* Title with Gold Gradient */}
            <div className="hero-heading-block">
              <h1 className="legal-hero-title">{documentTitle}</h1>
              {documentSubtitle && (
                <p className="legal-hero-subtitle">{documentSubtitle}</p>
              )}
            </div>

            {/* Interactive Policy Switcher Navigation */}
            <div className="policy-switch-wrapper">
              <div className="policy-switch-header">
                <span className="switch-hint">Explore Official Policies:</span>
              </div>
              <div className="policy-switch-pills">
                <Link
                  href="/privacy-policy"
                  className={`policy-pill-btn ${currentSlug === 'privacy-policy' ? 'active' : ''}`}
                >
                  <span className="pill-icon">🔒</span>
                  <span className="pill-text">Privacy Policy</span>
                  {currentSlug === 'privacy-policy' && <span className="active-dot" />}
                </Link>

                <Link
                  href="/terms-condition"
                  className={`policy-pill-btn ${currentSlug === 'terms-condition' ? 'active' : ''}`}
                >
                  <span className="pill-icon">📜</span>
                  <span className="pill-text">Terms &amp; Conditions</span>
                  {currentSlug === 'terms-condition' && <span className="active-dot" />}
                </Link>

                <Link
                  href="/payment-refund"
                  className={`policy-pill-btn ${currentSlug === 'payment-refund' ? 'active' : ''}`}
                >
                  <span className="pill-icon">💳</span>
                  <span className="pill-text">Payment &amp; Refund Policy</span>
                  {currentSlug === 'payment-refund' && <span className="active-dot" />}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        {summaryHighlights && summaryHighlights.length > 0 && (
          <section className="summary-highlights-section">
            <div className="container-custom">
              <div className="highlights-grid">
                {summaryHighlights.map((hl, idx) => (
                  <div key={idx} className="highlight-luxury-card">
                    <div className="highlight-icon-halo">
                      <span className="highlight-icon-sym">{hl.icon}</span>
                    </div>
                    <div className="highlight-info">
                      <h3 className="highlight-title">{hl.title}</h3>
                      <p className="highlight-desc">{hl.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Main Content Layout with Sticky Sidebar */}
        <section className="legal-body-section">
          <div className="container-custom">
            <div className="legal-layout-grid">
              {/* Left Column: Interactive Sticky Sidebar */}
              <aside className="legal-sidebar">
                <div className="sticky-sidebar-inner">
                  {/* Quick Action Buttons */}
                  <div className="sidebar-action-bar">
                    <button onClick={handlePrint} className="lux-action-btn" title="Print document">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      <span>Print Document</span>
                    </button>

                    <button onClick={handleCopyLink} className="lux-action-btn" title="Copy document URL">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>{copiedLink ? 'Link Copied ✓' : 'Share Link'}</span>
                    </button>
                  </div>

                  {/* Search inside Document */}
                  <div className="sidebar-search-box">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e5c158" strokeWidth="2.2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search clauses (e.g. refund, data)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search within policy"
                    />
                    {searchQuery ? (
                      <button onClick={() => setSearchQuery('')} className="search-clear-btn" aria-label="Clear search">
                        ✕
                      </button>
                    ) : (
                      <span className="search-count-pill">{sections.length}</span>
                    )}
                  </div>

                  {/* Table of Contents */}
                  <div className="toc-luxury-box">
                    <div className="toc-head">
                      <span className="toc-badge-dot" />
                      <h3 className="toc-title">Table of Contents</h3>
                    </div>

                    <ul className="toc-items-list">
                      {sections.map((sec) => {
                        const isActive = activeSectionId === sec.id;
                        return (
                          <li key={sec.id}>
                            <button
                              onClick={() => scrollToSection(sec.id)}
                              className={`toc-item-btn ${isActive ? 'active' : ''}`}
                            >
                              <span className="toc-item-num">{sec.number}</span>
                              <span className="toc-item-text">{sec.title}</span>
                              {isActive && <span className="active-glow-indicator" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Grievance & Nodal Desk Card */}
                  <div className="grievance-nodal-card">
                    <div className="nodal-header">
                      <span className="nodal-shield">🛡️</span>
                      <div>
                        <h4 className="nodal-title">Official Grievance Desk</h4>
                        <span className="nodal-sub">WedWithMe Platform Pvt. Ltd.</span>
                      </div>
                    </div>
                    <p className="nodal-body">
                      Have questions regarding these clauses or require regulatory assistance?
                    </p>
                    <div className="nodal-actions">
                      <a href="tel:6399239252" className="nodal-contact-btn">
                        <span>📞</span> +91 6399239252
                      </a>
                      <a href="mailto:support@wedwithme.com" className="nodal-contact-btn mail">
                        <span>✉️</span> support@wedwithme.com
                      </a>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Right Column: Policy Document Articles */}
              <div className="legal-content-column">
                {/* Official Declaration Banner */}
                <div className="declaration-banner">
                  <div className="declaration-shield">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e5c158" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="declaration-text">
                    <h2 className="declaration-title">Official Legal Instrument &amp; Transparency Notice</h2>
                    <p className="declaration-desc">
                      This document forms a legally binding agreement between you and <strong>WedWithMe Platform Private Limited</strong>.
                      By using our marketplace, escrow payment services, or matrimonial features, you acknowledge and agree to these terms in full.
                    </p>
                  </div>
                </div>

                {filteredSections.length === 0 ? (
                  <div className="no-results-card">
                    <span className="no-res-icon">🔍</span>
                    <h3>No matching clauses found</h3>
                    <p>We could not find any sections matching <strong>"{searchQuery}"</strong>.</p>
                    <button onClick={() => setSearchQuery('')} className="btn-reset-search">
                      Show All Clauses
                    </button>
                  </div>
                ) : (
                  <div className="sections-container">
                    {filteredSections.map((sec) => (
                      <article key={sec.id} id={sec.id} className="section-luxury-card">
                        <header className="section-head-bar">
                          <div className="section-num-badge">
                            <span>{sec.number < 10 ? `0${sec.number}` : sec.number}</span>
                          </div>
                          <h2 className="section-title-heading">{sec.title}</h2>
                        </header>

                        <div className="section-rich-content">
                          {sec.content}
                        </div>

                        <footer className="section-footer-bar">
                          <button
                            onClick={() => scrollToSection(sec.id)}
                            className="section-permalink-btn"
                            title="Direct link to this clause"
                          >
                            Clause {sec.number} • WedWithMe Official
                          </button>
                          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="back-top-link">
                            Back to top ↑
                          </a>
                        </footer>
                      </article>
                    ))}
                  </div>
                )}

                {/* Bottom Corporate Seal Card */}
                <div className="bottom-corporate-seal">
                  <div className="corporate-seal-badge">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#e5c158" strokeWidth="1.6">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div className="corporate-seal-content">
                    <h3 className="seal-firm-name">WedWithMe Platform Private Limited</h3>
                    <p className="seal-desc">
                      Operating India&apos;s unified wedding ecosystem with escrow advance safety, government KYC verification,
                      and full statutory adherence to the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.
                    </p>
                    <div className="seal-footer-row">
                      <span><strong>Headquarters:</strong> Jebda Makkhanpur, Sadupur Shikohabad, Firozabad, Uttar Pradesh, India</span>
                      <span className="seal-sep">•</span>
                      <span><strong>Helpline:</strong> +91 6399239252</span>
                      <span className="seal-sep">•</span>
                      <span><strong>Email:</strong> support@wedwithme.com • concierge@wedwithme.com</span>
                    </div>
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
        /* Progress Bar */
        .reading-progress-track {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3.5px;
          background: rgba(3, 23, 16, 0.4);
          z-index: 9999;
        }

        .reading-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #d4af37 0%, #e5c158 50%, #fff2b2 100%);
          box-shadow: 0 0 10px rgba(229, 193, 88, 0.7);
          transition: width 0.1s ease-out;
        }

        .legal-page-root {
          min-height: 100vh;
          background: #f7f5f0;
          display: flex;
          flex-direction: column;
          color: #1a221f;
          font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
        }

        .legal-main {
          flex: 1;
        }

        /* Hero */
        .legal-hero {
          position: relative;
          background-color: #02120b;
          background-image:
            radial-gradient(circle at 50% -10%, rgba(229, 193, 88, 0.22) 0%, rgba(6, 42, 28, 0.95) 45%, #02120b 100%),
            radial-gradient(circle at 10% 90%, rgba(229, 193, 88, 0.08) 0%, transparent 40%);
          border-bottom: 1px solid rgba(229, 193, 88, 0.25);
          color: #ffffff;
          padding: 44px 0 36px;
          overflow: hidden;
        }

        .hero-gold-glow {
          position: absolute;
          top: -120px;
          right: 15%;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(229, 193, 88, 0.12) 0%, transparent 70%);
          filter: blur(40px);
          pointer-events: none;
        }

        .breadcrumbs {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #9cb1a6;
          margin-bottom: 22px;
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
          font-size: 12px;
        }

        .bc-parent {
          color: #c9d6ce;
        }

        .bc-active {
          color: #e5c158;
          font-weight: 600;
        }

        .official-company-row {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(229, 193, 88, 0.3);
          border-radius: 50px;
          padding: 6px 18px 6px 10px;
          margin-bottom: 18px;
          backdrop-filter: blur(8px);
        }

        .seal-emblem {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(229, 193, 88, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(229, 193, 88, 0.4);
        }

        .company-text-meta {
          display: flex;
          flex-direction: column;
        }

        .company-name-pill {
          font-size: 12px;
          font-weight: 800;
          color: #e5c158;
          letter-spacing: 0.6px;
        }

        .compliance-tag {
          font-size: 10px;
          color: #9cb1a6;
          letter-spacing: 0.3px;
        }

        .hero-heading-block {
          margin-bottom: 24px;
        }

        .legal-hero-title {
          font-family: var(--font-playfair, Georgia, serif);
          font-size: 42px;
          font-weight: 800;
          line-height: 1.15;
          margin: 0 0 10px 0;
          background: linear-gradient(135deg, #ffffff 40%, #f7e2a9 80%, #e5c158 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.6px;
        }

        .legal-hero-subtitle {
          font-size: 15.5px;
          color: #b8ccbe;
          max-width: 820px;
          line-height: 1.65;
          margin: 0;
        }

        /* Policy Switcher */
        .policy-switch-wrapper {
          border-top: 1px solid rgba(229, 193, 88, 0.15);
          padding-top: 20px;
        }

        .policy-switch-header {
          margin-bottom: 10px;
        }

        .switch-hint {
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #e5c158;
        }

        .policy-switch-pills {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .policy-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: #c9d6ce;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(229, 193, 88, 0.2);
          text-decoration: none;
          transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .policy-pill-btn:hover {
          background: rgba(229, 193, 88, 0.14);
          color: #ffffff;
          border-color: #e5c158;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
        }

        .policy-pill-btn.active {
          background: linear-gradient(135deg, #e5c158 0%, #d4af37 100%);
          color: #031710;
          border-color: #f7e2a9;
          font-weight: 800;
          box-shadow: 0 6px 18px rgba(229, 193, 88, 0.38);
        }

        .pill-icon {
          font-size: 15px;
        }

        .active-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #031710;
          margin-left: 2px;
        }

        /* Highlights Section */
        .summary-highlights-section {
          padding: 32px 0 12px;
          background: #f7f5f0;
        }

        .highlights-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .highlight-luxury-card {
          background: #ffffff;
          border: 1px solid #ebd8bd;
          border-radius: 14px;
          padding: 22px;
          display: flex;
          gap: 16px;
          box-shadow: 0 4px 18px rgba(3, 23, 16, 0.04);
          transition: all 0.25s ease;
        }

        .highlight-luxury-card:hover {
          transform: translateY(-3px);
          border-color: #d1b47b;
          box-shadow: 0 8px 24px rgba(3, 23, 16, 0.08);
        }

        .highlight-icon-halo {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, #fbf7ee 0%, #f4ede0 100%);
          border: 1px solid #e5c158;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .highlight-title {
          font-size: 15.5px;
          font-weight: 800;
          color: #031710;
          margin: 0 0 6px 0;
        }

        .highlight-desc {
          font-size: 13px;
          color: #55625c;
          line-height: 1.6;
          margin: 0;
        }

        /* Body Section */
        .legal-body-section {
          padding: 36px 0 80px;
        }

        .legal-layout-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 36px;
          align-items: flex-start;
        }

        /* Sticky Sidebar */
        .legal-sidebar {
          position: sticky;
          top: 86px;
        }

        .sticky-sidebar-inner {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sidebar-action-bar {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .lux-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          background: #ffffff;
          border: 1px solid #dfd5c4;
          border-radius: 9px;
          padding: 9px 12px;
          font-size: 12.5px;
          font-weight: 700;
          color: #031710;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
        }

        .lux-action-btn:hover {
          background: #031710;
          color: #e5c158;
          border-color: #031710;
          transform: translateY(-1px);
        }

        .sidebar-search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          border: 1.5px solid #dfd5c4;
          border-radius: 10px;
          padding: 9px 14px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
          transition: border-color 0.2s ease;
        }

        .sidebar-search-box:focus-within {
          border-color: #e5c158;
          box-shadow: 0 0 0 3px rgba(229, 193, 88, 0.15);
        }

        .sidebar-search-box input {
          border: none;
          outline: none;
          font-size: 13px;
          width: 100%;
          color: #1a221f;
          background: transparent;
        }

        .search-clear-btn {
          background: none;
          border: none;
          font-size: 14px;
          cursor: pointer;
          color: #888;
          padding: 2px 4px;
        }

        .search-count-pill {
          font-size: 11px;
          font-weight: 700;
          color: #8c733e;
          background: #fbf7ee;
          border: 1px solid #ebd8bd;
          padding: 1px 7px;
          border-radius: 20px;
        }

        /* TOC Box */
        .toc-luxury-box {
          background: #ffffff;
          border: 1px solid #dfd5c4;
          border-radius: 14px;
          padding: 18px 16px;
          box-shadow: 0 4px 18px rgba(3, 23, 16, 0.03);
          max-height: 430px;
          overflow-y: auto;
        }

        .toc-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid #f2ebe0;
        }

        .toc-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e5c158;
        }

        .toc-title {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          color: #8c733e;
          margin: 0;
        }

        .toc-items-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .toc-item-btn {
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          padding: 7px 10px;
          border-radius: 8px;
          font-size: 13px;
          color: #43524b;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 9px;
          transition: all 0.15s ease;
          position: relative;
        }

        .toc-item-btn:hover {
          background: #fbf7ee;
          color: #031710;
        }

        .toc-item-btn.active {
          background: #031710;
          color: #e5c158;
          font-weight: 700;
        }

        .toc-item-num {
          font-size: 11px;
          font-weight: 800;
          color: #8c733e;
          min-width: 20px;
        }

        .toc-item-btn.active .toc-item-num {
          color: #e5c158;
        }

        .toc-item-text {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .active-glow-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #e5c158;
          box-shadow: 0 0 6px #e5c158;
        }

        /* Grievance Card */
        .grievance-nodal-card {
          background: linear-gradient(135deg, #ffffff 0%, #fbf9f4 100%);
          border: 1.5px solid #ebd8bd;
          border-left: 4px solid #e5c158;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        }

        .nodal-header {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 8px;
        }

        .nodal-shield {
          font-size: 24px;
        }

        .nodal-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #031710;
          margin: 0;
        }

        .nodal-sub {
          font-size: 11px;
          color: #798680;
        }

        .nodal-body {
          font-size: 12px;
          color: #55625c;
          line-height: 1.5;
          margin: 0 0 12px 0;
        }

        .nodal-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .nodal-contact-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #031710;
          background: #fbf7ee;
          border: 1px solid #ebd8bd;
          padding: 6px 10px;
          border-radius: 7px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .nodal-contact-btn:hover {
          background: #031710;
          color: #e5c158;
          border-color: #031710;
        }

        .nodal-contact-btn.mail {
          word-break: break-all;
          font-size: 11.5px;
        }

        /* Content Column */
        .legal-content-column {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .declaration-banner {
          background: linear-gradient(135deg, #031710 0%, #062a1c 100%);
          border: 1px solid rgba(229, 193, 88, 0.35);
          border-radius: 16px;
          padding: 24px 28px;
          display: flex;
          gap: 18px;
          color: #ffffff;
          box-shadow: 0 8px 24px rgba(3, 23, 16, 0.15);
        }

        .declaration-shield {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .declaration-title {
          font-size: 17px;
          font-weight: 800;
          color: #e5c158;
          margin: 0 0 6px 0;
          letter-spacing: -0.2px;
        }

        .declaration-desc {
          font-size: 13.5px;
          color: #c9d6ce;
          line-height: 1.65;
          margin: 0;
        }

        .declaration-desc strong {
          color: #ffffff;
        }

        /* Sections Container & Cards */
        .sections-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .section-luxury-card {
          background: #ffffff;
          border: 1px solid #e6ded0;
          border-radius: 16px;
          padding: 30px 36px;
          box-shadow: 0 4px 20px rgba(3, 23, 16, 0.03);
          scroll-margin-top: 100px;
          transition: all 0.25s ease;
          position: relative;
        }

        .section-luxury-card:hover {
          border-color: #d8c292;
          box-shadow: 0 8px 30px rgba(3, 23, 16, 0.06);
        }

        .section-head-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-bottom: 16px;
          margin-bottom: 18px;
          border-bottom: 1.5px solid #f2ebe0;
        }

        .section-num-badge {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #031710 0%, #0a3a27 100%);
          border: 1.5px solid #e5c158;
          color: #e5c158;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          flex-shrink: 0;
          box-shadow: 0 3px 8px rgba(3, 23, 16, 0.15);
        }

        .section-title-heading {
          font-family: var(--font-playfair, Georgia, serif);
          font-size: 22px;
          font-weight: 800;
          color: #031710;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .section-rich-content {
          font-size: 15px;
          color: #37423d;
          line-height: 1.8;
        }

        .section-rich-content :global(p) {
          margin-bottom: 14px;
        }

        .section-rich-content :global(p:last-child) {
          margin-bottom: 0;
        }

        .section-rich-content :global(.highlight-box) {
          background: linear-gradient(135deg, #fcf8ee 0%, #f6eee0 100%);
          border-left: 4px solid #e5c158;
          border-radius: 8px;
          padding: 16px 20px;
          margin: 18px 0;
          font-size: 14px;
          color: #2e3b34;
          line-height: 1.65;
          box-shadow: 0 2px 8px rgba(229, 193, 88, 0.1);
        }

        .section-rich-content :global(.important-box) {
          background: linear-gradient(135deg, #fff5f5 0%, #fcebeb 100%);
          border-left: 4px solid #e6005c;
          border-radius: 8px;
          padding: 16px 20px;
          margin: 18px 0;
          font-size: 14px;
          color: #5c1b26;
          line-height: 1.65;
          box-shadow: 0 2px 8px rgba(230, 0, 92, 0.08);
        }

        .section-footer-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 22px;
          padding-top: 14px;
          border-top: 1px dashed #e8e1d5;
          font-size: 12px;
        }

        .section-permalink-btn {
          background: none;
          border: none;
          padding: 0;
          color: #8c733e;
          font-weight: 700;
          cursor: pointer;
        }

        .back-top-link {
          color: #798680;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .back-top-link:hover {
          color: #031710;
        }

        /* Corporate Seal at bottom */
        .bottom-corporate-seal {
          background: #ffffff;
          border: 1.5px solid #d9cbaf;
          border-radius: 16px;
          padding: 28px 32px;
          display: flex;
          gap: 24px;
          align-items: center;
          margin-top: 10px;
          box-shadow: 0 6px 24px rgba(3, 23, 16, 0.04);
        }

        .corporate-seal-badge {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: linear-gradient(135deg, #031710 0%, #0c3e29 100%);
          border: 2px solid #e5c158;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(3, 23, 16, 0.2);
        }

        .seal-firm-name {
          font-size: 17px;
          font-weight: 800;
          color: #031710;
          margin: 0 0 6px 0;
        }

        .seal-desc {
          font-size: 13.5px;
          color: #55625c;
          line-height: 1.65;
          margin: 0 0 10px 0;
        }

        .seal-footer-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12.5px;
          color: #031710;
          flex-wrap: wrap;
        }

        .seal-sep {
          color: #e5c158;
        }

        /* Empty state */
        .no-results-card {
          background: #ffffff;
          border: 1.5px dashed #d9cbaf;
          border-radius: 16px;
          padding: 50px 30px;
          text-align: center;
        }

        .no-res-icon {
          font-size: 36px;
          display: block;
          margin-bottom: 12px;
        }

        .no-results-card h3 {
          font-size: 18px;
          color: #031710;
          margin-bottom: 6px;
        }

        .no-results-card p {
          font-size: 14px;
          color: #666;
          margin-bottom: 16px;
        }

        .btn-reset-search {
          background: #031710;
          color: #e5c158;
          border: none;
          padding: 10px 22px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-reset-search:hover {
          background: #e5c158;
          color: #031710;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1080px) {
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
            padding: 30px 0 24px;
          }
          .legal-hero-title {
            font-size: 30px;
          }
          .policy-pill-btn {
            font-size: 12.5px;
            padding: 8px 14px;
            width: 100%;
            justify-content: center;
          }
          .section-luxury-card {
            padding: 22px 18px;
          }
          .section-title-heading {
            font-size: 18px;
          }
          .bottom-corporate-seal {
            flex-direction: column;
            text-align: center;
            padding: 20px;
          }
          .seal-footer-row {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
