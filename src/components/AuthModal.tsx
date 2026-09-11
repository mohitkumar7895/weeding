'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/context';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
}

export default function AuthModal({ isOpen, initialMode = 'login', onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const { setUser } = useAppContext();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'couple' | 'vendor' | 'guest'>('couple');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const displayName = mode === 'register' ? (name || 'Mohit Kumar') : (email.split('@')[0] || 'Mohit Kumar');
      
      setUser({
        id: 'usr_' + Date.now(),
        name: displayName,
        email: email || 'user@wedwithme.com',
        role: role === 'vendor' ? 'admin' : 'user',
      });

      setNotification(`Welcome to WedWithMe, ${displayName}!`);
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 1000);
    }, 800);
  };

  const handleSocialAuth = (provider: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setUser({
        id: 'usr_social_' + Date.now(),
        name: 'Mohit Kumar',
        email: 'mohit@example.com',
        role: 'user',
      });
      setNotification(`Signed in with ${provider}!`);
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 900);
    }, 600);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="auth-close-btn" onClick={onClose} aria-label="Close dialog">
          ✕
        </button>

        {/* Header Branding */}
        <div className="auth-header">
          <div className="logo-svg-wrap">
            <svg width="46" height="34" viewBox="0 0 54 40" fill="none">
              <defs>
                <linearGradient id="modalLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff4d79" />
                  <stop offset="50%" stopColor="#ff7a3d" />
                  <stop offset="100%" stopColor="#ff0055" />
                </linearGradient>
                <linearGradient id="modalLogoHeart" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffc107" />
                  <stop offset="100%" stopColor="#ff4081" />
                </linearGradient>
              </defs>
              <path d="M4 10L11 32L17 14L22 30L26 12" stroke="url(#modalLogoGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z" fill="url(#modalLogoHeart)" />
              <path d="M28 12L32 30L37 14L43 32L50 10" stroke="url(#modalLogoGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="auth-title">
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p className="auth-sub">
            {mode === 'login'
              ? 'Access your wedding planner, shortlisted vendors & matches'
              : 'Begin your journey from Match to Marriage with AI precision'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            className={`tab-btn ${mode === 'login' ? 'active-tab' : ''}`}
            onClick={() => setMode('login')}
          >
            Sign In
          </button>
          <button
            className={`tab-btn ${mode === 'register' ? 'active-tab' : ''}`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        {/* Notification alert */}
        {notification && (
          <div className="notification-toast">
            <span className="toast-icon">✓</span>
            <span>{notification}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              {/* Role Selection */}
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-chip ${role === 'couple' ? 'role-selected' : ''}`}
                  onClick={() => setRole('couple')}
                >
                  Bride / Groom
                </button>
                <button
                  type="button"
                  className={`role-chip ${role === 'vendor' ? 'role-selected' : ''}`}
                  onClick={() => setRole('vendor')}
                >
                  Wedding Vendor
                </button>
                <button
                  type="button"
                  className={`role-chip ${role === 'guest' ? 'role-selected' : ''}`}
                  onClick={() => setRole('guest')}
                >
                  Guest
                </button>
              </div>

              {/* Full Name */}
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mohit Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="auth-input"
                />
              </div>

              {/* Phone Number */}
              <div className="input-group">
                <label className="input-label">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="auth-input"
                />
              </div>
            </>
          )}

          {/* Email */}
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
            />
          </div>

          {/* Password */}
          <div className="input-group">
            <div className="password-label-row">
              <label className="input-label">Password</label>
              {mode === 'login' && (
                <a href="#forgot" className="forgot-link">
                  Forgot?
                </a>
              )}
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
            />
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading} className="btn-submit-auth">
            {loading ? (
              <span className="spinner"></span>
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>

          {/* Divider */}
          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          {/* Social Auth Buttons */}
          <div className="social-auth-row">
            <button
              type="button"
              className="social-auth-btn"
              onClick={() => handleSocialAuth('Google')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              className="social-auth-btn"
              onClick={() => handleSocialAuth('OTP')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e6005c" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>Phone OTP</span>
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="auth-footer-note">
          By continuing, you agree to WedWithMe&apos;s{' '}
          <a href="#" className="terms-link">Terms of Service</a> and{' '}
          <a href="#" className="terms-link">Privacy Policy</a>.
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(3, 20, 14, 0.78);
          backdrop-filter: blur(8px);
          z-index: 3000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.2s ease;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border-radius: 26px;
          padding: 34px 36px;
          position: relative;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(229, 193, 88, 0.35);
          animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: 94vh;
          overflow-y: auto;
        }

        .auth-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f0f4f1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: #4a5c53;
          transition: background 0.15s ease;
        }

        .auth-close-btn:hover {
          background: #e2ebe5;
          color: #1a2c22;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 22px;
        }

        .logo-svg-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
        }

        .auth-title {
          font-family: var(--font-serif);
          font-size: 26px;
          font-weight: 700;
          color: #122119;
          margin-bottom: 6px;
        }

        .auth-sub {
          font-size: 12.5px;
          color: #64756c;
          line-height: 1.4;
        }

        .auth-tabs {
          display: flex;
          background: #f0f5f2;
          border-radius: 9999px;
          padding: 4px;
          margin-bottom: 20px;
        }

        .tab-btn {
          flex: 1;
          padding: 9px 0;
          font-size: 13.5px;
          font-weight: 600;
          color: #55675e;
          border-radius: 9999px;
          transition: all 0.2s ease;
        }

        .active-tab {
          background: #ffffff;
          color: #06281c;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .notification-toast {
          background: #063121;
          color: #ffffff;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          animation: slideDown 0.2s ease;
        }

        .toast-icon {
          color: #10b981;
          font-weight: bold;
        }

        .role-selector {
          display: flex;
          gap: 6px;
          margin-bottom: 14px;
        }

        .role-chip {
          flex: 1;
          font-size: 11.5px;
          font-weight: 600;
          padding: 8px 4px;
          border-radius: 8px;
          background: #f3f6f4;
          color: #384d42;
          border: 1px solid #dbe4df;
          transition: all 0.15s ease;
          text-align: center;
        }

        .role-selected {
          background: #063121;
          color: #e5c158;
          border-color: #063121;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-label {
          font-size: 12.5px;
          font-weight: 600;
          color: #1f3227;
        }

        .password-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .forgot-link {
          font-size: 11.5px;
          color: #e6005c;
          font-weight: 600;
        }

        .auth-input {
          padding: 11px 14px;
          border-radius: 10px;
          border: 1px solid #d4ded8;
          background: #fafbfa;
          font-size: 14px;
          color: #122119;
          transition: border-color 0.15s ease;
        }

        .auth-input:focus {
          border-color: #063121;
          background: #ffffff;
        }

        .btn-submit-auth {
          margin-top: 6px;
          background: linear-gradient(135deg, #f72585 0%, #e6005c 100%);
          color: #ffffff;
          font-size: 14.5px;
          font-weight: 700;
          padding: 12px;
          border-radius: 9999px;
          box-shadow: 0 4px 14px rgba(230, 0, 92, 0.35);
          transition: transform 0.15s ease, filter 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-submit-auth:hover {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 4px 0;
          font-size: 11.5px;
          color: #8da096;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #e5ece7;
        }

        .auth-divider span {
          padding: 0 10px;
        }

        .social-auth-row {
          display: flex;
          gap: 10px;
        }

        .social-auth-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #d4ded8;
          background: #ffffff;
          font-size: 13px;
          font-weight: 600;
          color: #24382e;
          transition: all 0.15s ease;
        }

        .social-auth-btn:hover {
          background: #f7faf8;
          border-color: #b7c7be;
        }

        .auth-footer-note {
          margin-top: 18px;
          text-align: center;
          font-size: 11px;
          color: #83978c;
          line-height: 1.4;
        }

        .terms-link {
          color: #e6005c;
          text-decoration: underline;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes slideDown {
          from { transform: translateY(-8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
