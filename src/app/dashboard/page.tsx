'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { homePathForRole, isCustomerRole, isStaffRole, isVendorRole, persistStaffSession } from '@/lib/roleHome';
import CustomerProfileEditor from '@/components/CustomerProfileEditor';
import PartnerPreferencesEditor from '@/components/PartnerPreferencesEditor';
import CustomerMatchesSection from '@/components/CustomerMatchesSection';
import CustomerSearchSection from '@/components/CustomerSearchSection';
import CustomerShortlistSection from '@/components/CustomerShortlistSection';
import CustomerInterestsSection from '@/components/CustomerInterestsSection';
import CustomerMatrimonialChat from '@/components/CustomerMatrimonialChat';

function loadScript(src: string) {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'preferences' | 'matches' | 'shortlist' | 'search' | 'saved_searches' | 'bookings' | 'privacy' | 'checklist' | 'notifications' | 'interests' | 'chat'>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [privacySettings, setPrivacySettings] = useState<any>(null);
  const [consents, setConsents] = useState<any[]>([]);

  // Shortlists & Overview States
  const [shortlists, setShortlists] = useState<any[]>([]);
  const [shortlistCount, setShortlistCount] = useState<number>(0);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [profileCompletion, setProfileCompletion] = useState<{ percentage: number; missingFields: any[] }>({ percentage: 0, missingFields: [] });

  // Privacy & Blocking States
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [blockedLoading, setBlockedLoading] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatPeerUserId, setChatPeerUserId] = useState<string | null>(null);

  // Modals
  const [cancelModalBooking, setCancelModalBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [disputeModalBooking, setDisputeModalBooking] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeStatement, setDisputeStatement] = useState('');

  const [reviewModalBooking, setReviewModalBooking] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['dashboard', 'profile', 'preferences', 'matches', 'shortlist', 'search', 'saved_searches', 'bookings', 'privacy', 'checklist', 'notifications', 'interests', 'chat'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const authRes = await fetch('/api/auth/me', { credentials: 'include' });
      const authData = await authRes.json();
      if (!authData.authenticated) {
        setAuthNeeded(true);
        setLoading(false);
        return;
      }
      const role = authData.user?.role;
      if (isStaffRole(role) || isVendorRole(role)) {
        router.replace(homePathForRole(role));
        return;
      }
      if (!isCustomerRole(role)) {
        router.replace('/');
        return;
      }
      persistStaffSession(null);
      setUser(authData.user);
      setAuthNeeded(false);

      // Load parallel data without blocking UI
      Promise.all([
        loadMatches(),
        loadBookings(),
        loadPrivacy(),
        loadShortlist(),
        loadProfile(),
        loadBlockedUsers(),
        loadNotifications(),
      ]).catch(err => console.error('Error loading dashboard data:', err));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch {}
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
      const pData = await pRes.json();
      const cData = await cRes.json();
      if (pData.success) setPrivacySettings(pData.data);
      if (cData.success) setConsents(cData.data || []);
    } catch {}
  };

  const loadShortlist = async () => {
    try {
      const res = await fetch('/api/customer/shortlist');
      const data = await res.json();
      if (data.success && Array.isArray(data.shortlists)) {
        setShortlists(data.shortlists);
        setShortlistCount(data.count || data.shortlists.length);
      }
    } catch {}
  };

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/customer/profile');
      const data = await res.json();
      if (data.success && data.data) {
        setCustomerProfile(data.data);
        if (data.data.completion) {
          setProfileCompletion(data.data.completion);
        }
      }
    } catch {}
  };

  const loadBlockedUsers = async () => {
    setBlockedLoading(true);
    try {
      const res = await fetch('/api/customer/blocks');
      const data = await res.json();
      if (data.success && Array.isArray(data.blocks)) {
        setBlockedUsers(data.blocks);
      }
    } catch {} finally {
      setBlockedLoading(false);
    }
  };

  const handleUnblock = async (userId: string, name: string) => {
    try {
      const res = await fetch(`/api/customer/blocks?target_user_id=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Unblocked ${name}. You can now view each other's profiles.`);
        loadBlockedUsers();
        loadMatches();
      } else {
        setError(data.message || 'Failed to unblock member');
      }
    } catch {
      setError('Network error while unblocking member.');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/customer/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason, confirmation: true }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Account successfully deactivated and scheduled for deletion.');
        window.location.href = '/';
      } else {
        setError(data.message || 'Failed to process account deletion request.');
      }
    } catch {
      setError('Network error while processing account deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        const u = data.user || data.data?.user;
        persistStaffSession(u);
        if (isStaffRole(u?.role) || isVendorRole(u?.role)) {
          router.replace(homePathForRole(u?.role));
          return;
        }
        setAuthNeeded(false);
        await loadCustomerData();
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
      if (!data.success) {
        setError(data.message);
        setPayingBookingId(null);
        return;
      }

      const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!loaded) {
        setError('Failed to load Razorpay SDK. Please check your internet connection.');
        setPayingBookingId(null);
        return;
      }

      const options = {
        key: data.data.key_id,
        amount: Math.round(Number(data.data.amount) * 100),
        currency: data.data.currency || 'INR',
        name: 'WedWithMe',
        description: 'Escrow Booking Payment',
        order_id: data.data.order_id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                booking_id: bookingId,
                payment_transaction_id: data.data.payment_transaction_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setSuccessMsg('Payment confirmed! Booking is now guaranteed under WedWithMe Escrow Protection.');
              loadBookings();
            } else {
              setError(verifyData.message || 'Payment verification failed');
            }
          } catch (err: any) {
            setError('Error verifying payment: ' + err.message);
          } finally {
            setPayingBookingId(null);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#e6005c',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError(response.error.description || 'Payment failed');
        setPayingBookingId(null);
      });
      rzp.open();

    } catch (err: any) {
      setError(err.message);
      setPayingBookingId(null);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    try {
      const res = await fetch(`/api/cancellations/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: cancelModalBooking.id, reason: cancelReason }),
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

  if (loading || (user && (isStaffRole(user.role) || isVendorRole(user.role)))) {
    return (
      <div style={{ minHeight: '100vh', background: '#031710', color: '#9cb1a6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Checking your account…
      </div>
    );
  }

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
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: '#031710', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: '600', marginBottom: '6px' }}>PASSWORD</label>
              <input
                type="password"
                placeholder="Enter your password"
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
    { id: 'dashboard', label: 'Dashboard Overview', icon: '✨' },
    { id: 'profile', label: 'My Matrimonial Profile', icon: '👤' },
    { id: 'preferences', label: 'Partner Preferences', icon: '❤️' },
    { id: 'matches', label: 'Matrimonial Matches', icon: '💍', count: matches.length },
    { id: 'interests', label: 'Interests', icon: '💖' },
    { id: 'chat', label: 'Matrimonial Chat', icon: '💬' },
    { id: 'shortlist', label: 'Shortlisted Profiles', icon: '⭐', count: shortlistCount },
    { id: 'search', label: 'Search Profiles', icon: '🔍' },
    { id: 'saved_searches', label: 'Saved Searches', icon: '💾' },
    { id: 'bookings', label: 'My Bookings & Escrow', icon: '🛎️', count: bookings.length },
    { id: 'checklist', label: 'Wedding Checklist', icon: '📋' },
    { id: 'privacy', label: 'Privacy & Security', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', count: unreadCount },
  ];

  return (
    <div className="dashboard-root-layout" style={{ minHeight: '100vh', background: '#06140e', color: '#fff', display: 'flex' }}>
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="dashboard-sidebar" style={{
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
            overflow: 'hidden',
          }}>
            {user?.photo_url ? (
              <img src={user.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || 'U'
            )}
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
        </nav>

        {/* Sidebar Footer with Pink Logout Button */}
        <div style={{ padding: '18px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
              window.location.assign('/');
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
      <div className="dashboard-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Bar */}
        <header className="dashboard-header" style={{
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
              {activeTab === 'dashboard' && '✨ Customer Matrimonial Suite Overview'}
              {activeTab === 'profile' && '👤 My Matrimonial Profile & Personal Bio'}
              {activeTab === 'preferences' && '❤️ Section 6.3 Desired Partner Preferences'}
              {activeTab === 'matches' && '💍 AI-Matched Compatible Profiles'}
              {activeTab === 'shortlist' && '⭐ My Shortlisted Matrimonial Profiles'}
              {activeTab === 'search' && '🔍 Advanced Matrimonial Profile Search'}
              {activeTab === 'saved_searches' && '💾 My Saved Search Configurations'}
              {activeTab === 'bookings' && '🛎️ My Wedding Bookings & Platform Escrow'}
              {activeTab === 'checklist' && '📋 Wedding Planning Milestones'}
              {activeTab === 'privacy' && '🔒 Personal Data Privacy & Security Controls'}
              {activeTab === 'notifications' && '🔔 In-app notifications'}
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
        <main className="dashboard-main" style={{ flex: 1, padding: '32px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
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

          {/* ================= TAB -1: DASHBOARD OVERVIEW ================= */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* 1. Welcome & Profile Completion Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(3,23,16,0.95) 0%, rgba(12,42,30,0.85) 100%)',
                  borderRadius: '20px',
                  border: '1.5px solid rgba(229,193,88,0.3)',
                  padding: '28px 32px',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 2 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: 0 }}>
                        Namaste, {user?.name || 'Valued Customer'} ✨
                      </h2>
                      {user?.status === 'ACTIVE' && (
                        <span style={{ fontSize: '11px', background: 'rgba(56,161,105,0.25)', color: '#9ae6b4', border: '1px solid #38a169', padding: '2px 10px', borderRadius: '9999px', fontWeight: '700' }}>
                          ✓ Active Member
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '13.5px', color: '#9cb1a6', margin: '6px 0 0 0' }}>
                      WedWithMe Private Matrimonial Suite • Verified Profiles, Real-Time AI Compatibility & Escrow Protection.
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('profile')}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #e5c158 0%, #c49f33 100%)',
                      color: '#031710',
                      fontWeight: '800',
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(229,193,88,0.3)',
                    }}
                  >
                    Edit Matrimonial Profile →
                  </button>
                </div>

                {/* Profile Completion Bar */}
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fae8a4' }}>
                      Matrimonial Profile Strength & Completion
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: '900', color: '#e5c158' }}>
                      {profileCompletion.percentage || 0}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${profileCompletion.percentage || 0}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #ff2a73 0%, #e5c158 100%)',
                        borderRadius: '9999px',
                        transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </div>

                  {/* Missing Fields Prompt */}
                  {profileCompletion.missingFields && profileCompletion.missingFields.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#9cb1a6' }}>Next to complete:</span>
                      {profileCompletion.missingFields.slice(0, 4).map((f: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveTab('profile')}
                          style={{
                            background: 'rgba(229,193,88,0.1)',
                            border: '1px solid rgba(229,193,88,0.3)',
                            color: '#fae8a4',
                            borderRadius: '9999px',
                            padding: '3px 10px',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            fontWeight: '600',
                          }}
                        >
                          + {f.label} (+{f.points}%)
                        </button>
                      ))}
                      {profileCompletion.missingFields.length > 4 && (
                        <span style={{ fontSize: '11.5px', color: '#718096' }}>
                          +{profileCompletion.missingFields.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Key Metrics Grid (4 Quick Cards) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div
                  onClick={() => setActiveTab('matches')}
                  style={{
                    background: '#031710',
                    border: '1px solid rgba(229,193,88,0.22)',
                    borderRadius: '16px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>💍</span>
                    <span style={{ fontSize: '11px', background: 'rgba(255,42,115,0.2)', color: '#ff8099', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>Active</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>{matches.length}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fae8a4', marginTop: '2px' }}>Compatible Matches</div>
                  <div style={{ fontSize: '11.5px', color: '#9cb1a6', marginTop: '4px' }}>AI-scored based on preferences →</div>
                </div>

                <div
                  onClick={() => setActiveTab('shortlist')}
                  style={{
                    background: '#031710',
                    border: '1px solid rgba(229,193,88,0.22)',
                    borderRadius: '16px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>⭐</span>
                    <span style={{ fontSize: '11px', background: 'rgba(229,193,88,0.2)', color: '#fae8a4', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>Saved</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>{shortlistCount}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fae8a4', marginTop: '2px' }}>Shortlisted Profiles</div>
                  <div style={{ fontSize: '11.5px', color: '#9cb1a6', marginTop: '4px' }}>Members you saved for review →</div>
                </div>

                <div
                  onClick={() => setActiveTab('bookings')}
                  style={{
                    background: '#031710',
                    border: '1px solid rgba(229,193,88,0.22)',
                    borderRadius: '16px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>🛎️</span>
                    <span style={{ fontSize: '11px', background: 'rgba(56,161,105,0.2)', color: '#9ae6b4', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>Escrow</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>{bookings.length}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fae8a4', marginTop: '2px' }}>Wedding Bookings</div>
                  <div style={{ fontSize: '11.5px', color: '#9cb1a6', marginTop: '4px' }}>100% advance protection →</div>
                </div>

                <div
                  onClick={() => setActiveTab('preferences')}
                  style={{
                    background: '#031710',
                    border: '1px solid rgba(229,193,88,0.22)',
                    borderRadius: '16px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>🎯</span>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#cbd5e0', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>Weights</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#e5c158', marginTop: '6px' }}>Configured</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fae8a4', marginTop: '6px' }}>Partner Preferences</div>
                  <div style={{ fontSize: '11.5px', color: '#9cb1a6', marginTop: '4px' }}>Update criteria & priorities →</div>
                </div>
              </div>

              {/* 3. Recommended Matches Strip */}
              <div style={{ background: '#031710', borderRadius: '18px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>💫</span>
                      <span>Top Matrimonial Recommendations</span>
                    </h3>
                    <p style={{ fontSize: '12.5px', color: '#9cb1a6', margin: '4px 0 0 0' }}>
                      Approved members with high compatibility scores matching your verified criteria
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('matches')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#e5c158',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    View All ({matches.length}) →
                  </button>
                </div>

                {matches.length === 0 ? (
                  <div style={{ padding: '36px 16px', textAlign: 'center', background: '#061a12', borderRadius: '12px', border: '1px dashed rgba(229,193,88,0.25)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Discovering Matches for You</div>
                    <p style={{ fontSize: '13px', color: '#9cb1a6', maxWidth: '460px', margin: '6px auto 16px auto' }}>
                      Set your desired partner age, community, education, and location preferences to generate real-time AI matches.
                    </p>
                    <button
                      onClick={() => setActiveTab('preferences')}
                      style={{
                        padding: '9px 20px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '13px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Configure Partner Preferences
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                    {matches.slice(0, 4).map((m: any) => (
                      <div
                        key={m.id}
                        style={{
                          background: '#062016',
                          borderRadius: '14px',
                          border: '1px solid rgba(229,193,88,0.2)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{ position: 'relative', height: '170px', background: '#031710' }}>
                          {m.is_photo_hidden || !m.photo_url ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', color: '#e5c158' }}>
                              🛡️
                            </div>
                          ) : (
                            <img src={m.photo_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                          <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(3,23,16,0.85)', backdropFilter: 'blur(4px)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', color: '#e5c158', border: '1px solid rgba(229,193,88,0.3)' }}>
                            {m.match_score || '90%'} Match
                          </div>
                        </div>

                        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff' }}>{m.name}</div>
                            <div style={{ fontSize: '12px', color: '#e5c158', fontWeight: '600', marginTop: '2px' }}>
                              {m.age} yrs • {m.is_location_hidden ? 'Location Protected' : m.city || 'India'}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#9cb1a6', marginTop: '4px' }}>
                              {m.profession || m.education || 'Professional'}
                            </div>
                          </div>

                          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <button
                              onClick={() => setActiveTab('matches')}
                              style={{
                                width: '100%',
                                padding: '8px',
                                background: 'rgba(229,193,88,0.12)',
                                border: '1px solid #e5c158',
                                color: '#e5c158',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                              }}
                            >
                              View in Matches →
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Recent Shortlisted Profiles Strip */}
              <div style={{ background: '#031710', borderRadius: '18px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⭐</span>
                      <span>Recently Shortlisted Members</span>
                    </h3>
                    <p style={{ fontSize: '12.5px', color: '#9cb1a6', margin: '4px 0 0 0' }}>
                      Profiles you marked for review and future discussions
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('shortlist')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#e5c158',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Open Shortlist ({shortlistCount}) →
                  </button>
                </div>

                {shortlists.length === 0 ? (
                  <div style={{ padding: '30px 16px', textAlign: 'center', background: '#061a12', borderRadius: '12px', border: '1px dashed rgba(255,42,115,0.25)' }}>
                    <div style={{ fontSize: '30px', marginBottom: '8px' }}>❤️</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Your Shortlist is Empty</div>
                    <p style={{ fontSize: '12.5px', color: '#9cb1a6', maxWidth: '420px', margin: '4px auto 14px auto' }}>
                      Tap the heart icon on any profile card in Matches or Search to save members to your shortlist.
                    </p>
                    <button
                      onClick={() => setActiveTab('search')}
                      style={{
                        padding: '8px 18px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                      }}
                    >
                      🔍 Search Matrimonial Profiles
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                    {shortlists.slice(0, 4).map((p: any) => (
                      <div
                        key={p.id}
                        onClick={() => setActiveTab('shortlist')}
                        style={{
                          background: '#062016',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,42,115,0.3)',
                          padding: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #e5c158', background: '#031710', flexShrink: 0 }}>
                          {p.is_photo_hidden || !p.photo_url ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#e5c158' }}>
                              🛡️
                            </div>
                          ) : (
                            <img src={p.photo_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#fae8a4' }}>
                            {p.age} yrs • {p.city || 'India'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9cb1a6', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {p.profession || p.education}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Sagun AI Concierge Entry Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #091a13 0%, #04120c 100%)',
                  borderRadius: '18px',
                  border: '1.5px solid rgba(229,193,88,0.4)',
                  padding: '24px 28px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '20px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ maxWidth: '600px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px' }}>🤖</span>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#e5c158', letterSpacing: '0.3px' }}>
                      Sagun AI Concierge
                    </span>
                    <span style={{ fontSize: '10px', background: 'rgba(229,193,88,0.15)', color: '#fae8a4', border: '1px solid rgba(229,193,88,0.3)', padding: '2px 8px', borderRadius: '9999px', fontWeight: '700' }}>
                      Intelligent Assistant
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#cbd5e0', lineHeight: 1.5, margin: 0 }}>
                    Need guidance? Sagun AI analyzes compatibility vectors across community, education, horoscope, and lifestyle preferences, or connects you with vetted wedding vendors.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => setActiveTab('matches')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#cbd5e0',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                      }}
                    >
                      "Analyze my top match compatibility"
                    </button>
                    <button
                      onClick={() => setActiveTab('preferences')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#cbd5e0',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                      }}
                    >
                      "Tune my partner preference weights"
                    </button>
                    <Link
                      href="/vendors"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#cbd5e0',
                        fontSize: '11.5px',
                        textDecoration: 'none',
                      }}
                    >
                      "Find top-rated photographers"
                    </Link>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('matches')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                    color: '#fff',
                    fontWeight: '800',
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(230,0,92,0.4)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Consult AI Engine ✨
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 0: PROFILE ================= */}
          {activeTab === 'profile' && (
            <CustomerProfileEditor
              user={user}
              onProfileUpdated={(updated) => {
                if (updated) {
                  setUser((prev: any) => ({
                    ...prev,
                    name: updated.name || prev?.name,
                    photo_url: updated.photo_url !== undefined ? updated.photo_url : prev?.photo_url,
                  }));
                }
              }}
            />
          )}

          {/* ================= TAB 0.5: PARTNER PREFERENCES ================= */}
          {activeTab === 'preferences' && (
            <PartnerPreferencesEditor
              user={user}
              onSaved={() => {
                setSuccessMsg('Partner preferences saved! Matrimonial compatibility scores will now reflect your criteria.');
              }}
            />
          )}

          {/* ================= TAB 1: MATCHES ================= */}
          {activeTab === 'matches' && (
            <CustomerMatchesSection
              onNavigateToPreferences={() => setActiveTab('preferences')}
            />
          )}

          {activeTab === 'interests' && (
            <CustomerInterestsSection
              onOpenChat={(peerUserId) => {
                setChatPeerUserId(peerUserId);
                setActiveTab('chat');
              }}
            />
          )}

          {activeTab === 'chat' && (
            <CustomerMatrimonialChat currentUserId={user?.id} initialPeerUserId={chatPeerUserId} />
          )}

          {/* ================= TAB 1.1: SHORTLISTED PROFILES ================= */}
          {activeTab === 'shortlist' && (
            <CustomerShortlistSection
              onNavigateToSearch={() => setActiveTab('search')}
              onNavigateToMatches={() => setActiveTab('matches')}
            />
          )}

          {/* ================= TAB 1.2: SEARCH PROFILES ================= */}
          {activeTab === 'search' && (
            <CustomerSearchSection initialSubTab="search" />
          )}

          {/* ================= TAB 1.4: SAVED SEARCHES ================= */}
          {activeTab === 'saved_searches' && (
            <CustomerSearchSection initialSubTab="saved" />
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
                    <div style={{ fontSize: '12px', color: '#ff6b9d', fontWeight: 'bold', marginBottom: '4px' }}>PERMANENT ACCOUNT DELETION</div>
                    <p style={{ fontSize: '11px', color: '#9cb1a6', marginBottom: '10px' }}>
                      Request permanent deletion of your matrimonial profile and anonymization of personal records.
                    </p>
                    <button
                      type="button"
                      onClick={() => setDeleteModalOpen(true)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: 'rgba(230,0,92,0.12)',
                        border: '1px solid rgba(255,42,115,0.5)',
                        color: '#ff8099',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        fontWeight: '700',
                      }}
                    >
                      🗑️ Request Account Deletion
                    </button>
                  </div>
                </div>
              </div>

              {/* Blocked Members Management Card */}
              <div style={{ background: '#031710', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🚫</span>
                      <span>Blocked Members & Mutual Exclusion</span>
                    </h3>
                    <p style={{ fontSize: '12.5px', color: '#9cb1a6', margin: '4px 0 0 0' }}>
                      Members you block cannot view your profile, send interests, or appear in your search results and matches.
                    </p>
                  </div>
                  <span style={{ fontSize: '12px', background: 'rgba(255,42,115,0.15)', color: '#ff8099', border: '1px solid rgba(255,42,115,0.3)', padding: '3px 10px', borderRadius: '9999px', fontWeight: '700' }}>
                    {blockedUsers.length} Blocked
                  </span>
                </div>

                {blockedLoading ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#9cb1a6', fontSize: '13px' }}>
                    Loading blocked members...
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', background: '#061a12', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '26px', marginBottom: '6px' }}>🛡️</div>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#fff' }}>No Blocked Members</div>
                    <p style={{ fontSize: '12px', color: '#9cb1a6', margin: '4px 0 0 0' }}>
                      You have not blocked any members. You can block any profile at any time from their profile details.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {blockedUsers.map((b) => (
                      <div
                        key={b.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: '#062016',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                            {b.name || 'Member'}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#9cb1a6', marginTop: '2px' }}>
                            Reason: {b.reason || 'Not specified'} • Blocked on {new Date(b.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUnblock(b.blocked_user_id, b.name || 'Member')}
                          style={{
                            padding: '6px 14px',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#cbd5e0',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Unblock Member
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Account Deletion Request Confirmation Modal */}
              {deleteModalOpen && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    zIndex: 100000,
                  }}
                  onClick={() => setDeleteModalOpen(false)}
                >
                  <div
                    style={{
                      background: '#0a1611',
                      border: '1.5px solid rgba(255,42,115,0.7)',
                      borderRadius: '16px',
                      maxWidth: '480px',
                      width: '100%',
                      padding: '28px',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
                      Request Account Deletion & Anonymization
                    </h3>
                    <p style={{ fontSize: '13px', color: '#cbd5e0', lineHeight: 1.5, marginBottom: '14px' }}>
                      Submitting this request will perform the following immediate actions:
                    </p>
                    <ul style={{ fontSize: '12px', color: '#9cb1a6', paddingLeft: '20px', margin: '0 0 16px 0', lineHeight: 1.6 }}>
                      <li>Your matrimonial profile visibility will immediately switch to <strong>Private</strong>.</li>
                      <li>Your account status will be changed to <strong>Suspended</strong>.</li>
                      <li>Your profile will be removed from all search queries, matches, and recommendations.</li>
                      <li>Your active login session will be invalidated immediately.</li>
                    </ul>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 700, marginBottom: '6px' }}>
                        REASON FOR DELETION (OPTIONAL)
                      </label>
                      <textarea
                        rows={3}
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="Found my match / No longer seeking / Privacy concerns..."
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: '#031710',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setDeleteModalOpen(false)}
                        style={{
                          padding: '10px 18px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '8px',
                          color: '#cbd5e0',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading}
                        style={{
                          padding: '10px 20px',
                          background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        {deleteLoading ? 'Processing...' : 'Confirm Account Deletion'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

          {activeTab === 'notifications' && (
            <div style={{ background: 'rgba(3,23,16,0.6)', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 style={{ margin: 0 }}>Notifications</h2>
                <button
                  onClick={async () => {
                    await fetch('/api/notifications', { method: 'PUT' });
                    loadNotifications();
                  }}
                  style={{ background: 'transparent', color: '#e5c158', border: '1px solid #e5c158', borderRadius: '8px', padding: '6px 10px' }}
                >
                  Mark all read
                </button>
              </div>
              {notifications.length === 0 && <p style={{ color: '#9cb1a6' }}>No notifications yet.</p>}
              {notifications.map((n: any) => (
                <div key={n.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '10px 0' }}>
                  <div style={{ fontWeight: 700 }}>{n.title}</div>
                  <div style={{ color: '#9cb1a6', fontSize: '13px' }}>{n.message}</div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        .dashboard-root-layout {
          overflow-x: clip;
          max-width: 100vw;
          width: 100%;
        }

        @media (max-width: 768px) {
          .dashboard-root-layout {
            flex-direction: column !important;
          }
          .dashboard-sidebar {
            width: 100% !important;
            height: auto !important;
            position: relative !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(229, 193, 88, 0.2) !important;
          }
          .dashboard-sidebar nav {
            flex-direction: row !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding: 10px !important;
            gap: 8px !important;
          }
          .dashboard-sidebar nav button,
          .dashboard-sidebar nav a {
            white-space: nowrap !important;
            padding: 8px 12px !important;
            font-size: 12px !important;
            flex-shrink: 0 !important;
          }
          .dashboard-header {
            padding: 14px 16px !important;
            height: auto !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .dashboard-header h1 {
            font-size: 16px !important;
          }
          .dashboard-main {
            padding: 16px !important;
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: clip !important;
          }
          .dashboard-main div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
