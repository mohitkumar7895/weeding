'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'email-otp';

export default function AuthModal({ isOpen, initialMode = 'login', onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const { setUser } = useAppContext();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'couple' | 'vendor' | 'guest'>('couple');
  
  // OTP & Reset states
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Status states
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync mode if initialMode changes
  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setNotification(null);
    setOtpSent(false);
  }, [initialMode, isOpen]);

  // Cooldown countdown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  if (!isOpen) return null;

  // Clear transient states when switching modes
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setNotification(null);
    setOtp('');
    setOtpSent(false);
  };

  // Dispatch OTP email to backend
  const handleSendOtp = async (purpose: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD', isResend = false) => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address first.');
      return;
    }

    if (otpCooldown > 0 && isResend) {
      setError(`Please wait ${otpCooldown}s before requesting a new code.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose, resend: isResend }),
      });

      const data = await res.json();

      if (data.cooldownSeconds && data.cooldownSeconds > 0) {
        setOtpCooldown(data.cooldownSeconds);
      }

      if (!res.ok || !data.success) {
        // If an OTP was already sent or cooldown is active, let the user enter the code
        if (data.cooldownSeconds || res.status === 429) {
          setOtpSent(true);
        }
        throw new Error(data.message || 'Failed to send verification code.');
      }

      setOtpSent(true);
      setOtpCooldown(data.cooldownSeconds || 45);
      setNotification(data.message || `Verification code sent to ${email.trim()}! 📩`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch email OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Standard Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Invalid email or password.');
      }

      setUser(data.data?.user || data.user);
      setNotification(`Welcome back, ${data.data?.user?.name || data.user?.name || 'Partner'}! ✨`);
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Email OTP Direct Login
  const handleEmailOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) {
      await handleSendOtp('LOGIN');
      return;
    }

    if (!otp || otp.length < 4) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          purpose: 'LOGIN',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Invalid or expired verification code.');
      }

      setUser(data.data?.user || data.user);
      setNotification(`Signed in successfully! Welcome to WedWithMe 🎉`);
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration with Email OTP
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // Require OTP verification for registration
    if (!otpSent) {
      await handleSendOtp('REGISTER');
      return;
    }

    if (!otp || otp.length < 4) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mappedRole = role === 'vendor' ? 'VENDOR' : 'CUSTOMER';
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          otp: otp.trim(),
          role: mappedRole,
          business_name: role === 'vendor' ? name + ' Studio' : undefined,
          category_id: role === 'vendor' ? 'cat_photographers' : undefined,
          city: 'Delhi',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Registration failed.');
      }

      setUser(data.data?.user || data.user);
      setNotification(`Welcome to WedWithMe, ${data.data?.user?.name || name}! 🎉`);
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Registration error.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password Reset Flow
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpSent) {
      await handleSendOtp('FORGOT_PASSWORD');
      return;
    }

    if (!otp || otp.length < 4) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to reset password.');
      }

      setNotification('Password reset successfully! Please sign in with your new password. ✨');
      setTimeout(() => {
        switchMode('login');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  // Mock Social Sign-in
  const handleSocialAuth = (provider: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setUser({
        id: 'usr_social_' + Date.now(),
        name: 'Mohit Kumar',
        email: 'mohit@example.com',
        role: 'CUSTOMER',
      });
      setNotification(`Signed in with ${provider}! 🎉`);
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 900);
    }, 600);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        {/* Ambient Top Glow */}
        <div className="card-top-glow" />

        {/* Close Button */}
        <button className="auth-close-btn" onClick={onClose} aria-label="Close dialog">
          ✕
        </button>

        {/* Header Branding */}
        <div className="auth-header">
          <div className="logo-svg-wrap">
            <svg width="52" height="38" viewBox="0 0 54 40" fill="none">
              <defs>
                <linearGradient id="authModalPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff2a73" />
                  <stop offset="100%" stopColor="#e6005c" />
                </linearGradient>
                <linearGradient id="authModalHeartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff528c" />
                  <stop offset="100%" stopColor="#d8004f" />
                </linearGradient>
                <filter id="authLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ff2a73" floodOpacity="0.45" />
                </filter>
              </defs>
              <path
                d="M4 10L11 32L17 14L22 30L26 12"
                stroke="url(#authModalPinkGrad)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#authLogoGlow)"
              />
              <path
                d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z"
                fill="url(#authModalHeartGrad)"
              />
              <path
                d="M28 12L32 30L37 14L43 32L50 10"
                stroke="url(#authModalPinkGrad)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#authLogoGlow)"
              />
            </svg>
          </div>

          <div className="brand-title-wrap">
            <span className="brand-name-text">WedWithMe</span>
            <span className="brand-tagline-text">From Match to Marriage</span>
          </div>

          <h2 className="auth-title">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'email-otp' && 'Email OTP Login'}
            {mode === 'register' && 'Create Your Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p className="auth-sub">
            {mode === 'login' && 'Access your wedding planner, shortlisted vendors & verified matches'}
            {mode === 'email-otp' && 'Sign in instantly with a 6-digit code sent directly to your email'}
            {mode === 'register' && 'Begin your celebratory journey with verified email and smart matchmaking'}
            {mode === 'forgot' && 'Receive a secure verification code to reset your account password'}
          </p>
        </div>

        {/* Tab Switcher (Visible on login & register) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="auth-tabs">
            <button
              type="button"
              className={`tab-btn ${mode === 'login' ? 'active-tab' : ''}`}
              onClick={() => switchMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`tab-btn ${mode === 'register' ? 'active-tab' : ''}`}
              onClick={() => switchMode('register')}
            >
              Register
            </button>
          </div>
        )}

        {/* Sub-mode Navigation Breadcrumb (for Forgot & Email OTP) */}
        {(mode === 'forgot' || mode === 'email-otp') && (
          <div className="submode-back-bar">
            <button
              type="button"
              className="back-btn"
              onClick={() => switchMode('login')}
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className="notification-toast">
            <span className="toast-icon">✓</span>
            <span>{notification}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="error-alert">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODE 1: Standard Password Sign In                   */}
        {/* ---------------------------------------------------- */}
        {mode === 'login' && (
          <form onSubmit={handlePasswordLogin} className="auth-form">
            <div className="input-group">
              <label className="input-label" htmlFor="login-email">EMAIL ADDRESS</label>
              <div className="input-field-wrap">
                <span className="field-icon">✉️</span>
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            <div className="input-group">
              <div className="password-label-row">
                <label className="input-label" htmlFor="login-password">PASSWORD</label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="forgot-btn"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="input-field-wrap">
                <span className="field-icon">🔒</span>
                <input
                  id="login-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-submit-auth">
              {loading ? <span className="spinner"></span> : 'Sign In to WedWithMe'}
            </button>

            <div className="auth-divider">
              <span>or sign in with</span>
            </div>

            <div className="social-auth-row">
              <button
                type="button"
                className="social-auth-btn"
                onClick={() => switchMode('email-otp')}
              >
                <span style={{ fontSize: '15px' }}>✉️</span>
                <span>Email OTP</span>
              </button>

              <button
                type="button"
                className="social-auth-btn"
                onClick={() => handleSocialAuth('Google')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                </svg>
                <span>Google</span>
              </button>
            </div>
          </form>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODE 2: Email OTP Direct Sign-in                    */}
        {/* ---------------------------------------------------- */}
        {mode === 'email-otp' && (
          <form onSubmit={handleEmailOtpLogin} className="auth-form">
            <div className="input-group">
              <label className="input-label" htmlFor="otp-login-email">REGISTERED EMAIL</label>
              <div className="input-field-wrap">
                <span className="field-icon">✉️</span>
                <input
                  id="otp-login-email"
                  type="email"
                  required
                  disabled={otpSent}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            {!otpSent ? (
              <button
                type="button"
                onClick={() => handleSendOtp('LOGIN')}
                disabled={loading}
                className="btn-submit-auth"
              >
                {loading ? <span className="spinner"></span> : 'Send Verification OTP 📩'}
              </button>
            ) : (
              <>
                <div className="input-group">
                  <div className="password-label-row">
                    <label className="input-label" htmlFor="otp-login-code">6-DIGIT EMAIL CODE</label>
                    <button
                      type="button"
                      disabled={otpCooldown > 0 || loading}
                      onClick={() => handleSendOtp('LOGIN', true)}
                      className="resend-link-btn"
                    >
                      {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                  <div className="input-field-wrap">
                    <span className="field-icon">🔢</span>
                    <input
                      id="otp-login-code"
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="auth-input otp-highlight-input"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-submit-auth">
                  {loading ? <span className="spinner"></span> : 'Verify & Sign In'}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => switchMode('login')}
              className="switch-link-btn"
            >
              Prefer password? Sign in with password instead
            </button>
          </form>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODE 3: Register with Email OTP                      */}
        {/* ---------------------------------------------------- */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            {/* Role Selection */}
            <div className="role-selector-wrap">
              <label className="input-label">SELECT YOUR PROFILE TYPE</label>
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-chip ${role === 'couple' ? 'role-selected' : ''}`}
                  onClick={() => setRole('couple')}
                >
                  <span className="role-icon">💍</span>
                  <span className="role-name">Bride / Groom</span>
                </button>
                <button
                  type="button"
                  className={`role-chip ${role === 'vendor' ? 'role-selected' : ''}`}
                  onClick={() => setRole('vendor')}
                >
                  <span className="role-icon">👑</span>
                  <span className="role-name">Vendor</span>
                </button>
                <button
                  type="button"
                  className={`role-chip ${role === 'guest' ? 'role-selected' : ''}`}
                  onClick={() => setRole('guest')}
                >
                  <span className="role-icon">👥</span>
                  <span className="role-name">Guest</span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div className="input-group">
              <label className="input-label" htmlFor="reg-name">FULL NAME</label>
              <div className="input-field-wrap">
                <span className="field-icon">👤</span>
                <input
                  id="reg-name"
                  type="text"
                  required
                  placeholder="e.g. Mohit Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            {/* Email Address with Send OTP inline */}
            <div className="input-group">
              <div className="password-label-row">
                <label className="input-label" htmlFor="reg-email">EMAIL ADDRESS</label>
                {otpSent && (
                  <button
                    type="button"
                    disabled={otpCooldown > 0 || loading}
                    onClick={() => handleSendOtp('REGISTER', true)}
                    className="resend-link-btn"
                  >
                    {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend Code'}
                  </button>
                )}
              </div>
              <div className="input-field-wrap">
                <span className="field-icon">✉️</span>
                <input
                  id="reg-email"
                  type="email"
                  required
                  disabled={otpSent}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                />
                {!otpSent && (
                  <button
                    type="button"
                    onClick={() => handleSendOtp('REGISTER')}
                    disabled={loading || !email.includes('@')}
                    className="inline-otp-btn"
                  >
                    {loading ? '...' : 'Verify Email'}
                  </button>
                )}
              </div>
            </div>

            {/* OTP Code (Revealed once sent) */}
            {otpSent && (
              <div className="input-group">
                <label className="input-label" htmlFor="reg-otp">6-DIGIT EMAIL VERIFICATION CODE</label>
                <div className="input-field-wrap">
                  <span className="field-icon">🔢</span>
                  <input
                    id="reg-otp"
                    type="text"
                    maxLength={6}
                    required
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="auth-input otp-highlight-input"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="input-group">
              <label className="input-label" htmlFor="reg-password">CREATE PASSWORD</label>
              <div className="input-field-wrap">
                <span className="field-icon">🔒</span>
                <input
                  id="reg-password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={loading} className="btn-submit-auth">
              {loading ? (
                <span className="spinner"></span>
              ) : !otpSent ? (
                'Send Verification OTP & Register'
              ) : (
                'Verify & Complete Registration'
              )}
            </button>
          </form>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODE 4: Forgot Password Flow                        */}
        {/* ---------------------------------------------------- */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="input-group">
              <label className="input-label" htmlFor="forgot-email">YOUR ACCOUNT EMAIL</label>
              <div className="input-field-wrap">
                <span className="field-icon">✉️</span>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  disabled={otpSent}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            {!otpSent ? (
              <button
                type="button"
                onClick={() => handleSendOtp('FORGOT_PASSWORD')}
                disabled={loading}
                className="btn-submit-auth"
              >
                {loading ? <span className="spinner"></span> : 'Send Reset Code 📩'}
              </button>
            ) : (
              <>
                <div className="input-group">
                  <div className="password-label-row">
                    <label className="input-label" htmlFor="forgot-otp">6-DIGIT RESET CODE</label>
                    <button
                      type="button"
                      disabled={otpCooldown > 0 || loading}
                      onClick={() => handleSendOtp('FORGOT_PASSWORD', true)}
                      className="resend-link-btn"
                    >
                      {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                  <div className="input-field-wrap">
                    <span className="field-icon">🔢</span>
                    <input
                      id="forgot-otp"
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="auth-input otp-highlight-input"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="forgot-new-pwd">NEW PASSWORD</label>
                  <div className="input-field-wrap">
                    <span className="field-icon">🔒</span>
                    <input
                      id="forgot-new-pwd"
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="forgot-confirm-pwd">CONFIRM NEW PASSWORD</label>
                  <div className="input-field-wrap">
                    <span className="field-icon">🔒</span>
                    <input
                      id="forgot-confirm-pwd"
                      type="password"
                      required
                      placeholder="Re-type new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-submit-auth">
                  {loading ? <span className="spinner"></span> : 'Reset Password & Save'}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => switchMode('login')}
              className="switch-link-btn"
            >
              Remember your password? Back to Sign In
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="auth-footer-note">
          Protected by <strong>WedWithMe Escrow & Privacy Shield</strong>
          <br />
          By continuing, you agree to our{' '}
          <a href="#" className="terms-link">Terms</a> &amp;{' '}
          <a href="#" className="terms-link">Privacy Policy</a>.
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 18, 12, 0.85);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          z-index: 3000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          animation: fadeIn 0.2s ease-out;
        }

        .auth-card {
          width: 100%;
          max-width: 460px;
          background: linear-gradient(180deg, rgba(6, 42, 28, 0.98) 0%, rgba(3, 23, 16, 0.99) 100%);
          border-radius: 28px;
          padding: 34px 36px 28px;
          position: relative;
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.7), 0 0 35px rgba(255, 42, 115, 0.16);
          border: 1.5px solid rgba(229, 193, 88, 0.32);
          animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: 92vh;
          overflow-y: auto;
          color: #ffffff;
        }

        .card-top-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 220px;
          height: 90px;
          background: radial-gradient(circle, rgba(255, 42, 115, 0.3) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .auth-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(229, 193, 88, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: #d1ded7;
          transition: all 0.2s ease;
          z-index: 2;
          cursor: pointer;
        }

        .auth-close-btn:hover {
          background: rgba(255, 42, 115, 0.25);
          border-color: #ff2a73;
          color: #ffffff;
          transform: rotate(90deg);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 18px;
          position: relative;
          z-index: 1;
        }

        .logo-svg-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 8px;
        }

        .brand-title-wrap {
          margin-bottom: 8px;
        }

        .brand-name-text {
          font-size: 24px !important;
          font-weight: 800 !important;
          color: #e5c158 !important;
          letter-spacing: -0.3px !important;
          display: block !important;
          line-height: 1.1 !important;
          text-shadow: 0 2px 10px rgba(229, 193, 88, 0.25) !important;
        }

        .brand-tagline-text {
          font-size: 10px !important;
          font-weight: 700 !important;
          color: #fae8a4 !important;
          letter-spacing: 0.8px !important;
          text-transform: uppercase !important;
          display: block !important;
          margin-top: 2px;
        }

        .auth-title {
          font-size: 21px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .auth-sub {
          font-size: 12px;
          color: #9cb1a6;
          line-height: 1.45;
          max-width: 360px;
          margin: 0 auto;
        }

        .auth-tabs {
          display: flex;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(229, 193, 88, 0.2);
          border-radius: 9999px;
          padding: 4px;
          margin-bottom: 18px;
          position: relative;
          z-index: 1;
        }

        .submode-back-bar {
          margin-bottom: 16px;
          display: flex;
        }

        .back-btn {
          background: none;
          border: none;
          color: #fae8a4;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.15s ease;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .tab-btn {
          flex: 1;
          padding: 9px 0;
          font-size: 13.5px;
          font-weight: 700;
          color: #9cb1a6;
          border-radius: 9999px;
          transition: all 0.2s ease;
          text-align: center;
          background: none;
          border: none;
          cursor: pointer;
        }

        .tab-btn:hover {
          color: #ffffff;
        }

        .active-tab {
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 14px rgba(230, 0, 92, 0.45) !important;
        }

        .notification-toast {
          background: rgba(6, 49, 33, 0.95);
          border: 1px solid #10b981;
          color: #a7f3d0;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
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

        .error-alert {
          background: rgba(230, 0, 92, 0.18);
          border: 1px solid #ff2a73;
          color: #ffb3c6;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          animation: slideDown 0.2s ease;
        }

        .error-icon {
          font-size: 14px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative;
          z-index: 1;
        }

        .role-selector-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .role-selector {
          display: flex;
          gap: 8px;
        }

        .role-chip {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 6px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          color: #d1ded7;
          border: 1px solid rgba(229, 193, 88, 0.18);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .role-chip:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(229, 193, 88, 0.4);
        }

        .role-icon {
          font-size: 18px;
        }

        .role-name {
          font-size: 11px;
          font-weight: 700;
        }

        .role-selected {
          background: rgba(255, 42, 115, 0.2) !important;
          border-color: #ff2a73 !important;
          color: #ffffff !important;
          box-shadow: 0 0 14px rgba(255, 42, 115, 0.3) !important;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .input-label {
          font-size: 11px;
          font-weight: 700;
          color: #e5c158;
          letter-spacing: 0.6px;
          text-transform: uppercase;
        }

        .input-field-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-icon {
          position: absolute;
          left: 12px;
          font-size: 14px;
          pointer-events: none;
          opacity: 0.8;
          z-index: 2;
        }

        .auth-input {
          width: 100%;
          padding: 11px 14px 11px 36px;
          border-radius: 12px;
          border: 1px solid rgba(229, 193, 88, 0.25);
          background: rgba(2, 19, 12, 0.85);
          font-size: 13.5px;
          color: #ffffff;
          transition: all 0.2s ease;
        }

        .auth-input::placeholder {
          color: #5d7568;
        }

        .auth-input:focus {
          border-color: #ff2a73;
          background: rgba(3, 27, 18, 0.95);
          box-shadow: 0 0 0 3px rgba(255, 42, 115, 0.25);
          outline: none;
        }

        .otp-highlight-input {
          letter-spacing: 6px;
          font-family: monospace;
          font-size: 18px;
          font-weight: 800;
          color: #ff528c;
          text-align: center;
          padding-left: 14px;
        }

        .inline-otp-btn {
          position: absolute;
          right: 6px;
          background: rgba(255, 42, 115, 0.2);
          border: 1px solid #ff2a73;
          color: #ffb3c6;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .inline-otp-btn:hover:not(:disabled) {
          background: #ff2a73;
          color: #ffffff;
        }

        .password-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .forgot-btn {
          background: none;
          border: none;
          padding: 0;
          font-size: 11px;
          color: #fae8a4;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
        }

        .forgot-btn:hover {
          color: #ffffff;
        }

        .resend-link-btn {
          background: none;
          border: none;
          font-size: 11px;
          color: #ff80a6;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }

        .resend-link-btn:disabled {
          color: #667e72;
          cursor: not-allowed;
          text-decoration: none;
        }

        .switch-link-btn {
          background: none;
          border: none;
          color: #9cb1a6;
          font-size: 12px;
          text-align: center;
          cursor: pointer;
          text-decoration: underline;
          margin-top: 4px;
        }

        .switch-link-btn:hover {
          color: #ffffff;
        }

        .btn-submit-auth {
          margin-top: 6px;
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%) !important;
          color: #ffffff !important;
          font-size: 14.5px;
          font-weight: 800;
          padding: 13px;
          border-radius: 9999px;
          box-shadow: 0 4px 18px rgba(230, 0, 92, 0.45);
          border: none;
          transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .btn-submit-auth:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(230, 0, 92, 0.6);
        }

        .btn-submit-auth:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 4px 0;
          font-size: 11px;
          color: #799184;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid rgba(229, 193, 88, 0.16);
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
          border-radius: 12px;
          border: 1px solid rgba(229, 193, 88, 0.22);
          background: rgba(255, 255, 255, 0.05);
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .social-auth-btn:hover {
          background: rgba(255, 42, 115, 0.16);
          border-color: #ff2a73;
        }

        .auth-footer-note {
          margin-top: 18px;
          text-align: center;
          font-size: 11px;
          color: #8da396;
          line-height: 1.45;
        }

        .terms-link {
          color: #e5c158;
          text-decoration: underline;
        }

        .terms-link:hover {
          color: #ffffff;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { transform: scale(0.94); opacity: 0; }
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
