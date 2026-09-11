'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from '@/components/AuthModal';

export default function LoginPage() {
  const router = useRouter();

  return (
    <AuthModal
      isOpen={true}
      initialMode="login"
      onClose={() => router.push('/')}
    />
  );
}
