'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export interface MatchProfileCard {
  id: string;
  profile_id: string;
  userId: string;
  name: string;
  gender: string;
  age: number;
  heightFormatted: string;
  height_cm: number;
  city: string;
  state: string;
  country: string;
  religion: string;
  caste: string;
  sub_caste?: string;
  mother_tongue: string;
  education: string;
  college?: string;
  profession: string;
  company?: string;
  annual_income: number;
  annualIncomeFormatted: string;
  about_me: string;
  diet: string;
  smoking: string;
  drinking: string;
  family_type: string;
  family_values: string;
  photo_url: string | null;
  is_photo_hidden: boolean;
  is_location_hidden?: boolean;
  verification_status: string;
  is_verified: boolean;
  match_score: string;
  matchScoreNumber: number;
  recommendationScore: number;
  is_shortlisted: boolean;
  breakdown: Array<{
    factor: string;
    weight: number;
    score: number;
    matched: boolean;
    reason: string;
  }>;
  compatibilityDetails?: any;
}

interface CustomerMatchesSectionProps {
  initialTab?: 'best' | 'recommended' | 'recent';
  showDashboardLink?: boolean;
  onNavigateToPreferences?: () => void;
}

export default function CustomerMatchesSection({
  initialTab = 'best',
  showDashboardLink = false,
  onNavigateToPreferences,
}: CustomerMatchesSectionProps) {
  const [activeTab, setActiveTab] = useState<'best' | 'recommended' | 'recent'>(initialTab);
  const [matches, setMatches] = useState<MatchProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReligion, setSelectedReligion] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedAgeRange, setSelectedAgeRange] = useState('ALL');

  // Profile Detail Modal
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileModalData, setProfileModalData] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Interest Sent tracking
  const [interestSentIds, setInterestSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMatches();
  }, [activeTab, selectedReligion, selectedCity, selectedAgeRange]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('tab', activeTab);
      if (selectedReligion !== 'ALL') params.set('religion', selectedReligion);
      if (selectedCity !== 'ALL') params.set('city', selectedCity);
      if (selectedAgeRange !== 'ALL') params.set('ageRange', selectedAgeRange);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/matrimonial/matches?${params.toString()}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setMatches(json.data);
      } else {
        setError(json.message || 'Failed to load matrimonial matches.');
      }
    } catch (err: any) {
      console.error('Error fetching matches:', err);
      setError('Unable to connect to matchmaking server. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Shortlist action via real REST API
  const handleToggleShortlist = async (profileId: string) => {
    const currentItem = matches.find((m) => m.id === profileId);
    const nextState = !currentItem?.is_shortlisted;

    // Optimistic UI update
    setMatches((prev) =>
      prev.map((m) => (m.id === profileId ? { ...m, is_shortlisted: nextState } : m))
    );

    if (profileModalData && profileModalData.id === profileId) {
      setProfileModalData((prev: any) => ({ ...prev, is_shortlisted: nextState }));
    }

    try {
      const res = await fetch('/api/customer/shortlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_profile_id: profileId, action: 'toggle' }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || (nextState ? 'Shortlisted! ❤️' : 'Removed from shortlist.'));
      } else {
        // Rollback
        setMatches((prev) =>
          prev.map((m) => (m.id === profileId ? { ...m, is_shortlisted: !nextState } : m))
        );
        showToast(data.message || 'Failed to update shortlist');
      }
    } catch {
      // Rollback
      setMatches((prev) =>
        prev.map((m) => (m.id === profileId ? { ...m, is_shortlisted: !nextState } : m))
      );
      showToast('Network error while updating shortlist.');
    }
  };

  // Open "View Profile" Modal
  const handleOpenProfileModal = async (profileId: string) => {
    setSelectedProfileId(profileId);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/customer/profiles/${profileId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setProfileModalData(data.data);
      } else {
        showToast(data.message || 'Could not load profile details.');
        setSelectedProfileId(null);
      }
    } catch {
      showToast('Error loading profile details.');
      setSelectedProfileId(null);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSendInterest = (profileId: string, name: string) => {
    setInterestSentIds((prev) => new Set(prev).add(profileId));
    showToast(`Interest successfully transmitted to ${name}! 💖`);
  };

  // Filtered in-memory search for snappy UI search response
  const filteredMatches = matches.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.profession.toLowerCase().includes(q) ||
      m.education.toLowerCase().includes(q) ||
      m.city.toLowerCase().includes(q) ||
      m.caste.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ width: '100%', color: '#fff' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #062a1c 0%, #031710 100%)',
            border: '1px solid #e5c158',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            fontSize: '14px',
            fontWeight: '600',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= INFORMATIONAL DISCLAIMER BANNER ================= */}
      <div
        style={{
          background: 'rgba(6, 42, 28, 0.7)',
          border: '1px solid rgba(229, 193, 88, 0.35)',
          borderRadius: '14px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        <span style={{ fontSize: '20px', lineHeight: '1.2' }}>ℹ️</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#e5c158', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
            Informational Disclaimer & Algorithmic Notice
          </div>
          <p style={{ fontSize: '12.5px', color: '#9cb1a6', margin: '3px 0 0 0', lineHeight: 1.5 }}>
            Software compatibility match percentages and profile recommendations are mathematical evaluations derived from user-reported preferences, profile criteria, and trust signals. They do not constitute an absolute guarantee of compatibility, marriage success, or exhaustive background verification.
          </p>
        </div>
      </div>

      {/* ================= TOP SECTION HEADER & TAB NAV ================= */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>💍 Matrimonial Matches</span>
            <span style={{ fontSize: '12px', background: 'rgba(229,193,88,0.18)', color: '#e5c158', border: '1px solid rgba(229,193,88,0.3)', padding: '2px 10px', borderRadius: '9999px', fontWeight: '700' }}>
              {matches.length} Verified Candidates
            </span>
          </h2>
          <p style={{ fontSize: '13px', color: '#9cb1a6', margin: '4px 0 0 0' }}>
            Curated prospects ranked by multi-factor algorithmic compatibility and verified community trust.
          </p>
        </div>

        {/* 3 LOGICAL SECTIONS / TABS */}
        <div
          style={{
            display: 'inline-flex',
            background: '#031710',
            border: '1px solid rgba(229,193,88,0.25)',
            borderRadius: '12px',
            padding: '4px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('best')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: activeTab === 'best' ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'transparent',
              color: '#fff',
              fontSize: '13px',
              fontWeight: activeTab === 'best' ? '800' : '600',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'best' ? '0 4px 12px rgba(230,0,92,0.35)' : 'none',
            }}
          >
            🌟 Best Matches
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recommended')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: activeTab === 'recommended' ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'transparent',
              color: '#fff',
              fontSize: '13px',
              fontWeight: activeTab === 'recommended' ? '800' : '600',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'recommended' ? '0 4px 12px rgba(230,0,92,0.35)' : 'none',
            }}
          >
            🎯 Recommended
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: activeTab === 'recent' ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'transparent',
              color: '#fff',
              fontSize: '13px',
              fontWeight: activeTab === 'recent' ? '800' : '600',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'recent' ? '0 4px 12px rgba(230,0,92,0.35)' : 'none',
            }}
          >
            🕒 Recently Added
          </button>
        </div>
      </div>

      {/* ================= SEARCH & QUICK FILTERS BAR ================= */}
      <div
        style={{
          background: '#062a1c',
          border: '1px solid rgba(229,193,88,0.22)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '26px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search name, profession, city..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#031710',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Religion Filter */}
        <div>
          <select
            value={selectedReligion}
            onChange={(e) => setSelectedReligion(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#031710',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            <option value="ALL">All Religions</option>
            <option value="Hindu">Hindu</option>
            <option value="Sikh">Sikh</option>
            <option value="Jain">Jain</option>
            <option value="Muslim">Muslim</option>
            <option value="Christian">Christian</option>
            <option value="Buddhist">Buddhist</option>
          </select>
        </div>

        {/* City Filter */}
        <div>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#031710',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            <option value="ALL">All Locations</option>
            <option value="Delhi">Delhi NCR</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Lucknow">Lucknow</option>
            <option value="Agra">Agra</option>
            <option value="Jaipur">Jaipur</option>
            <option value="Chandigarh">Chandigarh</option>
            <option value="Pune">Pune</option>
          </select>
        </div>

        {/* Age Range Filter */}
        <div>
          <select
            value={selectedAgeRange}
            onChange={(e) => setSelectedAgeRange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#031710',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            <option value="ALL">All Age Groups</option>
            <option value="18-24">18 to 24 yrs</option>
            <option value="25-29">25 to 29 yrs</option>
            <option value="30-34">30 to 34 yrs</option>
            <option value="35+">35+ yrs</option>
          </select>
        </div>
      </div>

      {/* ================= CONTENT STATES: LOADING, ERROR, EMPTY, LIST ================= */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '22px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                background: '#031710',
                borderRadius: '16px',
                border: '1px solid rgba(229,193,88,0.15)',
                height: '420px',
                animation: 'pulse 1.5s infinite ease-in-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9cb1a6',
                fontSize: '13px',
              }}
            >
              Loading verified matches...
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            background: 'rgba(230,0,92,0.15)',
            border: '1px solid #ff2a73',
            borderRadius: '16px',
            padding: '36px',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#ffb3c6', fontSize: '15px', margin: '0 0 16px 0' }}>⚠️ {error}</p>
          <button
            type="button"
            onClick={fetchMatches}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
              color: '#fff',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Retry Loading
          </button>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div
          style={{
            background: '#031710',
            border: '1px solid rgba(229,193,88,0.25)',
            borderRadius: '20px',
            padding: '50px 30px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: '0 0 8px 0' }}>
            No Matching Profiles Found
          </h3>
          <p style={{ color: '#9cb1a6', fontSize: '14px', maxWidth: '520px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
            No approved candidates match your currently selected filters or strict criteria. Try widening your filters or update your partner preferences in Section 6.3.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedReligion('ALL');
                setSelectedCity('ALL');
                setSelectedAgeRange('ALL');
                setSearchQuery('');
              }}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                background: 'rgba(229,193,88,0.15)',
                border: '1px solid #e5c158',
                color: '#e5c158',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
            {onNavigateToPreferences ? (
              <button
                type="button"
                onClick={onNavigateToPreferences}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                  color: '#fff',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Edit Partner Preferences 💖
              </button>
            ) : (
              <Link
                href="/dashboard?tab=preferences"
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                  color: '#fff',
                  fontWeight: '700',
                  textDecoration: 'none',
                }}
              >
                Edit Partner Preferences 💖
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* ================= PROFILES GRID ================= */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '24px' }}>
          {filteredMatches.map((m) => {
            const hasSentInterest = interestSentIds.has(m.id);
            return (
              <div
                key={m.id}
                style={{
                  background: '#062a1c',
                  borderRadius: '18px',
                  border: '1px solid rgba(229,193,88,0.25)',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Photo & Top Badges Container */}
                <div style={{ position: 'relative', width: '100%', height: '240px', background: '#031710' }}>
                  {m.is_photo_hidden || !m.photo_url ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #031710 0%, #0c3827 100%)',
                        color: '#e5c158',
                        gap: '6px',
                      }}
                    >
                      <span style={{ fontSize: '48px' }}>🛡️</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#fae8a4' }}>
                        Photo Protected by Member
                      </span>
                      <span style={{ fontSize: '11px', color: '#9cb1a6' }}>
                        Visible after mutual interest
                      </span>
                    </div>
                  ) : (
                    <img
                      src={m.photo_url}
                      alt={m.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}

                  {/* Software Match Score Pill */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: '800',
                      letterSpacing: '0.4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span>✨</span>
                    <span>{m.match_score} Match</span>
                  </div>

                  {/* Verification Badge */}
                  {m.is_verified && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(6, 42, 28, 0.85)',
                        border: '1px solid #38a169',
                        color: '#9ae6b4',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      ✓ Verified
                    </div>
                  )}

                  {/* Shortlist Quick Heart in Card Corner */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleShortlist(m.id);
                    }}
                    title={m.is_shortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: m.is_shortlisted ? '#ff2a73' : 'rgba(3, 23, 16, 0.8)',
                      border: '1px solid rgba(229,193,88,0.4)',
                      color: '#fff',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {m.is_shortlisted ? '❤️' : '🤍'}
                  </button>
                </div>

                {/* Profile Card Body */}
                <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
                        {m.name}
                      </h3>
                      <span style={{ fontSize: '13px', color: '#e5c158', fontWeight: '700' }}>
                        {m.age} yrs
                      </span>
                    </div>

                    {/* Bio Specs Grid */}
                    <div style={{ fontSize: '12.5px', color: '#9cb1a6', display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{m.is_location_hidden ? '🛡️' : '📍'}</span>
                        <span style={{ color: m.is_location_hidden ? '#fae8a4' : '#cbd5e0' }}>
                          {m.is_location_hidden ? 'Protected Location' : `${m.city}${m.state ? `, ${m.state}` : ''}`}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🕉️</span>
                        <span>{m.religion}{m.caste ? ` • ${m.caste}` : ''}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🎓</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.education}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>💼</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.profession}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>💰</span>
                        <span style={{ color: m.annualIncomeFormatted === 'Confidential' ? '#9cb1a6' : '#fae8a4', fontWeight: '600' }}>
                          {m.annualIncomeFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Snippet from Bio */}
                    {m.about_me && (
                      <p
                        style={{
                          fontSize: '12px',
                          color: '#cbd5e0',
                          marginTop: '10px',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontStyle: 'italic',
                        }}
                      >
                        &ldquo;{m.about_me}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenProfileModal(m.id)}
                      style={{
                        padding: '9px 0',
                        borderRadius: '8px',
                        background: 'rgba(229,193,88,0.12)',
                        border: '1px solid #e5c158',
                        color: '#e5c158',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      👁️ View Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleShortlist(m.id)}
                      style={{
                        padding: '9px 0',
                        borderRadius: '8px',
                        background: m.is_shortlisted ? 'rgba(230,0,92,0.2)' : 'rgba(255,255,255,0.08)',
                        border: m.is_shortlisted ? '1px solid #ff2a73' : '1px solid rgba(255,255,255,0.2)',
                        color: m.is_shortlisted ? '#ffb3c6' : '#fff',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      {m.is_shortlisted ? '❤️ Shortlisted' : '🤍 Shortlist'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= FULL PROFILE DETAILS MODAL / DRAWER ================= */}
      {selectedProfileId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedProfileId(null)}
        >
          <div
            style={{
              background: '#062a1c',
              border: '1px solid #e5c158',
              borderRadius: '24px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              position: 'relative',
              padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedProfileId(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>

            {modalLoading || !profileModalData ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#9cb1a6' }}>
                Loading comprehensive matrimonial profile...
              </div>
            ) : (
              <div>
                {/* Modal Header */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ width: '110px', height: '110px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #e5c158', background: '#031710', flexShrink: 0 }}>
                    {profileModalData.is_photo_hidden || !profileModalData.primary_photo ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px', color: '#e5c158' }}>
                        🛡️
                      </div>
                    ) : (
                      <img src={profileModalData.primary_photo} alt={profileModalData.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0 }}>
                        {profileModalData.name}
                      </h2>
                      {profileModalData.is_verified && (
                        <span style={{ fontSize: '11px', background: 'rgba(56,161,105,0.2)', color: '#9ae6b4', border: '1px solid #38a169', padding: '2px 8px', borderRadius: '9999px', fontWeight: '700' }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: '#e5c158', margin: '4px 0 0 0', fontWeight: '600' }}>
                      {profileModalData.age} years old • {profileModalData.heightFormatted} • {profileModalData.is_location_hidden ? '🛡️ Location Protected' : `${profileModalData.city}${profileModalData.state ? `, ${profileModalData.state}` : ''}`}
                    </p>
                    <p style={{ fontSize: '12.5px', color: '#9cb1a6', margin: '3px 0 0 0' }}>
                      {profileModalData.profession} {profileModalData.company ? `at ${profileModalData.company}` : ''}
                    </p>
                  </div>

                  {/* Compatibility Badge */}
                  <div style={{ textAlign: 'right', background: 'rgba(229,193,88,0.12)', border: '1px solid rgba(229,193,88,0.35)', padding: '12px 18px', borderRadius: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#fae8a4', textTransform: 'uppercase', fontWeight: '800' }}>Compatibility</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#e5c158' }}>
                      {profileModalData.match_score}
                    </div>
                  </div>
                </div>

                {/* Compatibility Factors Breakdown */}
                {profileModalData.compatibility?.breakdown && (
                  <div style={{ background: '#031710', borderRadius: '14px', padding: '16px', border: '1px solid rgba(229,193,88,0.2)', marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#e5c158', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px 0' }}>
                      Compatibility Factor Analysis
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                      {profileModalData.compatibility.breakdown.map((f: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '12px', background: '#062a1c', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: '600' }}>
                            <span>{f.factor}</span>
                            <span style={{ color: f.matched ? '#9ae6b4' : '#e5c158' }}>{f.matched ? '✓' : '~'}</span>
                          </div>
                          <div style={{ color: '#9cb1a6', fontSize: '11px', marginTop: '2px' }}>{f.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* About Me */}
                {profileModalData.about_me && (
                  <div style={{ marginBottom: '18px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: '0 0 6px 0' }}>About Me</h4>
                    <p style={{ fontSize: '13px', color: '#cbd5e0', lineHeight: 1.6, margin: 0, background: '#031710', padding: '14px', borderRadius: '10px' }}>
                      {profileModalData.about_me}
                    </p>
                  </div>
                )}

                {/* Detailed Information Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  {/* Community & Religion */}
                  <div style={{ background: '#031710', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '11px', color: '#e5c158', fontWeight: '700', textTransform: 'uppercase' }}>Community</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#fff' }}>
                      {profileModalData.religion} • {profileModalData.caste || 'Caste open'} {profileModalData.sub_caste ? `(${profileModalData.sub_caste})` : ''}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9cb1a6' }}>
                      Mother tongue: {profileModalData.mother_tongue}
                    </p>
                  </div>

                  {/* Education & Career */}
                  <div style={{ background: '#031710', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '11px', color: '#e5c158', fontWeight: '700', textTransform: 'uppercase' }}>Education & Career</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#fff' }}>
                      {profileModalData.education} {profileModalData.college ? `(${profileModalData.college})` : ''}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9cb1a6' }}>
                      {profileModalData.profession} • {profileModalData.annual_income_formatted}
                    </p>
                  </div>

                  {/* Lifestyle & Diet */}
                  <div style={{ background: '#031710', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '11px', color: '#e5c158', fontWeight: '700', textTransform: 'uppercase' }}>Lifestyle</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#fff' }}>
                      Diet: {profileModalData.diet}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9cb1a6' }}>
                      Smoking: {profileModalData.smoking} • Drinking: {profileModalData.drinking}
                    </p>
                  </div>

                  {/* Family Background */}
                  <div style={{ background: '#031710', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '11px', color: '#e5c158', fontWeight: '700', textTransform: 'uppercase' }}>Family Background</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#fff' }}>
                      {profileModalData.family_type} Family • {profileModalData.family_values}
                    </p>
                    {profileModalData.father_occupation && (
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9cb1a6' }}>
                        Father: {profileModalData.father_occupation}
                      </p>
                    )}
                  </div>

                  {/* Contact & Member Privacy */}
                  <div style={{ background: '#031710', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#e5c158', fontWeight: '700', textTransform: 'uppercase' }}>Contact & Privacy</span>
                      {profileModalData.is_owner && (
                        <span style={{ fontSize: '10px', color: '#9ae6b4', background: 'rgba(56,161,105,0.2)', padding: '1px 6px', borderRadius: '4px' }}>
                          Your Profile ({profileModalData.profile_visibility})
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📞</span>
                      <span>{profileModalData.phone || 'Protected'}</span>
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: '#9cb1a6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✉️</span>
                      <span>{profileModalData.email || 'Protected'}</span>
                    </p>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleShortlist(profileModalData.id)}
                    style={{
                      padding: '11px 22px',
                      borderRadius: '8px',
                      background: profileModalData.is_shortlisted ? 'rgba(230,0,92,0.2)' : 'rgba(255,255,255,0.1)',
                      border: profileModalData.is_shortlisted ? '1px solid #ff2a73' : '1px solid rgba(255,255,255,0.25)',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {profileModalData.is_shortlisted ? '❤️ Shortlisted' : '🤍 Shortlist Profile'}
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleSendInterest(profileModalData.id, profileModalData.name)}
                      disabled={interestSentIds.has(profileModalData.id)}
                      style={{
                        padding: '11px 28px',
                        borderRadius: '9999px',
                        background: interestSentIds.has(profileModalData.id)
                          ? '#38a169'
                          : 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontSize: '13.5px',
                        fontWeight: '800',
                        border: 'none',
                        cursor: interestSentIds.has(profileModalData.id) ? 'default' : 'pointer',
                        boxShadow: '0 4px 14px rgba(230,0,92,0.4)',
                      }}
                    >
                      {interestSentIds.has(profileModalData.id) ? '✓ Interest Sent' : 'Send Interest 💖'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
