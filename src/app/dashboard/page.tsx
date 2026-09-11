'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CustomerDashboardPage() {
  const [activeTab, setActiveTab] = useState<'matches' | 'bookings' | 'privacy' | 'checklist'>('matches');
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [privacySettings, setPrivacySettings] = useState<any>(null);
  const [consents, setConsents] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [email, setEmail] = useState('gopal.yadav@example.com');
  const [password, setPassword] = useState('User@123456');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);

  // Modals
  const [cancelModalBooking, setCancelModalBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('Change of event plans');

  const [disputeModalBooking, setDisputeModalBooking] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState('Service not as described');
  const [disputeStatement, setDisputeStatement] = useState('');

  const [reviewModalBooking, setReviewModalBooking] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('Outstanding service! Highly recommended.');

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authData.authenticated) {
        setAuthNeeded(true);
        setLoading(false);
        return;
      }
      setUser(authData.user);
      setAuthNeeded(false);

      // Load parallel data
      await Promise.all([
        loadMatches(),
        loadBookings(),
        loadPrivacy(),
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    try {
      const res = await fetch('/api/matrimonial/matches');
      const data = await res.json();
      if (data.success) setMatches(data.data || []);
    } catch {}
  };

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.success) setBookings(data.data || []);
    } catch {}
  };

  const loadPrivacy = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/privacy/settings'),
        fetch('/api/privacy/consent'),
      ]);
      const [pData, cData] = await pRes.json();
      if (pData.success) setPrivacySettings(pData.data);
      if (cData.success) setConsents(cData.data || []);
    } catch {}
  };

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthNeeded(false);
        loadCustomerData();
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayEscrow = async (bookingId: string) => {
    setPayingBookingId(bookingId);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'razorpay' }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Payment confirmed! Booking is now guaranteed under WedWithMe Escrow Protection.');
        loadBookings();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPayingBookingId(null);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    try {
      const res = await fetch(`/api/bookings/${cancelModalBooking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setCancelModalBooking(null);
        loadBookings();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRaiseDispute = async () => {
    if (!disputeModalBooking) return;
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: disputeModalBooking.id,
          reason: disputeReason,
          statement: disputeStatement,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setDisputeModalBooking(null);
        loadBookings();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewModalBooking) return;
    try {
      const res = await fetch('/api/vendors/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: reviewModalBooking.vendor_id,
          booking_id: reviewModalBooking.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Thank you! Your verified review has been submitted and incorporated into vendor rating.');
        setReviewModalBooking(null);
        loadBookings();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdatePrivacy = async (field: string, value: string) => {
    try {
      const body = { [field]: value };
      const res = await fetch('/api/privacy/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Privacy preference saved');
        loadPrivacy();
      }
    } catch {}
  };

  const handleExportData = () => {
    window.open('/api/privacy/export', '_blank');
  };

  if (authNeeded) {
    return (
      <div style={{ minHeight: '100vh', background: '#031710', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: '#062a1c', border: '1px solid rgba(229,193,88,0.3)', borderRadius: '20px', padding: '36px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <svg width="48" height="34" viewBox="0 0 54 40" fill="none">
                <defs>
                  <linearGradient id="dashPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff2a73" />
                    <stop offset="100%" stopColor="#e6005c" />
                  </linearGradient>
                  <linearGradient id="dashHeartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff528c" />
                    <stop offset="100%" stopColor="#d8004f" />
                  </linearGradient>
                </defs>
                <path d="M4 10L11 32L17 14L22 30L26 12" stroke="url(#dashPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z" fill="url(#dashHeartGrad)" />
                <path d="M28 12L32 30L37 14L43 32L50 10" stroke="url(#dashPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ color: '#e5c158', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>WedWithMe</span>
            <div style={{ fontSize: '11px', color: '#fae8a4', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Customer Suite</div>
            <h2 style={{ fontSize: '18px', marginTop: '12px', color: '#fff' }}>Welcome Back</h2>
            <p style={{ fontSize: '13px', color: '#9cb1a6' }}>Log in to view your matches, bookings, and privacy settings</p>
          </div>
          {error && <div style={{ background: 'rgba(230,0,92,0.2)', border: '1px solid #ff2a73', color: '#ffb3c6', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
          <form onSubmit={handleCustomerLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: '600', marginBottom: '6px' }}>EMAIL ADDRESS</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: '#031710', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: '600', marginBottom: '6px' }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: '#031710', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 4px 16px rgba(230,0,92,0.4)',
                fontSize: '14px',
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In to Customer Suite'}
            </button>
          </form>
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#9cb1a6' }}>
            Looking for public site? <Link href="/" style={{ color: '#e5c158', fontWeight: '600' }}>Return to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const sidebarNavItems = [
    { id: 'matches', label: 'Matrimonial Matches', icon: '💍', count: matches.length },
    { id: 'bookings', label: 'My Bookings & Escrow', icon: '🛎️', count: bookings.length },
    { id: 'checklist', label: 'Wedding Checklist', icon: '📋' },
    { id: 'privacy', label: 'Privacy & Data Rights', icon: '🔒' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#06140e', color: '#fff', display: 'flex' }}>
      {/* ================= LEFT SIDEBAR ================= */}
      <aside style={{
        width: '280px',
        flexShrink: 0,
        background: '#031710',
        borderRight: '1px solid rgba(229, 193, 88, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Sidebar Brand Header */}
        <div style={{ padding: '24px 22px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="32" height="24" viewBox="0 0 54 40" fill="none">
              <path d="M4 10L11 32L17 14L22 30L26 12" stroke="url(#dashPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z" fill="url(#dashHeartGrad)" />
              <path d="M28 12L32 30L37 14L43 32L50 10" stroke="url(#dashPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: '22px', fontWeight: '800', color: '#e5c158', letterSpacing: '-0.3px' }}>WedWithMe</span>
          </Link>
          <span style={{
            fontSize: '10px',
            background: 'rgba(229,193,88,0.15)',
            color: '#e5c158',
            padding: '3px 8px',
            borderRadius: '4px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            display: 'inline-block',
            marginTop: '6px',
            border: '1px solid rgba(229,193,88,0.25)',
          }}>
            Customer Portal
          </span>
        </div>

        {/* User Identity Chip */}
        <div style={{ padding: '16px 22px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            fontSize: '16px',
            boxShadow: '0 4px 10px rgba(230,0,92,0.3)',
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.name || 'Customer'}
            </div>
            <div style={{ fontSize: '11px', color: '#9cb1a6', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.email || 'customer@wedwithme.com'}
            </div>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', color: '#9cb1a6', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 10px 6px' }}>
            Dashboard Menu
          </div>
          {sidebarNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  fontWeight: isActive ? '700' : '600',
                  background: isActive ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : '#9cb1a6',
                  boxShadow: isActive ? '0 4px 14px rgba(230,0,92,0.38)' : 'none',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    fontWeight: '700',
                  }}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          <div style={{ fontSize: '10px', color: '#9cb1a6', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 10px 6px' }}>
            Marketplace
          </div>
          <Link
            href="/vendors"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 14px',
              borderRadius: '10px',
              color: '#9cb1a6',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: '600',
              transition: 'background 0.2s ease',
            }}
          >
            <span>🛍️</span>
            <span>Browse All Vendors</span>
          </Link>
          <Link
            href="/matches"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 14px',
              borderRadius: '10px',
              color: '#9cb1a6',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: '600',
              transition: 'background 0.2s ease',
            }}
          >
            <span>✨</span>
            <span>Browse Profiles</span>
          </Link>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 14px',
              borderRadius: '10px',
              color: '#9cb1a6',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: '600',
              transition: 'background 0.2s ease',
            }}
          >
            <span>🏠</span>
            <span>Back to Home</span>
          </Link>
        </nav>

        {/* Sidebar Footer with Pink Logout Button */}
        <div style={{ padding: '18px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              setAuthNeeded(true);
            }}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '13px',
              boxShadow: '0 4px 14px rgba(230,0,92,0.38)',
              transition: 'all 0.2s ease',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ================= RIGHT MAIN AREA ================= */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Bar */}
        <header style={{
          height: '70px',
          borderBottom: '1px solid rgba(229,193,88,0.18)',
          background: '#031710',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
              {activeTab === 'matches' && '💍 AI-Matched Compatible Profiles'}
              {activeTab === 'bookings' && '🛎️ My Wedding Bookings & Platform Escrow'}
              {activeTab === 'checklist' && '📋 Wedding Planning Milestones'}
              {activeTab === 'privacy' && '🔒 Personal Data Privacy & Consents'}
            </h1>
            <p style={{ fontSize: '12px', color: '#9cb1a6', margin: 0 }}>
              Customer Suite • Escrow Protected Celebrations
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link
              href="/vendors"
              style={{
                padding: '9px 18px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '700',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(230,0,92,0.35)',
              }}
            >
              + Find New Vendors
            </Link>
          </div>
        </header>

        {/* Main Content Body */}
        <main style={{ flex: 1, padding: '32px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          {error && (
            <div style={{ background: 'rgba(230,0,92,0.15)', border: '1px solid #ff2a73', color: '#ffb3c6', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px' }}>
              ⚠️ {error}
            </div>
          )}
          {successMsg && (
            <div style={{ background: 'rgba(56,161,105,0.15)', border: '1px solid #38a169', color: '#9ae6b4', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px' }}>
              ✓ {successMsg}
            </div>
          )}

          {/* ================= TAB 1: MATCHES ================= */}
          {activeTab === 'matches' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>Verified Matrimonial Matches</h2>
                  <p style={{ fontSize: '13px', color: '#9cb1a6' }}>AI compatibility and Vedic Ashtakoota Kundali alignment</p>
                </div>
                <Link
                  href="/matches"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '13px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(230,0,92,0.35)',
                  }}
                >
                  View All Discovery Matches →
                </Link>
              </div>

              {matches.length === 0 ? (
                <div style={{ background: '#031710', border: '1px solid rgba(229,193,88,0.2)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                  <p style={{ color: '#9cb1a6', fontSize: '15px' }}>No matches found in your immediate queue. Explore our verified matrimonial profiles directory.</p>
                  <Link href="/matches" style={{ display: 'inline-block', marginTop: '14px', padding: '10px 22px', borderRadius: '8px', background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)', color: '#fff', fontWeight: '700', textDecoration: 'none' }}>
                    Browse Profiles
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '22px' }}>
                  {matches.map((m: any, idx: number) => (
                    <div key={idx} style={{ background: '#031710', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(229,193,88,0.22)', boxShadow: '0 6px 20px rgba(0,0,0,0.3)' }}>
                      <img src={m.photoUrl || m.photo_url || '/images/priya.jpg'} alt={m.name} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                      <div style={{ padding: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>{m.name}</h3>
                          <span style={{ fontSize: '11px', background: 'rgba(229,193,88,0.2)', color: '#e5c158', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                            {m.matchScore || `${m.compatibility_score || 90}% Match`}
                          </span>
                        </div>
                        <p style={{ color: '#9cb1a6', fontSize: '13px', marginTop: '4px' }}>
                          {m.age} yrs • {m.height} • {m.city}
                        </p>
                        <div style={{ fontSize: '13px', color: '#cbd5e0', marginTop: '8px' }}>
                          {m.profession} • {m.education}
                        </div>
                        <Link
                          href="/matches"
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'center',
                            marginTop: '14px',
                            padding: '9px 0',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '13px',
                            textDecoration: 'none',
                            boxShadow: '0 4px 12px rgba(230,0,92,0.35)',
                          }}
                        >
                          Send Interest 💖
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: BOOKINGS ================= */}
          {activeTab === 'bookings' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>Wedding Services Bookings & Escrow Protection</h2>
                  <p style={{ fontSize: '13px', color: '#9cb1a6' }}>All advances are safely guarded in platform escrow until execution day</p>
                </div>
                <Link
                  href="/vendors"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '13px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(230,0,92,0.35)',
                  }}
                >
                  Book New Vendor →
                </Link>
              </div>

              {bookings.length === 0 ? (
                <div style={{ background: '#031710', border: '1px solid rgba(229,193,88,0.2)', borderRadius: '16px', padding: '50px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '42px', marginBottom: '12px' }}>🛎️</div>
                  <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '6px' }}>No bookings placed yet</h3>
                  <p style={{ color: '#9cb1a6', fontSize: '14px', maxWidth: '500px', margin: '0 auto 20px' }}>
                    Discover verified venues, photographers, caterers, and decorators. Pay advances securely with 100% platform escrow protection.
                  </p>
                  <Link
                    href="/vendors"
                    style={{
                      display: 'inline-block',
                      padding: '11px 26px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                      color: '#fff',
                      fontWeight: '700',
                      textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(230,0,92,0.4)',
                    }}
                  >
                    Browse Wedding Marketplace
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {bookings.map((b) => {
                    const isPendingPay = b.status === 'REQUESTED' || b.status === 'PENDING' || b.status === 'ACCEPTED';
                    const isConfirmed = b.status === 'CONFIRMED';
                    const isCompleted = b.status === 'COMPLETED';

                    return (
                      <div key={b.id} style={{ background: '#031710', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.22)', padding: '24px', boxShadow: '0 6px 20px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158' }}>#{b.booking_number}</span>
                              <span style={{
                                fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold',
                                background: isConfirmed || isCompleted ? 'rgba(56,161,105,0.2)' : 'rgba(237,137,54,0.2)',
                                color: isConfirmed || isCompleted ? '#48bb78' : '#ed8936',
                              }}>
                                {b.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginTop: '6px' }}>
                              Vendor: {b.vendor_name || 'Wedding Professional'} ({b.vendor_city || 'India'})
                            </div>
                            <div style={{ fontSize: '13px', color: '#9cb1a6', marginTop: '2px' }}>
                              Event Date: {new Date(b.event_date).toLocaleDateString()} • {b.guest_count} guests
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff' }}>
                              ₹{parseFloat(b.total_amount).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: '#48bb78', fontWeight: '600' }}>🛡️ 100% Escrow Guarded</div>
                          </div>
                        </div>

                        {/* Status Stepper */}
                        <div style={{ background: '#062a1c', borderRadius: '10px', padding: '14px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', border: '1px solid rgba(229,193,88,0.15)' }}>
                          <span style={{ color: '#48bb78', fontWeight: 'bold' }}>✓ Requested</span>
                          <span style={{ color: b.status !== 'REQUESTED' ? '#48bb78' : '#9cb1a6', fontWeight: 'bold' }}>
                            {b.status !== 'REQUESTED' ? '✓' : '○'} Confirmed
                          </span>
                          <span style={{ color: b.status === 'IN_PROGRESS' || b.status === 'COMPLETED' ? '#48bb78' : '#9cb1a6', fontWeight: 'bold' }}>
                            {b.status === 'IN_PROGRESS' || b.status === 'COMPLETED' ? '✓' : '○'} In Execution
                          </span>
                          <span style={{ color: b.status === 'COMPLETED' ? '#48bb78' : '#9cb1a6', fontWeight: 'bold' }}>
                            {b.status === 'COMPLETED' ? '✓' : '○'} Completed
                          </span>
                        </div>

                        {/* Action Buttons (ALL PINK PER USER COMMAND) */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {isPendingPay && (
                            <button
                              onClick={() => handlePayEscrow(b.id)}
                              disabled={payingBookingId === b.id}
                              style={{
                                padding: '10px 22px',
                                background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                color: '#fff',
                                fontWeight: '700',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(230,0,92,0.38)',
                              }}
                            >
                              {payingBookingId === b.id ? 'Processing...' : '💳 Pay Advance with Escrow Protection'}
                            </button>
                          )}
                          {isCompleted && (
                            <button
                              onClick={() => setReviewModalBooking(b)}
                              style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                color: '#fff',
                                fontWeight: '700',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                boxShadow: '0 4px 12px rgba(230,0,92,0.38)',
                              }}
                            >
                              ⭐ Leave Verified Review
                            </button>
                          )}
                          {isConfirmed && (
                            <button
                              onClick={() => setDisputeModalBooking(b)}
                              style={{
                                padding: '10px 18px',
                                background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '700',
                                boxShadow: '0 4px 12px rgba(230,0,92,0.38)',
                              }}
                            >
                              ⚖️ File Dispute
                            </button>
                          )}
                          {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && (
                            <button
                              onClick={() => setCancelModalBooking(b)}
                              style={{
                                padding: '10px 16px',
                                background: 'transparent',
                                border: '1px solid rgba(230,0,92,0.5)',
                                color: '#ff6b9d',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                              }}
                            >
                              Cancel Booking
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cancel Modal with Policy Preview */}
              {cancelModalBooking && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                  <div style={{ maxWidth: '480px', width: '100%', background: '#031710', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.35)', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>
                      Cancel Booking #{cancelModalBooking.booking_number}
                    </h3>
                    <div style={{ background: '#062a1c', padding: '14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', border: '1px solid rgba(229,193,88,0.2)' }}>
                      <div style={{ color: '#e5c158', fontWeight: 'bold', marginBottom: '4px' }}>CANCELLATION & REFUND POLICY:</div>
                      <div style={{ color: '#cbd5e0' }}>• ≥ 30 days prior: <strong>90% refund</strong></div>
                      <div style={{ color: '#cbd5e0' }}>• 15 to 29 days prior: <strong>50% refund</strong></div>
                      <div style={{ color: '#cbd5e0' }}>• &lt; 15 days prior: <strong>No refund</strong></div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9cb1a6', marginBottom: '6px' }}>REASON FOR CANCELLATION</label>
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#062a1c', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setCancelModalBooking(null)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #4a5568', color: '#cbd5e0', borderRadius: '8px', cursor: 'pointer' }}>Keep Booking</button>
                      <button onClick={handleCancelBooking} style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Confirm Cancellation</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Dispute Modal */}
              {disputeModalBooking && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                  <div style={{ maxWidth: '480px', width: '100%', background: '#031710', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.35)', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>
                      File Dispute for Booking #{disputeModalBooking.booking_number}
                    </h3>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9cb1a6', marginBottom: '4px' }}>REASON</label>
                      <select
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#062a1c', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                      >
                        <option value="Vendor unavailable">Vendor unavailable / unreachable</option>
                        <option value="Service quality issue">Service quality discrepancy</option>
                        <option value="Billing discrepancy">Billing or charge discrepancy</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9cb1a6', marginBottom: '4px' }}>STATEMENT</label>
                      <textarea
                        rows={3}
                        value={disputeStatement}
                        onChange={(e) => setDisputeStatement(e.target.value)}
                        placeholder="Explain circumstance for arbitration..."
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#062a1c', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setDisputeModalBooking(null)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #4a5568', color: '#cbd5e0', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleRaiseDispute} style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Submit to Arbitration</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Review Modal */}
              {reviewModalBooking && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                  <div style={{ maxWidth: '480px', width: '100%', background: '#031710', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.35)', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>
                      Leave Verified Review for {reviewModalBooking.vendor_name}
                    </h3>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9cb1a6', marginBottom: '6px' }}>RATING (1 to 5 Stars)</label>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(parseInt(e.target.value, 10))}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#062a1c', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                      >
                        <option value="5">★★★★★ (5 Stars - Exceptional)</option>
                        <option value="4">★★★★☆ (4 Stars - Very Good)</option>
                        <option value="3">★★★☆☆ (3 Stars - Average)</option>
                        <option value="2">★★☆☆☆ (2 Stars - Poor)</option>
                        <option value="1">★☆☆☆☆ (1 Star - Very Unsatisfied)</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9cb1a6', marginBottom: '6px' }}>YOUR EXPERIENCE FEEDBACK</label>
                      <textarea
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#062a1c', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setReviewModalBooking(null)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #4a5568', color: '#cbd5e0', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleSubmitReview} style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Publish Review</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: PRIVACY & DATA ================= */}
          {activeTab === 'privacy' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '28px' }}>
                {/* Field-level privacy */}
                <div style={{ background: '#031710', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Field-Level Privacy Controls</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9cb1a6', marginBottom: '4px' }}>PHONE NUMBER VISIBILITY</label>
                      <select
                        value={privacySettings?.phone_visibility || 'MATCHED_ONLY'}
                        onChange={(e) => handleUpdatePrivacy('phone_visibility', e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#062a1c', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                      >
                        <option value="MATCHED_ONLY">Mutual Matches Only</option>
                        <option value="PUBLIC">Public</option>
                        <option value="PRIVATE">Strictly Private</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9cb1a6', marginBottom: '4px' }}>EMAIL ADDRESS VISIBILITY</label>
                      <select
                        value={privacySettings?.email_visibility || 'PRIVATE'}
                        onChange={(e) => handleUpdatePrivacy('email_visibility', e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#062a1c', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                      >
                        <option value="PRIVATE">Strictly Private</option>
                        <option value="MATCHED_ONLY">Mutual Matches Only</option>
                        <option value="PUBLIC">Public</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9cb1a6', marginBottom: '4px' }}>ANNUAL INCOME VISIBILITY</label>
                      <select
                        value={privacySettings?.income_visibility || 'MATCHED_ONLY'}
                        onChange={(e) => handleUpdatePrivacy('income_visibility', e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#062a1c', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                      >
                        <option value="MATCHED_ONLY">Mutual Matches Only</option>
                        <option value="PUBLIC">Public</option>
                        <option value="PRIVATE">Hide Completely</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Data Export & Deactivation */}
                <div style={{ background: '#031710', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>Your Data & Privacy Rights</h3>
                    <p style={{ fontSize: '13px', color: '#9cb1a6', marginBottom: '16px' }}>
                      Download a comprehensive JSON package of your profile information, partner preferences, bookings, reviews, and consent logs.
                    </p>
                    <button
                      onClick={handleExportData}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginBottom: '16px',
                        boxShadow: '0 4px 14px rgba(230,0,92,0.38)',
                      }}
                    >
                      ⬇️ Download My Data (JSON Export)
                    </button>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#ff6b9d', fontWeight: 'bold', marginBottom: '4px' }}>DANGER ZONE</div>
                    <p style={{ fontSize: '11px', color: '#9cb1a6', marginBottom: '10px' }}>
                      Deactivate your account and soft-delete/anonymize personal records per privacy laws.
                    </p>
                    <button
                      onClick={async () => {
                        if (!confirm('Are you sure you want to deactivate your account?')) return;
                        const res = await fetch('/api/privacy/delete-account', { method: 'POST' });
                        const d = await res.json();
                        if (d.success) {
                          alert(d.message);
                          window.location.href = '/';
                        } else {
                          alert(d.message);
                        }
                      }}
                      style={{ width: '100%', padding: '9px', background: 'transparent', border: '1px solid rgba(230,0,92,0.5)', color: '#ff6b9d', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                    >
                      Deactivate My Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: CHECKLIST ================= */}
          {activeTab === 'checklist' && (
            <div style={{ background: '#031710', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>Wedding Planning Milestones</h2>
                  <p style={{ fontSize: '13px', color: '#9cb1a6' }}>Track progress from engagement celebration to reception sendoff</p>
                </div>
                <span style={{ fontSize: '12px', background: 'rgba(56,161,105,0.2)', color: '#48bb78', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
                  Milestones In Progress
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { title: 'Determine Wedding Budget & Guest List Range', done: true },
                  { title: 'Finalize Wedding Venue & Reserve Dates', done: true },
                  { title: 'Book Photographer & Cinematographer via Escrow', done: bookings.length > 0 },
                  { title: 'Select Decorator & Theme Design Palette', done: false },
                  { title: 'Confirm Catering Menu & Imperial Tasting Session', done: false },
                  { title: 'Send Digital Save-The-Dates & RSVPs', done: false },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#062a1c', padding: '16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: item.done ? '#48bb78' : '#718096', fontSize: '20px', fontWeight: 'bold' }}>{item.done ? '✓' : '○'}</span>
                    <span style={{ color: item.done ? '#9cb1a6' : '#fff', textDecoration: item.done ? 'line-through' : 'none', fontSize: '14px', fontWeight: '500' }}>{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
