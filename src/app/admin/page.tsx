'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface AdminStats {
  total_users: number;
  total_customers: number;
  total_vendors: number;
  verified_vendors: number;
  pending_vendors: number;
  total_bookings: number;
  pending_bookings: number;
  gmv: number;
  commission_revenue: number;
  open_disputes: number;
  recent_logs: any[];
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'onboarding' | 'commission' | 'payouts' | 'disputes' | 'reviews' | 'fraud' | 'weights' | 'logs'
  >('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [commissionRules, setCommissionRules] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [reviewReports, setReviewReports] = useState<any[]>([]);
  const [fraudData, setFraudData] = useState<any>(null);
  const [weights, setWeights] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Selected vendor modal for KYC inspection
  const [selectedVendorKYC, setSelectedVendorKYC] = useState<any>(null);
  const [kycLoading, setKycLoading] = useState(false);

  // New Commission Rule Form
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleValue, setNewRuleValue] = useState('10.0');
  const [newRuleType, setNewRuleType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [authNeeded, setAuthNeeded] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@wedwithme.com');
  const [adminPassword, setAdminPassword] = useState('Admin@123456');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
        setAuthNeeded(false);
      } else {
        if (res.status === 401 || res.status === 403) {
          setAuthNeeded(true);
        } else {
          setError(data.message || 'Failed to fetch admin stats');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthNeeded(false);
        fetchStats();
      } else {
        setError(data.message || 'Admin login failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSuccessMsg(null);
    setError(null);

    if (tab === 'onboarding') {
      const res = await fetch('/api/admin/vendors');
      const data = await res.json();
      if (data.success) setVendors(data.data);
    } else if (tab === 'commission') {
      const res = await fetch('/api/admin/commission-rules');
      const data = await res.json();
      if (data.success) setCommissionRules(data.data);
    } else if (tab === 'payouts') {
      const res = await fetch('/api/admin/payouts');
      const data = await res.json();
      if (data.success) setPayouts(data.data);
    } else if (tab === 'disputes') {
      const res = await fetch('/api/disputes');
      const data = await res.json();
      if (data.success) setDisputes(data.data);
    } else if (tab === 'reviews') {
      const res = await fetch('/api/admin/reviews');
      const data = await res.json();
      if (data.success) setReviewReports(data.data);
    } else if (tab === 'fraud') {
      const res = await fetch('/api/admin/fraud');
      const data = await res.json();
      if (data.success) setFraudData(data.data);
    } else if (tab === 'weights') {
      const res = await fetch('/api/admin/weights');
      const data = await res.json();
      if (data.success) setWeights(data.data);
    } else if (tab === 'logs') {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (data.success) setLogs(data.data);
    }
  };

  const openVendorKYC = async (vendorId: string) => {
    setKycLoading(true);
    try {
      const res = await fetch(`/api/admin/onboarding/${vendorId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedVendorKYC(data.data);
      }
    } catch {}
    setKycLoading(false);
  };

  const handleApproveDocument = async (vendorId: string, docId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/admin/onboarding/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: docId,
          document_status: status,
          document_rejection_reason: status === 'REJECTED' ? 'Document image unclear or expired' : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Document marked as ${status}`);
        openVendorKYC(vendorId);
      }
    } catch {}
  };

  const handleModerateVendor = async (vendorId: string, onboardingStatus: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/admin/onboarding/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboarding_status: onboardingStatus,
          rejection_reason: onboardingStatus === 'REJECTED' ? 'Compliance criteria not met' : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Vendor onboarding status updated to ${onboardingStatus}`);
        setSelectedVendorKYC(null);
        loadTabData('onboarding');
      }
    } catch {}
  };

  const handleToggleBadge = async (vendorId: string, type: 'featured' | 'sponsored', val: boolean) => {
    try {
      const body = type === 'featured' ? { is_featured: val } : { is_sponsored: val };
      const res = await fetch(`/api/admin/vendors/${vendorId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Updated ${type} badge for vendor`);
        loadTabData('onboarding');
      }
    } catch {}
  };

  const handleCreateCommissionRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName || !newRuleValue) return;
    try {
      const res = await fetch('/api/admin/commission-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_name: newRuleName,
          commission_type: newRuleType,
          commission_value: parseFloat(newRuleValue),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Commission rule created successfully!');
        setNewRuleName('');
        loadTabData('commission');
      }
    } catch {}
  };

  const handleApprovePayout = async (payoutId: string) => {
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout_id: payoutId, status: 'PAID' }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Vendor payout approved and marked as settled!');
        loadTabData('payouts');
        fetchStats();
      }
    } catch {}
  };

  const handleResolveDispute = async (disputeId: string, decision: 'REFUND_CUSTOMER' | 'PAYOUT_VENDOR') => {
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution_decision: decision,
          resolution_notes: `Arbitration conclusion: ${decision === 'REFUND_CUSTOMER' ? 'Issue verified with service fulfillment. Full customer escrow refunded.' : 'Vendor fulfillment validated. Funds released to vendor.'}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Dispute resolved with decision: ${decision}`);
        loadTabData('disputes');
        fetchStats();
      }
    } catch {}
  };

  const handleActionReview = async (reportId: string, action: 'DISMISS' | 'REMOVE_REVIEW') => {
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Review report actioned: ${action}`);
        loadTabData('reviews');
      }
    } catch {}
  };

  const handleActionFraud = async (flagId: string, status: 'DISMISSED' | 'ACTIONED') => {
    try {
      const res = await fetch('/api/admin/fraud', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag_id: flagId, status, action_taken: status === 'ACTIONED' ? 'Reviewed and confirmed' : 'False positive dismissed' }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Risk flag updated to ${status}`);
        loadTabData('fraud');
      }
    } catch {}
  };

  if (authNeeded) {
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
            <p style={{ fontSize: '13px', color: '#9cb1a6' }}>Super Admin credentials required</p>
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
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#ff6b9d', marginBottom: '6px' }}>PASSWORD</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
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

  const adminNavItems = [
    { id: 'overview', label: 'Overview & Analytics', icon: '📈' },
    { id: 'onboarding', label: 'Vendor KYC Review', icon: '🛡️', badge: (stats?.pending_vendors || 0) > 0 ? `${stats?.pending_vendors} PENDING` : undefined },
    { id: 'commission', label: 'Commission Engine', icon: '💰', count: commissionRules.length },
    { id: 'payouts', label: 'Finance & Payouts', icon: '🏦', count: payouts.length },
    { id: 'disputes', label: 'Disputes & Arbitration', icon: '⚖️', badge: (stats?.open_disputes || 0) > 0 ? `${stats?.open_disputes} OPEN` : undefined },
    { id: 'reviews', label: 'Review Moderation', icon: '⭐', count: reviewReports.length },
    { id: 'fraud', label: 'Fraud & Risk Control', icon: '🚨' },
    { id: 'weights', label: 'Match Weights', icon: '🎯' },
    { id: 'logs', label: 'Audit Trail Logs', icon: '📋' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14', color: '#fff', display: 'flex' }}>
      {/* Left Sidebar */}
      <aside
        style={{
          width: '280px',
          flexShrink: 0,
          background: '#0d101a',
          borderRight: '1px solid rgba(255, 42, 115, 0.2)',
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
        <div style={{ paddingBottom: '18px', borderBottom: '1px solid rgba(255, 42, 115, 0.15)', marginBottom: '18px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="30" height="22" viewBox="0 0 54 40" fill="none">
              <path d="M4 10L11 32L17 14L22 30L26 12" stroke="url(#adminPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z" fill="url(#adminHeartGrad)" />
              <path d="M28 12L32 30L37 14L43 32L50 10" stroke="url(#adminPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#e5c158', letterSpacing: '-0.5px' }}>WedWithMe</span>
          </Link>
          <div style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', background: 'rgba(230,0,92,0.15)', color: '#ff6b9d', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(230,0,92,0.3)', fontWeight: 600 }}>
            Super Admin Governance
          </div>
        </div>

        {/* Admin Profile Box */}
        <div style={{ background: '#131724', border: '1px solid rgba(255, 42, 115, 0.2)', borderRadius: '12px', padding: '14px', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #ff2a73, #e6005c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', color: '#fff', boxShadow: '0 3px 10px rgba(230,0,92,0.35)' }}>
              A
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                Master Administrator
              </div>
              <div style={{ fontSize: '11px', color: '#a0aec0' }}>
                admin@wedwithme.com
              </div>
            </div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', background: 'rgba(56,161,105,0.2)', color: '#48bb78', border: '1px solid #48bb78' }}>
              ROOT PRIVILEGE
            </span>
            <span style={{ fontSize: '11px', color: '#ff6b9d' }}>
              Audited 256-bit
            </span>
          </div>
        </div>

        {/* Sidebar Menu Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#ff6b9d', letterSpacing: '0.8px', padding: '0 8px', marginBottom: '4px' }}>
            ADMINISTRATION CONSOLE
          </div>
          {adminNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => loadTabData(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 14px',
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
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255, 42, 115, 0.15)',
                    color: isActive ? '#fff' : '#ff6b9d',
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
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(230, 0, 92, 0.25)',
                    color: isActive ? '#fff' : '#ff6b9d',
                    fontWeight: 700,
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Sign Out Button */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
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

      {/* Main Content View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '70px',
            background: '#0d101a',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
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
              {activeTab === 'overview' && 'Marketplace Analytics & Security Overview'}
              {activeTab === 'onboarding' && 'Vendor KYC Verification & Compliance Review'}
              {activeTab === 'commission' && 'Automated Commission Tier Engine'}
              {activeTab === 'payouts' && 'Finance & Settlement Ledger'}
              {activeTab === 'disputes' && 'Dispute Arbitration & Escrow Release'}
              {activeTab === 'reviews' && 'Customer Review Moderation Desk'}
              {activeTab === 'fraud' && 'Real-time Fraud & Risk Detection Hooks'}
              {activeTab === 'weights' && 'Dynamic Match Score Weight Matrix'}
              {activeTab === 'logs' && 'Immutable Administrative Audit Log'}
            </div>
            <div style={{ fontSize: '12px', color: '#a0aec0' }}>
              WedWithMe Master Control Node • SSL Encrypted
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '11px', background: 'rgba(56,161,105,0.15)', color: '#48bb78', padding: '5px 12px', borderRadius: '12px', border: '1px solid rgba(56,161,105,0.3)', fontWeight: 600 }}>
              ● All Systems Nominal
            </span>
          </div>
        </header>

        {/* Content Body */}
        <main style={{ flex: 1, padding: '32px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
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

          {/* ================= TAB 1: OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: '#121624', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '13px', color: '#a0aec0' }}>Gross Marketplace Volume (GMV)</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#48bb78', marginTop: '6px' }}>
                    ₹{stats?.gmv?.toLocaleString('en-IN') || '0'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Escrow-backed confirmed bookings</div>
                </div>

                <div style={{ background: '#121624', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '13px', color: '#a0aec0' }}>Platform Commission Revenue</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#e5c158', marginTop: '6px' }}>
                    ₹{stats?.commission_revenue?.toLocaleString('en-IN') || '0'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Earned from booking commissions</div>
                </div>

                <div style={{ background: '#121624', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '13px', color: '#a0aec0' }}>Registered Marketplace Vendors</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#fff', marginTop: '6px' }}>
                    {stats?.total_vendors || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#48bb78', marginTop: '4px' }}>{stats?.verified_vendors || 0} Verified Partners</div>
                </div>

                <div style={{ background: '#121624', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '13px', color: '#a0aec0' }}>Disputes & Arbitration</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: (stats?.open_disputes || 0) > 0 ? '#ff4d79' : '#a0aec0', marginTop: '6px' }}>
                    {stats?.open_disputes || 0} Open
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>Under arbitration review</div>
                </div>
              </div>

              {/* Recent Audit Logs Strip */}
              <div style={{ background: '#121624', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>Recent System Security & Audit Events</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stats?.recent_logs?.map((l: any) => (
                    <div key={l.id} style={{ background: '#181e30', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ color: '#ff6b9d', fontWeight: 'bold', fontSize: '13px' }}>{l.action}</span>
                        <span style={{ color: '#cbd5e0', fontSize: '13px', marginLeft: '12px' }}>Entity: {l.entity_type} ({l.entity_id})</span>
                        <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>By: {l.user_email || 'System'}</div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#a0aec0' }}>{new Date(l.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: VENDOR ONBOARDING & KYC ================= */}
          {activeTab === 'onboarding' && (
            <div style={{ background: '#121624', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>Vendor Onboarding & KYC Compliance Review</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#181e30', color: '#ff6b9d' }}>
                      <th style={{ padding: '12px' }}>Vendor Business</th>
                      <th style={{ padding: '12px' }}>Category & City</th>
                      <th style={{ padding: '12px' }}>Owner</th>
                      <th style={{ padding: '12px' }}>Onboarding Status</th>
                      <th style={{ padding: '12px' }}>Listing Badges</th>
                      <th style={{ padding: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v) => (
                      <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 'bold', color: '#fff' }}>{v.business_name}</div>
                          <div style={{ fontSize: '11px', color: '#a0aec0' }}>ID: {v.id}</div>
                        </td>
                        <td style={{ padding: '12px' }}>{v.category_name} • {v.city}</td>
                        <td style={{ padding: '12px' }}>
                          <div>{v.owner_name}</div>
                          <div style={{ fontSize: '11px', color: '#a0aec0' }}>{v.owner_email}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
                            background: v.onboarding_status === 'APPROVED' ? 'rgba(56,161,105,0.2)' : 'rgba(237,137,54,0.2)',
                            color: v.onboarding_status === 'APPROVED' ? '#48bb78' : '#ed8936',
                          }}>
                            {v.onboarding_status || 'DRAFT'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleToggleBadge(v.id, 'featured', !v.is_featured)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                background: v.is_featured ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'rgba(255,255,255,0.08)',
                                color: '#fff',
                                fontWeight: 'bold',
                              }}
                            >
                              {v.is_featured ? '★ FEATURED' : '+ Feature'}
                            </button>
                            <button
                              onClick={() => handleToggleBadge(v.id, 'sponsored', !v.is_sponsored)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                background: v.is_sponsored ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'rgba(255,255,255,0.08)',
                                color: '#fff',
                                fontWeight: 'bold',
                              }}
                            >
                              {v.is_sponsored ? 'SPONSORED' : '+ Sponsor'}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => openVendorKYC(v.id)}
                            style={{
                              padding: '7px 14px',
                              background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                              boxShadow: '0 2px 8px rgba(230,0,92,0.35)',
                            }}
                          >
                            Review KYC Dossier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* KYC Inspection Drawer / Modal */}
              {selectedVendorKYC && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                  <div style={{ maxWidth: '680px', width: '100%', background: '#121624', borderRadius: '16px', border: '1px solid #ff4d79', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                        KYC Compliance: {selectedVendorKYC.vendor.business_name}
                      </h3>
                      <button onClick={() => setSelectedVendorKYC(null)} style={{ background: 'transparent', border: 'none', color: '#a0aec0', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                    </div>

                    {/* Financial Sensitive Info */}
                    <div style={{ background: '#181e30', padding: '16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
                      <div style={{ color: '#ff6b9d', fontWeight: 'bold', marginBottom: '6px' }}>BANKING & TAX METADATA (CONFIDENTIAL)</div>
                      <div>PAN: {selectedVendorKYC.vendor.pan_number || 'Not provided'}</div>
                      <div>GST: {selectedVendorKYC.vendor.gst_number || 'Not provided'}</div>
                      <div>Bank A/C: {selectedVendorKYC.vendor.bank_account_number || 'Not provided'} (IFSC: {selectedVendorKYC.vendor.bank_ifsc || 'N/A'})</div>
                    </div>

                    {/* Uploaded Documents */}
                    <h4 style={{ fontSize: '14px', color: '#ff6b9d', marginBottom: '10px' }}>Uploaded Verification Documents</h4>
                    {selectedVendorKYC.documents.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '20px' }}>Vendor has not uploaded files yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                        {selectedVendorKYC.documents.map((d: any) => (
                          <div key={d.id} style={{ background: '#181e30', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 'bold' }}>{d.doc_type} ({d.document_number || 'No number'})</div>
                              <a href={d.file_url} target="_blank" rel="noreferrer" style={{ color: '#ff80ab', fontSize: '12px' }}>View Uploaded File ↗</a>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', color: d.verification_status === 'VERIFIED' ? '#48bb78' : '#ed8936' }}>{d.verification_status}</span>
                              {d.verification_status !== 'VERIFIED' && (
                                <button
                                  onClick={() => handleApproveDocument(selectedVendorKYC.vendor.id, d.id, 'VERIFIED')}
                                  style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                  Verify
                                </button>
                              )}
                              {d.verification_status !== 'REJECTED' && (
                                <button
                                  onClick={() => handleApproveDocument(selectedVendorKYC.vendor.id, d.id, 'REJECTED')}
                                  style={{ padding: '6px 12px', background: 'rgba(230,0,92,0.15)', border: '1px solid #ff2a73', color: '#ff80ab', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Master Decision */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                      <button
                        onClick={() => handleModerateVendor(selectedVendorKYC.vendor.id, 'REJECTED')}
                        style={{ padding: '10px 18px', background: 'rgba(230,0,92,0.15)', border: '1px solid #ff2a73', color: '#ff80ab', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Reject Onboarding
                      </button>
                      <button
                        onClick={() => handleModerateVendor(selectedVendorKYC.vendor.id, 'APPROVED')}
                        style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 14px rgba(230,0,92,0.38)' }}
                      >
                        Approve & Grant Verified Badge
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: COMMISSION ENGINE ================= */}
          {activeTab === 'commission' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '28px' }}>
                <div style={{ background: '#121624', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff6b9d', marginBottom: '16px' }}>Add Dynamic Commission Rule</h3>
                  <form onSubmit={handleCreateCommissionRule}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>RULE NAME</label>
                      <input
                        type="text"
                        placeholder="e.g. Photography Special 12%"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>COMMISSION TYPE</label>
                        <select
                          value={newRuleType}
                          onChange={(e) => setNewRuleType(e.target.value as any)}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        >
                          <option value="PERCENTAGE">Percentage (%)</option>
                          <option value="FIXED">Fixed Fee (₹)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>VALUE (% or ₹)</label>
                        <input
                          type="number"
                          value={newRuleValue}
                          onChange={(e) => setNewRuleValue(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        />
                      </div>
                    </div>
                    <button type="submit" style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(230,0,92,0.38)' }}>
                      Save Commission Rule
                    </button>
                  </form>
                </div>

                {/* Commission Rules Table */}
                <div style={{ background: '#121624', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>Active Commission Engine Rules</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {commissionRules.map((r) => (
                      <div key={r.id} style={{ background: '#181e30', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#fff' }}>{r.rule_name}</div>
                          <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                            {r.commission_type === 'PERCENTAGE' ? `${r.commission_value}%` : `₹${r.commission_value}`} • Min: ₹{r.min_fee}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', background: 'rgba(56,161,105,0.2)', color: '#48bb78', padding: '3px 8px', borderRadius: '4px' }}>
                          ACTIVE
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: PAYOUTS & FINANCE ================= */}
          {activeTab === 'payouts' && (
            <div style={{ background: '#121624', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>Vendor Payout Settlements</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#181e30', color: '#ff6b9d' }}>
                    <th style={{ padding: '12px' }}>Payout Ref</th>
                    <th style={{ padding: '12px' }}>Vendor</th>
                    <th style={{ padding: '12px' }}>Booking #</th>
                    <th style={{ padding: '12px' }}>Net Amount</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', color: '#ff6b9d' }}>{p.reference_id}</td>
                      <td style={{ padding: '12px' }}>{p.business_name} ({p.city})</td>
                      <td style={{ padding: '12px' }}>{p.booking_number}</td>
                      <td style={{ padding: '12px', color: '#48bb78', fontWeight: 'bold' }}>₹{parseFloat(p.amount).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                          background: p.status === 'PAID' ? 'rgba(56,161,105,0.2)' : 'rgba(237,137,54,0.2)',
                          color: p.status === 'PAID' ? '#48bb78' : '#ed8936',
                        }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {p.status !== 'PAID' && (
                          <button
                            onClick={() => handleApprovePayout(p.id)}
                            style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, boxShadow: '0 2px 8px rgba(230,0,92,0.35)' }}
                          >
                            Approve Payout
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= TAB 5: DISPUTES & ARBITRATION ================= */}
          {activeTab === 'disputes' && (
            <div style={{ background: '#121624', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>Dispute Resolution & Escrow Arbitration</h2>
              {disputes.length === 0 ? (
                <p style={{ color: '#a0aec0' }}>No active disputes registered.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {disputes.map((d) => (
                    <div key={d.id} style={{ background: '#181e30', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: '#ff4d79' }}>Booking #{d.booking_number}</span>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: d.status === 'RESOLVED' ? 'rgba(56,161,105,0.2)' : 'rgba(230,0,92,0.2)', color: d.status === 'RESOLVED' ? '#48bb78' : '#ff6b9d' }}>
                          {d.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#fff', marginBottom: '8px' }}>Reason: {d.reason}</div>
                      <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '14px' }}>
                        Raised by: {d.raised_by_name} • Vendor: {d.vendor_name} • Total: ₹{parseFloat(d.total_amount).toLocaleString('en-IN')}
                      </div>
                      {d.status === 'OPEN' && (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button
                            onClick={() => handleResolveDispute(d.id, 'REFUND_CUSTOMER')}
                            style={{ padding: '8px 16px', background: 'rgba(230,0,92,0.15)', border: '1px solid #ff2a73', color: '#ff80ab', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                          >
                            Refund Escrow to Customer
                          </button>
                          <button
                            onClick={() => handleResolveDispute(d.id, 'PAYOUT_VENDOR')}
                            style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(230,0,92,0.35)' }}
                          >
                            Release Payout to Vendor
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 6: REVIEW MODERATION ================= */}
          {activeTab === 'reviews' && (
            <div style={{ background: '#121624', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>Reported Reviews Moderation</h2>
              {reviewReports.length === 0 ? (
                <p style={{ color: '#a0aec0' }}>No reported reviews flagged.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reviewReports.map((r) => (
                    <div key={r.id} style={{ background: '#181e30', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#e5c158', fontWeight: 'bold' }}>Rating: {r.rating}★ for {r.vendor_name}</div>
                        <div style={{ fontSize: '13px', color: '#cbd5e0', margin: '4px 0' }}>"{r.comment}"</div>
                        <div style={{ fontSize: '11px', color: '#ff6b9d' }}>Report reason: {r.reason} (by {r.reporter_name})</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleActionReview(r.id, 'DISMISS')}
                          style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Dismiss Report
                        </button>
                        <button
                          onClick={() => handleActionReview(r.id, 'REMOVE_REVIEW')}
                          style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, boxShadow: '0 2px 8px rgba(230,0,92,0.35)' }}
                        >
                          Remove Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 7: FRAUD & RISK CONTROLS ================= */}
          {activeTab === 'fraud' && (
            <div style={{ background: '#121624', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>Fraud Detection & Risk Signal Hooks</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fraudData?.fraud_flags?.map((f: any) => (
                  <div key={f.id} style={{ background: '#181e30', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#ff4d79' }}>{f.entity_type} Flag (Risk Score: {f.risk_score}/100)</div>
                      <div style={{ fontSize: '13px', color: '#cbd5e0', marginTop: '4px' }}>{f.flag_reason}</div>
                      <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Severity: {f.severity} • Status: {f.status}</div>
                    </div>
                    {f.status === 'OPEN' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleActionFraud(f.id, 'DISMISSED')}
                          style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleActionFraud(f.id, 'ACTIONED')}
                          style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, boxShadow: '0 2px 8px rgba(230,0,92,0.35)' }}
                        >
                          Action / Flag
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 8: MATCH WEIGHTS ================= */}
          {activeTab === 'weights' && (
            <div style={{ background: '#121624', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>Multi-Factor Match Weights Engine</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {weights.map((w: any) => (
                  <div key={w.id} style={{ background: '#181e30', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{w.factor_name}</div>
                      <div style={{ fontSize: '12px', color: '#a0aec0' }}>Weight: {w.weight_percent}%</div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#48bb78' }}>ACTIVE (v{w.version})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 9: AUDIT LOGS ================= */}
          {activeTab === 'logs' && (
            <div style={{ background: '#121624', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>Immutable Administrative Audit Trail</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {logs.map((l: any) => (
                  <div key={l.id} style={{ background: '#181e30', padding: '10px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#ff6b9d', fontWeight: 'bold' }}>{l.action}</span>
                      <span style={{ color: '#cbd5e0', marginLeft: '12px' }}>{l.entity_type} ({l.entity_id})</span>
                      <span style={{ color: '#718096', marginLeft: '12px' }}>by {l.user_email || 'System'}</span>
                    </div>
                    <span style={{ color: '#a0aec0' }}>{new Date(l.created_at).toLocaleString()}</span>
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
