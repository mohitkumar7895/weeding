'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function VendorDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'onboarding' | 'packages' | 'calendar' | 'bookings' | 'portfolio'>('overview');
  const [vendorData, setVendorData] = useState<any>(null);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [email, setEmail] = useState('vendor.venue@wedwithme.com');
  const [password, setPassword] = useState('Admin@123456');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forms states
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgPrice, setNewPkgPrice] = useState('');
  const [newPkgDesc, setNewPkgDesc] = useState('');
  const [newPkgCapacity, setNewPkgCapacity] = useState('250');
  const [newPkgInclusions, setNewPkgInclusions] = useState('Decoration, Sound System, Catering Support');

  const [newSrvTitle, setNewSrvTitle] = useState('');
  const [newSrvPrice, setNewSrvPrice] = useState('');
  const [newSrvDesc, setNewSrvDesc] = useState('');

  const [docType, setDocType] = useState('PAN');
  const [docNumber, setDocNumber] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');

  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('Reserved for private event');

  const [reelTitle, setReelTitle] = useState('');
  const [reelVideoUrl, setReelVideoUrl] = useState('');
  const [reelThumbUrl, setReelThumbUrl] = useState('');

  useEffect(() => {
    fetchVendorProfile();
  }, []);

  const fetchVendorProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authData.authenticated || authData.user?.role !== 'VENDOR') {
        setAuthNeeded(true);
        setLoading(false);
        return;
      }

      setAuthNeeded(false);

      // Load parallel vendor data
      await Promise.all([
        loadVendorOverview(),
        loadOnboardingAndDocs(),
        loadPackagesAndServices(),
        loadBookings(),
        loadAvailability(),
        loadPortfoliosAndReels(),
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadVendorOverview = async () => {
    try {
      const eRes = await fetch('/api/vendor/earnings');
      const eData = await eRes.json();
      if (eData.success) {
        setEarnings(eData.data);
      }
    } catch {}
  };

  const loadOnboardingAndDocs = async () => {
    try {
      const res = await fetch('/api/vendor/onboarding');
      const data = await res.json();
      if (data.success) {
        setVendorData(data.data.vendor);
        setOnboardingData(data.data.onboarding);
        setDocuments(data.data.documents || []);
      }
    } catch {}
  };

  const loadPackagesAndServices = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/vendor/packages'),
        fetch('/api/vendor/services'),
      ]);
      const [pData, sData] = await pRes.json();
      if (pData.success) setPackages(pData.data);
      if (sData.success) setServices(sData.data);
    } catch {}
  };

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.success) setBookings(data.data);
    } catch {}
  };

  const loadAvailability = async () => {
    try {
      const res = await fetch('/api/vendor/availability');
      const data = await res.json();
      if (data.success) setAvailability(data.data);
    } catch {}
  };

  const loadPortfoliosAndReels = async () => {
    try {
      const [pfRes, rlRes] = await Promise.all([
        fetch('/api/vendor/portfolio'),
        fetch('/api/vendor/reels'),
      ]);
      const [pfData, rlData] = await pfRes.json();
      if (pfData.success) setPortfolios(pfData.data);
      if (rlData.success) setReels(rlData.data);
    } catch {}
  };

  const handleVendorLogin = async (e: React.FormEvent) => {
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
        fetchVendorProfile();
      } else {
        setError(data.message || 'Vendor login failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Booking successfully updated to ${status}`);
        loadBookings();
        loadVendorOverview();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgName || !newPkgPrice) return;
    try {
      const res = await fetch('/api/vendor/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPkgName,
          price: parseFloat(newPkgPrice),
          description: newPkgDesc,
          guest_capacity: parseInt(newPkgCapacity, 10),
          included_items: newPkgInclusions.split(',').map((s) => s.trim()),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Package created and submitted for admin review!');
        setNewPkgName('');
        setNewPkgPrice('');
        setNewPkgDesc('');
        loadPackagesAndServices();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to remove this package?')) return;
    try {
      const res = await fetch(`/api/vendor/packages?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Package deleted successfully');
        loadPackagesAndServices();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSrvTitle || !newSrvPrice) return;
    try {
      const res = await fetch('/api/vendor/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSrvTitle,
          starting_price: parseFloat(newSrvPrice),
          description: newSrvDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Service submitted for review!');
        setNewSrvTitle('');
        setNewSrvPrice('');
        setNewSrvDesc('');
        loadPackagesAndServices();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFileUrl) return;
    try {
      const res = await fetch('/api/vendor/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: docType,
          document_number: docNumber,
          file_url: docFileUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Document (${docType}) uploaded for compliance verification.`);
        setDocNumber('');
        setDocFileUrl('');
        loadOnboardingAndDocs();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmitOnboarding = async () => {
    try {
      const res = await fetch('/api/vendor/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submit_for_review: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Onboarding dossier submitted for compliance review! Verified badge will activate upon approval.');
        loadOnboardingAndDocs();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate) return;
    try {
      const res = await fetch('/api/vendor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: blockDate,
          is_booked: true,
          notes: blockReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Date ${blockDate} marked as unavailable`);
        setBlockDate('');
        loadAvailability();
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUploadReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelTitle || !reelVideoUrl) return;
    try {
      const res = await fetch('/api/vendor/reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reelTitle,
          video_url: reelVideoUrl,
          thumbnail_url: reelThumbUrl || '/images/photographer.jpg',
          description: 'Verified wedding highlight showcase',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Reel uploaded and submitted for review!');
        setReelTitle('');
        setReelVideoUrl('');
        loadPortfoliosAndReels();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (authNeeded) {
    return (
      <div style={{ minHeight: '100vh', background: '#03140e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: 'linear-gradient(180deg, #062a1c 0%, #031710 100%)', border: '1.5px solid rgba(229,193,88,0.35)', borderRadius: '24px', padding: '36px', boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 30px rgba(255,42,115,0.15)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <svg width="48" height="34" viewBox="0 0 54 40" fill="none">
                <defs>
                  <linearGradient id="vendorPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff2a73" />
                    <stop offset="100%" stopColor="#e6005c" />
                  </linearGradient>
                  <linearGradient id="vendorHeartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff528c" />
                    <stop offset="100%" stopColor="#d8004f" />
                  </linearGradient>
                </defs>
                <path d="M4 10L11 32L17 14L22 30L26 12" stroke="url(#vendorPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z" fill="url(#vendorHeartGrad)" />
                <path d="M28 12L32 30L37 14L43 32L50 10" stroke="url(#vendorPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ color: '#e5c158', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>WedWithMe</span>
            <h2 style={{ fontSize: '20px', marginTop: '8px', color: '#fff' }}>Vendor Partner Suite</h2>
            <p style={{ fontSize: '13px', color: '#9cb1a6' }}>Log in to manage bookings, packages, calendar availability, and payouts</p>
          </div>
          {error && <div style={{ background: 'rgba(230,0,92,0.15)', border: '1px solid #e6005c', color: '#ffb3c6', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
          <form onSubmit={handleVendorLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', marginBottom: '6px' }}>VENDOR ACCOUNT EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', marginBottom: '6px' }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
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
              {loading ? 'Authenticating...' : 'Sign In to Vendor Suite'}
            </button>
          </form>
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#a0aec0' }}>
            New wedding service provider? <Link href="/register" style={{ color: '#ff6b9d', fontWeight: 'bold' }}>Register as Vendor Partner</Link>
          </div>
        </div>
      </div>
    );
  }

  const onboardingStatus = onboardingData?.status || 'DRAFT';
  const isApproved = onboardingStatus === 'APPROVED';

  return (
    <div style={{ minHeight: '100vh', background: '#06140e', color: '#fff', display: 'flex' }}>
      {/* Left Sidebar Navigation */}
      <aside
        style={{
          width: '280px',
          flexShrink: 0,
          background: '#031710',
          borderRight: '1px solid rgba(229,193,88,0.2)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          padding: '24px 16px',
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <div style={{ paddingBottom: '18px', borderBottom: '1px solid rgba(229,193,88,0.15)', marginBottom: '18px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="30" height="22" viewBox="0 0 54 40" fill="none">
              <path d="M4 10L11 32L17 14L22 30L26 12" stroke="url(#vendorPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z" fill="url(#vendorHeartGrad)" />
              <path d="M28 12L32 30L37 14L43 32L50 10" stroke="url(#vendorPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#e5c158', letterSpacing: '-0.5px' }}>WedWithMe</span>
          </Link>
          <div style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', background: 'rgba(229,193,88,0.12)', color: '#e5c158', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(229,193,88,0.25)', fontWeight: 600 }}>
            Vendor Partner Suite
          </div>
        </div>

        {/* Vendor Profile Card */}
        <div style={{ background: '#072218', border: '1px solid rgba(229,193,88,0.18)', borderRadius: '12px', padding: '14px', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #ff2a73, #e6005c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', color: '#fff', boxShadow: '0 3px 10px rgba(230,0,92,0.35)' }}>
              {vendorData?.business_name ? vendorData.business_name.charAt(0).toUpperCase() : 'V'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {vendorData?.business_name || 'Vendor Partner'}
              </div>
              <div style={{ fontSize: '11px', color: '#a0aec0' }}>
                {vendorData?.city || 'India'} • ★ {vendorData?.rating || '4.9'}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 'bold',
              background: isApproved ? 'rgba(56,161,105,0.2)' : 'rgba(237,137,54,0.2)',
              color: isApproved ? '#48bb78' : '#ed8936',
              border: `1px solid ${isApproved ? '#48bb78' : '#ed8936'}`,
            }}>
              KYC: {onboardingStatus}
            </span>
            <span style={{ fontSize: '11px', color: '#e5c158' }}>
              {packages.length} Packages
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#e5c158', letterSpacing: '0.8px', padding: '0 8px', marginBottom: '4px' }}>
            VENDOR NAVIGATION
          </div>
          {[
            { id: 'overview', label: 'Earnings & Overview', icon: '📊' },
            { id: 'onboarding', label: 'Onboarding & KYC', icon: '🛡️', badge: onboardingStatus !== 'APPROVED' ? 'ACTION' : 'DONE' },
            { id: 'packages', label: 'Packages & Services', icon: '📦', count: packages.length },
            { id: 'calendar', label: 'Availability Calendar', icon: '📅' },
            { id: 'bookings', label: 'Bookings & Leads', icon: '🛎️', count: bookings.length },
            { id: 'portfolio', label: 'Portfolio & Reels', icon: '📸', count: reels.length },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : '#cbd5e0',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: isActive ? '0 4px 14px rgba(230, 0, 92, 0.38)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '15px' }}>{item.icon}</span>
                  {item.label}
                </span>
                {item.count !== undefined && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(229,193,88,0.15)',
                    color: isActive ? '#fff' : '#e5c158',
                    fontWeight: 700,
                  }}>
                    {item.count}
                  </span>
                )}
                {item.badge && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isActive ? 'rgba(255,255,255,0.25)' : item.badge === 'ACTION' ? 'rgba(237,137,54,0.25)' : 'rgba(56,161,105,0.25)',
                    color: isActive ? '#fff' : item.badge === 'ACTION' ? '#ed8936' : '#48bb78',
                    fontWeight: 700,
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div style={{ height: '1px', background: 'rgba(229,193,88,0.15)', margin: '14px 0' }} />

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#e5c158', letterSpacing: '0.8px', padding: '0 8px', marginBottom: '4px' }}>
            QUICK LINKS
          </div>
          <Link href="/vendors" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', color: '#cbd5e0', fontSize: '13px', textDecoration: 'none' }}>
            <span>🛍️</span> Public Marketplace
          </Link>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', color: '#cbd5e0', fontSize: '13px', textDecoration: 'none' }}>
            <span>👥</span> Customer Suite
          </Link>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', color: '#cbd5e0', fontSize: '13px', textDecoration: 'none' }}>
            <span>🛡️</span> Admin Console
          </Link>
        </div>

        {/* Bottom Sign Out Button */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(229,193,88,0.15)' }}>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              setAuthNeeded(true);
            }}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '70px',
            background: '#031710',
            borderBottom: '1px solid rgba(229,193,88,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 5,
          }}
        >
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
              {activeTab === 'overview' && 'Earnings & Financial Performance'}
              {activeTab === 'onboarding' && 'KYC Verification & Compliance Dossier'}
              {activeTab === 'packages' && 'Wedding Packages & Service Catalog'}
              {activeTab === 'calendar' && 'Availability & Slot Management'}
              {activeTab === 'bookings' && 'Client Inquiries & Order Fulfillment'}
              {activeTab === 'portfolio' && 'High-Definition Portfolio & Reels'}
            </div>
            <div style={{ fontSize: '12px', color: '#a0aec0' }}>
              Partner: {vendorData?.business_name || 'Vendor Partner'} • Status: {onboardingStatus}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link
              href="/vendors"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
              }}
            >
              View Live Storefront ↗
            </Link>
          </div>
        </header>

        {/* Main Vendor Content */}
        <main style={{ flex: 1, padding: '32px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
          {error && (
            <div style={{ background: 'rgba(230,0,92,0.15)', border: '1px solid #e6005c', color: '#ffb3c6', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
              ⚠️ {error}
            </div>
          )}
          {successMsg && (
            <div style={{ background: 'rgba(56,161,105,0.15)', border: '1px solid #38a169', color: '#9ae6b4', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
              ✓ {successMsg}
            </div>
          )}

          {/* ================= TAB 1: OVERVIEW & EARNINGS ================= */}
          {activeTab === 'overview' && (
            <div>
              {/* Vendor Header Card */}
              <div style={{ background: '#061d15', border: '1px solid rgba(229,193,88,0.25)', borderRadius: '16px', padding: '24px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#fff' }}>{vendorData?.business_name || 'Vendor Partner'}</h1>
                    <span style={{ background: 'rgba(56,161,105,0.2)', color: '#48bb78', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #48bb78' }}>
                      ✓ {vendorData?.verification_status || 'VERIFIED'}
                    </span>
                  </div>
                  <p style={{ color: '#a0aec0', fontSize: '14px', marginTop: '6px' }}>
                    {vendorData?.city} • Starting from ₹{parseFloat(vendorData?.starting_price || 15000).toLocaleString('en-IN')}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e5c158' }}>★ {vendorData?.rating || '4.9'}</div>
                  <div style={{ fontSize: '12px', color: '#a0aec0' }}>{vendorData?.review_count || 0} verified customer reviews</div>
                </div>
              </div>

              {/* Financial KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: '#072218', padding: '20px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <div style={{ fontSize: '13px', color: '#a0aec0' }}>Gross Bookings Volume</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#fff', marginTop: '6px' }}>
                    ₹{parseFloat(earnings?.gross_revenue || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Total client order value</div>
                </div>

                <div style={{ background: '#072218', padding: '20px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <div style={{ fontSize: '13px', color: '#a0aec0' }}>Platform Commission (10%)</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#ed8936', marginTop: '6px' }}>
                    ₹{parseFloat(earnings?.total_commission || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Calculated by Commission Engine</div>
                </div>

                <div style={{ background: '#072218', padding: '20px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <div style={{ fontSize: '13px', color: '#a0aec0' }}>Net Vendor Payable</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#38a169', marginTop: '6px' }}>
                    ₹{parseFloat(earnings?.net_vendor_earnings || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#48bb78', marginTop: '4px' }}>Net of platform commission</div>
                </div>

                <div style={{ background: '#072218', padding: '20px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <div style={{ fontSize: '13px', color: '#a0aec0' }}>Paid Out Settlements</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#e5c158', marginTop: '6px' }}>
                    ₹{parseFloat(earnings?.paid_payouts || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Pending: ₹{parseFloat(earnings?.pending_payouts || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Payout Settlements Ledger */}
              <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Settlement & Payout History</h2>
                {earnings?.recent_payouts?.length === 0 ? (
                  <p style={{ color: '#a0aec0', fontSize: '14px' }}>No completed settlements yet. Payouts trigger automatically upon event completion.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#0a271c', color: '#e5c158', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Payout Ref</th>
                        <th style={{ padding: '12px' }}>Booking #</th>
                        <th style={{ padding: '12px' }}>Net Amount</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px' }}>Generated Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings?.recent_payouts?.map((p: any) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px', color: '#e5c158' }}>{p.reference_id}</td>
                          <td style={{ padding: '12px' }}>{p.booking_number}</td>
                          <td style={{ padding: '12px', color: '#48bb78', fontWeight: 'bold' }}>₹{parseFloat(p.amount).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                              background: p.status === 'PAID' ? 'rgba(56,161,105,0.2)' : 'rgba(237,137,54,0.2)',
                              color: p.status === 'PAID' ? '#48bb78' : '#ed8936'
                            }}>{p.status}</span>
                          </td>
                          <td style={{ padding: '12px', color: '#a0aec0' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: ONBOARDING & KYC ================= */}
          {activeTab === 'onboarding' && (
            <div>
              <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.25)', padding: '24px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e5c158' }}>KYC Onboarding & Verification Dossier</h2>
                    <p style={{ fontSize: '13px', color: '#a0aec0', marginTop: '4px' }}>
                      Current Status: <strong style={{ color: isApproved ? '#48bb78' : '#ed8936' }}>{onboardingStatus}</strong>
                    </p>
                  </div>
                  {onboardingStatus !== 'APPROVED' && (
                    <button
                      onClick={handleSubmitOnboarding}
                      style={{
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        padding: '11px 22px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      }}
                    >
                      Submit for Compliance Review
                    </button>
                  )}
                </div>
              </div>

              {/* KYC Upload Form */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div style={{ background: '#072218', padding: '24px', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Upload KYC Document</h3>
                  <form onSubmit={handleUploadDocument}>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>DOCUMENT TYPE</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      >
                        <option value="PAN">PAN Card (Income Tax)</option>
                        <option value="GST">GST Registration Certificate</option>
                        <option value="BUSINESS_REG">Business Registration / MSME / Shop Act</option>
                        <option value="BANK_PASSBOOK">Bank Passbook / Cancelled Cheque</option>
                        <option value="ID_PROOF">Aadhaar / Voter ID</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>DOCUMENT NUMBER</label>
                      <input
                        type="text"
                        placeholder="e.g. ABCDE1234F"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>FILE STORAGE URL / PATH</label>
                      <input
                        type="text"
                        placeholder="https://storage.wedwithme.com/docs/pan_sample.pdf"
                        value={docFileUrl}
                        onChange={(e) => setDocFileUrl(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                      <span style={{ fontSize: '11px', color: '#a0aec0' }}>10MB limit enforced. Storage keys abstracted from database.</span>
                    </div>
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '11px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      }}
                    >
                      Upload Document for KYC
                    </button>
                  </form>
                </div>

                {/* Uploaded Documents List */}
                <div style={{ background: '#072218', padding: '24px', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Compliance Status Ledger</h3>
                  {documents.length === 0 ? (
                    <p style={{ color: '#a0aec0', fontSize: '13px' }}>No documents uploaded yet. Upload your PAN and Bank Passbook to activate verified payouts.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {documents.map((d: any) => (
                        <div key={d.id} style={{ background: '#0a271c', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#fff' }}>{d.doc_type}</div>
                            <div style={{ fontSize: '12px', color: '#a0aec0' }}>{d.document_number || 'N/A'} • {new Date(d.created_at).toLocaleDateString()}</div>
                          </div>
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
                            background: d.verification_status === 'VERIFIED' ? 'rgba(56,161,105,0.2)' : d.verification_status === 'REJECTED' ? 'rgba(230,0,92,0.2)' : 'rgba(237,137,54,0.2)',
                            color: d.verification_status === 'VERIFIED' ? '#48bb78' : d.verification_status === 'REJECTED' ? '#ff6b9d' : '#ed8936',
                          }}>
                            {d.verification_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: PACKAGES & SERVICES ================= */}
          {activeTab === 'packages' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                {/* Create Package Form */}
                <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Create Wedding Package</h3>
                  <form onSubmit={handleCreatePackage}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>PACKAGE NAME</label>
                      <input
                        type="text"
                        placeholder="e.g. Royal Imperial Package"
                        value={newPkgName}
                        onChange={(e) => setNewPkgName(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>PRICE (₹)</label>
                        <input
                          type="number"
                          placeholder="75000"
                          value={newPkgPrice}
                          onChange={(e) => setNewPkgPrice(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>GUEST CAPACITY</label>
                        <input
                          type="number"
                          value={newPkgCapacity}
                          onChange={(e) => setNewPkgCapacity(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>DESCRIPTION</label>
                      <textarea
                        rows={2}
                        placeholder="Describe what makes this package special..."
                        value={newPkgDesc}
                        onChange={(e) => setNewPkgDesc(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>INCLUSIONS (Comma separated)</label>
                      <input
                        type="text"
                        value={newPkgInclusions}
                        onChange={(e) => setNewPkgInclusions(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '11px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      }}
                    >
                      Save & Submit Package
                    </button>
                  </form>
                </div>

                {/* Create Service Form */}
                <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Add Standalone Service</h3>
                  <form onSubmit={handleCreateService}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>SERVICE TITLE</label>
                      <input
                        type="text"
                        placeholder="e.g. Drone Cinematography / Bridal Makeup"
                        value={newSrvTitle}
                        onChange={(e) => setNewSrvTitle(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>STARTING PRICE (₹)</label>
                      <input
                        type="number"
                        placeholder="15000"
                        value={newSrvPrice}
                        onChange={(e) => setNewSrvPrice(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>DESCRIPTION</label>
                      <textarea
                        rows={3}
                        value={newSrvDesc}
                        onChange={(e) => setNewSrvDesc(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '11px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      }}
                    >
                      Save Service
                    </button>
                  </form>
                </div>
              </div>

              {/* Active Packages List */}
              <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Configured Packages</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {packages.map((pkg: any) => (
                    <div key={pkg.id} style={{ background: '#072218', border: '1px solid rgba(229,193,88,0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{pkg.name}</h4>
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: pkg.moderation_status === 'APPROVED' ? 'rgba(56,161,105,0.2)' : 'rgba(237,137,54,0.2)', color: pkg.moderation_status === 'APPROVED' ? '#48bb78' : '#ed8936' }}>
                            {pkg.moderation_status || 'APPROVED'}
                          </span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e5c158', margin: '8px 0' }}>
                          ₹{parseFloat(pkg.price).toLocaleString('en-IN')}
                        </div>
                        <p style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '12px' }}>{pkg.description || 'All-inclusive wedding service'}</p>
                        <div style={{ fontSize: '12px', color: '#cbd5e0' }}>Capacity: {pkg.guest_capacity} guests</div>
                      </div>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                        style={{
                          marginTop: '16px',
                          padding: '8px 14px',
                          background: 'rgba(230,0,92,0.15)',
                          border: '1px solid #ff2a73',
                          color: '#ff80ab',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Delete Package
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: CALENDAR & AVAILABILITY ================= */}
          {activeTab === 'calendar' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Manage Date Availability</h3>
                  <form onSubmit={handleToggleAvailability}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>SELECT DATE TO BLOCK</label>
                      <input
                        type="date"
                        value={blockDate}
                        onChange={(e) => setBlockDate(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '6px' }}>REASON / NOTES</label>
                      <input
                        type="text"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '11px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      }}
                    >
                      Mark Date Unavailable / Blocked
                    </button>
                  </form>
                </div>

                {/* Confirmed Booked Dates Guard */}
                <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Locked & Committed Dates</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {availability?.confirmed_bookings?.length === 0 ? (
                      <p style={{ color: '#a0aec0', fontSize: '13px' }}>No locked confirmed bookings yet. Dates automatically lock when client completes escrow payment.</p>
                    ) : (
                      availability?.confirmed_bookings?.map((b: any, idx: number) => (
                        <div key={idx} style={{ background: '#0a271c', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#e5c158' }}>{new Date(b.date).toLocaleDateString()}</div>
                            <div style={{ fontSize: '12px', color: '#a0aec0' }}>Booking {b.booking_number}</div>
                          </div>
                          <span style={{ fontSize: '11px', background: 'rgba(56,161,105,0.2)', color: '#48bb78', padding: '3px 8px', borderRadius: '6px' }}>
                            LOCKED (No Double-Booking)
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 5: BOOKINGS & LEADS ================= */}
          {activeTab === 'bookings' && (
            <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Direct Booking Inquiries & Fulfillment</h2>
              {bookings.length === 0 ? (
                <p style={{ color: '#a0aec0', textAlign: 'center', padding: '24px 0' }}>No inquiries received yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#0a271c', color: '#e5c158' }}>
                        <th style={{ padding: '12px' }}>Booking #</th>
                        <th style={{ padding: '12px' }}>Client Info</th>
                        <th style={{ padding: '12px' }}>Event Date & Guests</th>
                        <th style={{ padding: '12px' }}>Net Payout Amount</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b: any) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px', color: '#e5c158', fontWeight: 'bold' }}>{b.booking_number}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ color: '#fff', fontWeight: 'bold' }}>{b.customer_name}</div>
                            <div style={{ fontSize: '12px', color: '#a0aec0' }}>{b.customer_phone || 'Protected (Available after confirmation)'}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ color: '#fff' }}>{new Date(b.event_date).toLocaleDateString()}</div>
                            <div style={{ fontSize: '12px', color: '#a0aec0' }}>{b.guest_count} guests</div>
                          </td>
                          <td style={{ padding: '12px', color: '#48bb78', fontWeight: 'bold' }}>
                            ₹{parseFloat(b.vendor_payout_amount).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                              background: b.status === 'CONFIRMED' ? 'rgba(56,161,105,0.2)' : b.status === 'IN_PROGRESS' ? 'rgba(49,130,206,0.2)' : 'rgba(237,137,54,0.2)',
                              color: b.status === 'CONFIRMED' ? '#48bb78' : b.status === 'IN_PROGRESS' ? '#63b3ed' : '#ed8936',
                            }}>
                              {b.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {b.status === 'REQUESTED' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(b.id, 'ACCEPTED')}
                                    style={{
                                      padding: '6px 14px',
                                      background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      boxShadow: '0 2px 8px rgba(230,0,92,0.38)',
                                    }}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(b.id, 'REJECTED')}
                                    style={{
                                      padding: '6px 12px',
                                      background: 'rgba(230,0,92,0.15)',
                                      border: '1px solid #ff2a73',
                                      color: '#ff80ab',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                              {b.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleUpdateStatus(b.id, 'IN_PROGRESS')}
                                  style={{
                                    padding: '6px 14px',
                                    background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    boxShadow: '0 2px 8px rgba(230,0,92,0.38)',
                                  }}
                                >
                                  Start Fulfillment
                                </button>
                              )}
                              {b.status === 'IN_PROGRESS' && (
                                <button
                                  onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}
                                  style={{
                                    padding: '6px 14px',
                                    background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    boxShadow: '0 2px 8px rgba(230,0,92,0.38)',
                                  }}
                                >
                                  Mark Completed
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 6: PORTFOLIO & REELS ================= */}
          {activeTab === 'portfolio' && (
            <div>
              <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Upload Wedding Showcase Reel</h3>
                <form onSubmit={handleUploadReel} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>REEL TITLE</label>
                    <input
                      type="text"
                      placeholder="e.g. 4K Drone Mandap Reveal"
                      value={reelTitle}
                      onChange={(e) => setReelTitle(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>VIDEO URL (.mp4)</label>
                    <input
                      type="text"
                      placeholder="https://storage.googleapis.com/.../video.mp4"
                      value={reelVideoUrl}
                      onChange={(e) => setReelVideoUrl(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>THUMBNAIL IMAGE URL</label>
                    <input
                      type="text"
                      placeholder="/images/photographer.jpg"
                      value={reelThumbUrl}
                      onChange={(e) => setReelThumbUrl(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a251b', border: '1px solid rgba(229,193,88,0.3)', color: '#fff' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '11px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(230, 0, 92, 0.38)',
                      }}
                    >
                      Upload Reel
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Reels Preview */}
              <div style={{ background: '#061d15', borderRadius: '16px', border: '1px solid rgba(229,193,88,0.2)', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158', marginBottom: '16px' }}>Your Approved Showcase Reels</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                  {reels.map((reel: any) => (
                    <div key={reel.id} style={{ background: '#072218', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(229,193,88,0.2)' }}>
                      <img src={reel.thumbnail_url} alt={reel.title} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                      <div style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>{reel.title}</div>
                        <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Views: {reel.views_count} • Likes: {reel.likes_count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
