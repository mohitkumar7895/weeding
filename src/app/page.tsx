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
      {/* 1. Header Navigation */}
      <Navbar onOpenLogin={openLogin} onOpenRegister={openRegister} />

      <main>
        {/* 2. Hero Section */}
        <HeroSection />

        {/* 3. 5 Quick Features / Service Pill Cards */}
        <QuickFeatures onSelectFeature={handleSelectFeature} />

        {/* 4. Top Wedding Vendors */}
        <TopVendors />

        {/* 5. Meet Sagun AI Wedding Assistant */}
        <AIAssistantBanner onOpenSagun={() => setSagunModalOpen(true)} />

        {/* 6. Why Choose WedWithMe */}
        <WhyChooseUs />

        {/* 7. Statistics Bar */}
        <StatsBar />
      </main>

      {/* 8. Footer */}
      <Footer />

      {/* 9. Interactive AI Assistant Modal */}
      <SagunModal isOpen={sagunModalOpen} onClose={() => setSagunModalOpen(false)} />

      {/* 10. Login & Register Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />

      <style jsx global>{`
        .page-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
        }

        main {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
