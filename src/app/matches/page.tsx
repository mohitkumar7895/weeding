'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import CustomerMatchesSection from '@/components/CustomerMatchesSection';

export default function MatchesPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

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
    </div>
  );
}
