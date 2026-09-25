'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import QuickFeatures from '@/components/QuickFeatures';
import TopVendors from '@/components/TopVendors';
import VendorCategoryGrid from '@/components/VendorCategoryGrid';
import AIAssistantBanner from '@/components/AIAssistantBanner';
import WhyChooseUs from '@/components/WhyChooseUs';
import StatsBar from '@/components/StatsBar';
import Footer from '@/components/Footer';
import SagunModal from '@/components/SagunModal';
import AuthModal from '@/components/AuthModal';

export default function Home() {
  const [sagunModalOpen, setSagunModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const openLogin = () => {
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  const openRegister = () => {
    setAuthMode('register');
    setAuthModalOpen(true);
  };

  const handleSelectFeature = (id: string) => {
    if (id === 'assistant') {
      setSagunModalOpen(true);
    } else if (id === 'vendors') {
      const vendorSection = document.getElementById('vendors');
      if (vendorSection) {
        vendorSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (id === 'match') {
      openRegister();
    } else {
      const vendorSection = document.getElementById('vendors');
      if (vendorSection) {
        vendorSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar onOpenLogin={openLogin} onOpenRegister={openRegister} />

      <main>
        <HeroSection />
        <QuickFeatures onSelectFeature={handleSelectFeature} />
        <section className="home-cat-section" id="vendor-categories" style={{ padding: '36px 0 12px', background: '#f7f3ee' }}>
          <div className="container-custom">
            <h2 className="section-title" style={{ marginBottom: 8 }}>Wedding categories</h2>
            <p className="section-subtitle" style={{ marginBottom: 18 }}>
              Choose a category to open vendors listed under it.
            </p>
            <VendorCategoryGrid />
          </div>
        </section>
        <TopVendors />
        <AIAssistantBanner onOpenSagun={() => setSagunModalOpen(true)} />
        <WhyChooseUs />
        <StatsBar />
      </main>

      <Footer />

      <SagunModal isOpen={sagunModalOpen} onClose={() => setSagunModalOpen(false)} />

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
