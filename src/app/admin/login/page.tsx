'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: adminEmail.trim().toLowerCase(), password: adminPassword }),
      });
      const data = await res.json();
      if (data.success) {
        const u = data.user || data.data?.user;
        if (u?.role) {
          sessionStorage.setItem('wwm_admin_user', JSON.stringify({ name: u.name, role: u.role }));
        }
        router.push('/admin');
      } else {
        setError(data.message || 'Admin login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '440px', width: '100%', background: 'linear-gradient(180deg, #101422 0%, #080a12 100%)', border: '1.5px solid rgba(255,42,115,0.4)', borderRadius: '24px', padding: '36px', boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 35px rgba(255,42,115,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <svg width="48" height="34" viewBox="0 0 54 40" fill="none">
              <defs>
                <linearGradient id="adminPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff2a73" />
                  <stop offset="100%" stopColor="#e6005c" />
                </linearGradient>
                <linearGradient id="adminHeartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff528c" />
                  <stop offset="100%" stopColor="#d8004f" />
                </linearGradient>
              </defs>
              <path d="M4 10L11 32L17 14L22 30L26 12" stroke="url(#adminPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z" fill="url(#adminHeartGrad)" />
              <path d="M28 12L32 30L37 14L43 32L50 10" stroke="url(#adminPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ color: '#e5c158', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>WedWithMe</span>
          <h2 style={{ fontSize: '18px', marginTop: '6px', color: '#fff' }}>Master Admin Governance</h2>
          <p style={{ fontSize: '13px', color: '#9cb1a6' }}>Authorized credentials required</p>
        </div>
        {error && <div style={{ background: 'rgba(230,0,92,0.2)', color: '#ffb3c6', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
        <form onSubmit={handleAdminLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#ff6b9d', marginBottom: '6px' }}>ADMIN EMAIL</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              required
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#ff6b9d', marginBottom: '6px' }}>PASSWORD</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In as Administrator'}
          </button>
        </form>
      </div>
    </div>
  );
}
