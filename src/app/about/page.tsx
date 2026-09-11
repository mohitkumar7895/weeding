'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';

export default function AboutPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  const pillars = [
    {
      icon: '🏛️',
      title: '100% Government KYC Verified',
      desc: 'Every vendor is vetted with GST and PAN certificates. Matrimonial profiles are validated via Aadhaar and photo authentication to ensure a secure environment.'
    },
    {
      icon: '🛡️',
      title: 'Platform Escrow Protection',
      desc: 'No more lost advances. Your booking payment remains safely deposited in platform escrow until the vendor fulfills deliverables to your satisfaction.'
    },
    {
      icon: '✨',
      title: 'Sagun AI & Vedic Kundali',
      desc: 'Deep Ashtakoota 36 Guna astrological compatibility married with modern lifestyle alignment and natural language wedding planning assistants.'
    },
    {
      icon: '🔒',
      title: 'Strict Anti Double-Booking',
      desc: 'Our real-time calendar synchronization automatically locks reserved dates, guaranteeing that your vendor is dedicated exclusively to your celebration.'
    }
  ];

  const faqs = [
    {
      q: 'How does WedWithMe protect my advance payment?',
      a: 'When you confirm a booking, your payment is held in the platform escrow ledger. The vendor receives payment only after milestone deliverables are completed or after your wedding day concludes.'
    },
    {
      q: 'Are all vendor ratings and reviews authentic?',
      a: 'Yes. Reviews on WedWithMe can only be submitted by customers who have a confirmed, completed booking with that specific vendor. One booking equals one review.'
    },
    {
      q: 'How accurate is the Sagun AI Kundali compatibility score?',
      a: 'Sagun AI computes Vedic Ashtakoota matching (covering Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, and Nadi out of 36 Gunas) along with education, lifestyle, and dietary habits.'
    },
    {
      q: 'Can vendors cancel a confirmed booking?',
      a: 'Vendors who cancel confirmed bookings face strict penalties, account suspension, and immediate 100% refund processing back to the couple.'
    }
  ];

  return (
    <div className="about-page-root">
      <Navbar
        onOpenLogin={() => { setAuthMode('login'); setAuthModalOpen(true); }}
        onOpenRegister={() => { setAuthMode('register'); setAuthModalOpen(true); }}
      />

      <main className="about-main-content">
        {/* Hero Section */}
        <section className="about-hero-section">
          <div className="container-custom">
            <div className="hero-text-center">
              <span className="hero-badge">About WedWithMe</span>
              <h1 className="hero-title">From Match to Marriage</h1>
              <p className="hero-subtitle">
                India's first unified ecosystem integrating verified matrimonial discovery with an escrow-protected wedding services marketplace.
                We remove uncertainty and stress from one of life's most precious journeys.
              </p>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="story-section">
          <div className="container-custom">
            <div className="story-grid">
              <div className="story-image-wrap">
                <img
                  src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=900&q=80"
                  alt="Indian Wedding Celebration"
                  className="story-hero-img"
                />
                <div className="story-badge-stat">
                  <span className="stat-num">50,000+</span>
                  <span className="stat-lbl">Families Celebrated</span>
                </div>
              </div>

              <div className="story-text-content">
                <span className="section-eyebrow">Our Vision</span>
                <h2 className="section-title">Reimagining How India Finds Love & Celebrates Weddings</h2>
                <p className="section-lead">
                  For generations, planning an Indian wedding meant juggling unverified matrimonial leads, unorganized vendor agreements, and the constant fear of no-shows or lost advances.
                </p>
                <p className="section-body">
                  WedWithMe was created to bring institutional trust, modern artificial intelligence, and ironclad financial protection to every family. 
                  Whether you are seeking a soulmate with astrological alignment or orchestrating a 3-day royal Sangeet in Jaipur, WedWithMe ensures complete peace of mind.
                </p>

                <div className="story-metrics-row">
                  <div className="metric-box">
                    <strong>100%</strong>
                    <span>KYC Verified Vendors</span>
                  </div>
                  <div className="metric-box">
                    <strong>0%</strong>
                    <span>Double-Booking Risk</span>
                  </div>
                  <div className="metric-box">
                    <strong>₹10Cr+</strong>
                    <span>Safeguarded in Escrow</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Pillars Section */}
        <section className="pillars-section">
          <div className="container-custom">
            <div className="section-header-center">
              <span className="section-eyebrow">Why WedWithMe</span>
              <h2 className="section-title">The Four Pillars of Our Platform</h2>
              <p className="section-subtitle">Engineered from the ground up for transparency, security, and cultural reverence.</p>
            </div>

            <div className="pillars-cards-grid">
              {pillars.map((p, idx) => (
                <div key={idx} className="pillar-card-item">
                  <div className="pillar-icon-box">{p.icon}</div>
                  <h3 className="pillar-title">{p.title}</h3>
                  <p className="pillar-desc">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The 3-Step Journey */}
        <section className="journey-section">
          <div className="container-custom">
            <div className="section-header-center">
              <span className="section-eyebrow">Seamless Experience</span>
              <h2 className="section-title">The Complete WedWithMe Journey</h2>
            </div>

            <div className="journey-steps-grid">
              <div className="journey-step-card">
                <div className="step-number-pill">01</div>
                <h3 className="step-title">Connect & Align</h3>
                <p className="step-desc">
                  Explore government ID verified matrimonial profiles. View deep 36-Guna Kundali compatibility reports and converse safely with privacy controls.
                </p>
                <a href="/matches" className="step-link">Find Matches →</a>
              </div>

              <div className="journey-step-card">
                <div className="step-number-pill">02</div>
                <h3 className="step-title">Curate Your Dream Team</h3>
                <p className="step-desc">
                  Browse handpicked venues, floral decorators, royal caterers, and cinematographers. Compare packages with zero hidden fees.
                </p>
                <a href="/vendors" className="step-link">Explore Marketplace →</a>
              </div>

              <div className="journey-step-card">
                <div className="step-number-pill">03</div>
                <h3 className="step-title">Celebrate in Peace</h3>
                <p className="step-desc">
                  Pay advances into protected platform escrow. Track execution milestones and release payouts only after flawless celebration delivery.
                </p>
                <a href="/bookings" className="step-link">My Bookings →</a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="faq-section">
          <div className="container-custom">
            <div className="section-header-center">
              <span className="section-eyebrow">Got Questions?</span>
              <h2 className="section-title">Frequently Asked Questions</h2>
            </div>

            <div className="faq-accordion-list">
              {faqs.map((faq, idx) => (
                <div key={idx} className="faq-item-card">
                  <h4 className="faq-question">Q: {faq.q}</h4>
                  <p className="faq-answer">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="contact-section">
          <div className="container-custom">
            <div className="contact-panel-card">
              <div className="contact-info-col">
                <span className="section-eyebrow">Get In Touch</span>
                <h2 className="contact-title">We are Here for Your Big Day</h2>
                <p className="contact-lead">
                  Have questions about escrow protection, matrimonial profiles, or vendor onboarding? Reach out to our dedicated wedding support desk.
                </p>

                <div className="contact-detail-items">
                  <div className="c-item">
                    <span className="c-icon">📍</span>
                    <div>
                      <strong>Headquarters</strong>
                      <p>DLF CyberCity, Tower B, Gurugram, Delhi NCR, India</p>
                    </div>
                  </div>
                  <div className="c-item">
                    <span className="c-icon">📞</span>
                    <div>
                      <strong>Toll-Free Wedding Helpline</strong>
                      <p>+91 (800) 425-9966 (Mon - Sat, 9am - 8pm IST)</p>
                    </div>
                  </div>
                  <div className="c-item">
                    <span className="c-icon">✉️</span>
                    <div>
                      <strong>Email Support</strong>
                      <p>support@wedwithme.com • concierge@wedwithme.com</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="contact-form-col">
                {formSubmitted ? (
                  <div className="contact-success-box">
                    <span className="success-check">✓</span>
                    <h3>Message Received!</h3>
                    <p>Thank you, {contactName}. A dedicated WedWithMe wedding specialist will call you back within 4 business hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitContact} className="contact-form">
                    <h3 className="form-heading">Send Us a Message</h3>

                    <div className="form-field">
                      <label>Your Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Priya Mehra"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <label>Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="priya@example.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <label>How Can We Help You? *</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Tell us about your wedding dates, vendor inquiries, or account questions..."
                        value={contactMsg}
                        onChange={(e) => setContactMsg(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn-submit-contact">
                      Send Inquiry ✉️
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />

      <Footer />

      <style jsx>{`
        .about-page-root {
          min-height: 100vh;
          background: #ffffff;
          display: flex;
          flex-direction: column;
        }

        .about-hero-section {
          background-color: #031710;
          background-image: radial-gradient(circle at 50% 50%, rgba(6, 42, 28, 0.85) 0%, rgba(3, 23, 16, 0.98) 100%);
          border-bottom: 1px solid rgba(229, 193, 88, 0.2);
          color: #ffffff;
          padding: 65px 0 50px;
          text-align: center;
        }

        .hero-badge {
          display: inline-block;
          background: rgba(229, 193, 88, 0.15);
          color: #e5c158;
          border: 1px solid rgba(229, 193, 88, 0.35);
          padding: 6px 16px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .hero-title {
          font-size: 42px;
          font-weight: 800;
          margin-bottom: 14px;
          color: #ffffff;
        }

        .hero-subtitle {
          font-size: 16px;
          color: #9cb1a6;
          max-width: 720px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .story-section {
          padding: 80px 0;
          background: #ffffff;
        }

        .story-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .story-image-wrap {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.12);
        }

        .story-hero-img {
          width: 100%;
          height: 440px;
          object-fit: cover;
          display: block;
        }

        .story-badge-stat {
          position: absolute;
          bottom: 24px;
          left: 24px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 14px 22px;
          border-radius: 14px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(229, 193, 88, 0.3);
        }

        .stat-num {
          font-size: 26px;
          font-weight: 800;
          color: #031710;
        }

        .stat-lbl {
          font-size: 12px;
          font-weight: 600;
          color: #555;
          text-transform: uppercase;
        }

        .section-eyebrow {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: #b8932f;
          letter-spacing: 1px;
          display: block;
          margin-bottom: 8px;
        }

        .section-title {
          font-size: 32px;
          font-weight: 800;
          color: #031710;
          margin-bottom: 16px;
          line-height: 1.25;
        }

        .section-lead {
          font-size: 16px;
          color: #444;
          font-weight: 500;
          line-height: 1.6;
          margin-bottom: 12px;
        }

        .section-body {
          font-size: 14px;
          color: #666;
          line-height: 1.7;
          margin-bottom: 28px;
        }

        .story-metrics-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          border-top: 1px solid #f0eee9;
          padding-top: 24px;
        }

        .metric-box strong {
          display: block;
          font-size: 22px;
          font-weight: 800;
          color: #031710;
        }

        .metric-box span {
          font-size: 12px;
          color: #777;
        }

        .pillars-section {
          padding: 80px 0;
          background: #faf8f5;
        }

        .section-header-center {
          text-align: center;
          max-width: 640px;
          margin: 0 auto 50px;
        }

        .section-subtitle {
          font-size: 15px;
          color: #666;
          margin-top: 6px;
        }

        .pillars-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
        }

        .pillar-card-item {
          background: #ffffff;
          border-radius: 18px;
          padding: 32px 24px;
          border: 1px solid #eee8e0;
          box-shadow: 0 4px 16px rgba(0,0,0,0.03);
          transition: transform 0.2s ease;
        }

        .pillar-card-item:hover {
          transform: translateY(-4px);
        }

        .pillar-icon-box {
          font-size: 32px;
          margin-bottom: 16px;
        }

        .pillar-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 10px;
        }

        .pillar-desc {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
        }

        .journey-section {
          padding: 80px 0;
          background: #ffffff;
        }

        .journey-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }

        .journey-step-card {
          background: #fdfbf9;
          border-radius: 20px;
          padding: 32px;
          border: 1px solid #ede7df;
          display: flex;
          flex-direction: column;
        }

        .step-number-pill {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          font-weight: 800;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(230, 0, 92, 0.35);
        }

        .step-title {
          font-size: 20px;
          font-weight: 800;
          color: #031710;
          margin-bottom: 10px;
        }

        .step-desc {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
          margin-bottom: 24px;
          flex: 1;
        }

        .step-link {
          font-size: 14px;
          font-weight: 700;
          color: #031710;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .step-link:hover {
          color: #b8932f;
        }

        .faq-section {
          padding: 80px 0;
          background: #faf8f5;
        }

        .faq-accordion-list {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .faq-item-card {
          background: #ffffff;
          border-radius: 14px;
          padding: 24px;
          border: 1px solid #eae4dc;
        }

        .faq-question {
          font-size: 16px;
          font-weight: 700;
          color: #031710;
          margin: 0 0 8px;
        }

        .faq-answer {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
          margin: 0;
        }

        .contact-section {
          padding: 80px 0 100px;
          background: #ffffff;
        }

        .contact-panel-card {
          background-color: #031710;
          background-image: radial-gradient(circle at 50% 50%, rgba(6, 42, 28, 0.85) 0%, rgba(3, 23, 16, 0.98) 100%);
          border: 1px solid rgba(229, 193, 88, 0.25);
          border-radius: 28px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 1fr;
          color: #fff;
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
        }

        .contact-info-col {
          padding: 50px;
        }

        .contact-title {
          font-size: 32px;
          font-weight: 800;
          margin: 8px 0 14px;
          color: #ffffff;
        }

        .contact-lead {
          font-size: 15px;
          color: #9cb1a6;
          line-height: 1.6;
          margin-bottom: 36px;
        }

        .contact-detail-items {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .c-item {
          display: flex;
          gap: 16px;
        }

        .c-icon {
          font-size: 24px;
        }

        .c-item strong {
          display: block;
          font-size: 14px;
          color: #ffffff;
          margin-bottom: 2px;
        }

        .c-item p {
          font-size: 13px;
          color: #9cb1a6;
          margin: 0;
        }

        .contact-form-col {
          background: #ffffff;
          padding: 50px;
          color: #031710;
        }

        .form-heading {
          font-size: 22px;
          font-weight: 800;
          margin: 0 0 20px;
          color: #031710;
        }

        .form-field {
          margin-bottom: 16px;
        }

        .form-field label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #444;
          margin-bottom: 6px;
        }

        .form-field input, .form-field textarea {
          width: 100%;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 14px;
          outline: none;
        }

        .form-field input:focus, .form-field textarea:focus {
          border-color: #e5c158;
        }

        .btn-submit-contact {
          width: 100%;
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 8px;
          box-shadow: 0 4px 14px rgba(230, 0, 92, 0.38);
          transition: all 0.2s ease;
        }

        .btn-submit-contact:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(230, 0, 92, 0.55);
        }

        .contact-success-box {
          text-align: center;
          padding: 40px 20px;
        }

        .success-check {
          display: inline-block;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #031710;
          color: #e5c158;
          border: 2px solid #e5c158;
          font-size: 26px;
          line-height: 48px;
          margin-bottom: 16px;
        }

        @media (max-width: 900px) {
          .story-grid, .contact-panel-card, .journey-steps-grid {
            grid-template-columns: 1fr;
          }
          .contact-info-col, .contact-form-col {
            padding: 30px 24px;
          }
        }
      `}</style>
    </div>
  );
}
