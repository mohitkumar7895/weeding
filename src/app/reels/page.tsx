'use client';

import Navbar from '@/components/Navbar';
import AuthModal from '@/components/AuthModal';
import ReelsExperience from '@/components/ReelsExperience';
import React, { useState } from 'react';

export default function ReelsPage() {
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <div style={{ minHeight: '100vh', background: '#050505' }}>
      <Navbar onOpenLogin={() => setAuthOpen(true)} onOpenRegister={() => setAuthOpen(true)} />
      {authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />}
      <main style={{ padding: '12px 0 80px' }}>
        <ReelsExperience title="WedWithMe Reels" />
      </main>
    </div>
  );
}
