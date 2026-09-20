'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import QuickFeatures from '@/components/QuickFeatures';
import TopVendors from '@/components/TopVendors';
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
