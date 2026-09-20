'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import SagunModal from '@/components/SagunModal';
import CustomerMatchesSection from '@/components/CustomerMatchesSection';

export default function MatchesPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [sagunModalOpen, setSagunModalOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#031710', color: '#fff', display: 'flex', flexDirection: 'column' }}>
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

      <main style={{ flex: 1, padding: '32px 16px 64px 16px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(229,193,88,0.12)',
              border: '1px solid rgba(229,193,88,0.3)',
              color: '#e5c158',
              fontSize: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px',
            }}
          >
            <span>💍</span>
            <span>Verified Matrimonial Discovery</span>
          </div>

          <h1 style={{ fontSize: '34px', fontWeight: '800', color: '#fff', margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
            Find Your Compatible Life Partner
          </h1>

          <p style={{ color: '#9cb1a6', fontSize: '15px', maxWidth: '640px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
            Personalized recommendations based on your verified preferences and permitted activity signals.
            Match percentages are software-generated informational scores and are not a guarantee of marriage or compatibility.
          </p>

          {/* Quick AI Assistant Button */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setSagunModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '9999px',
                background: 'rgba(6, 42, 28, 0.8)',
                border: '1px solid rgba(229,193,88,0.3)',
                color: '#fae8a4',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span>✨</span>
              <span>Need help finding someone specific? Ask Sagun AI Matchmaker →</span>
            </button>
          </div>
        </div>

        {/* Customer Matches Section with 3 Tabs */}
        <CustomerMatchesSection showDashboardLink={true} />
      </main>

      <Footer />

      {/* Auth Modal for Unauthenticated Users */}
      {authModalOpen && (
        <AuthModal
          initialMode={authMode}
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      )}

      {/* Sagun AI Modal */}
      {sagunModalOpen && (
        <SagunModal
          isOpen={sagunModalOpen}
          onClose={() => setSagunModalOpen(false)}
        />
      )}
    </div>
  );
}
