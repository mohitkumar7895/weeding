'use client';

import React, { useState, useEffect } from 'react';

export interface ShortlistedProfile {
  id: string;
  profile_id: string;
  shortlist_id: string;
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
  annual_income: number | null;
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
  is_shortlisted: boolean;
  shortlisted_at: string;
}

interface CustomerShortlistSectionProps {
  onNavigateToSearch?: () => void;
  onNavigateToMatches?: () => void;
}

export default function CustomerShortlistSection({
  onNavigateToSearch,
  onNavigateToMatches,
}: CustomerShortlistSectionProps) {
  const [shortlists, setShortlists] = useState<ShortlistedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Profile View Modal
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileModalData, setProfileModalData] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Block Modal
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string; userId?: string } | null>(null);
  const [blockReason, setBlockReason] = useState('Not a compatible match');
  const [blockLoading, setBlockLoading] = useState(false);

  // Report Modal
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string; userId?: string } | null>(null);
  const [reportCategory, setReportCategory] = useState<'ABUSE' | 'FRAUD' | 'IMPERSONATION'>('ABUSE');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchShortlist();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchShortlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/shortlist');
      const data = await res.json();
      if (data.success && Array.isArray(data.shortlists)) {
        setShortlists(data.shortlists);
      } else {
        setError(data.message || 'Failed to load shortlisted profiles.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shortlist');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShortlist = async (profileId: string) => {
    // Optimistic removal
    setShortlists((prev) => prev.filter((p) => p.id !== profileId));
    if (selectedProfileId === profileId) {
      setSelectedProfileId(null);
      setProfileModalData(null);
    }

    try {
      const res = await fetch(`/api/customer/shortlist?target_profile_id=${profileId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Profile removed from your shortlist.');
      } else {
        fetchShortlist(); // Rollback
        showToast(data.message || 'Failed to remove from shortlist');
      }
    } catch {
      fetchShortlist();
      showToast('Network error while removing from shortlist.');
    }
  };

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

  const handleConfirmBlock = async () => {
    if (!blockTarget) return;
    setBlockLoading(true);
    try {
      const res = await fetch('/api/customer/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_profile_id: blockTarget.id,
          target_user_id: blockTarget.userId,
          reason: blockReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Blocked ${blockTarget.name}. They will no longer appear in your searches or matches.`);
        // Remove from current shortlist
        setShortlists((prev) => prev.filter((p) => p.id !== blockTarget.id));
        setBlockTarget(null);
        if (selectedProfileId === blockTarget.id) {
          setSelectedProfileId(null);
          setProfileModalData(null);
        }
      } else {
        showToast(data.message || 'Failed to block user');
      }
    } catch {
      showToast('Network error while blocking member.');
    } finally {
      setBlockLoading(false);
    }
  };

  const handleConfirmReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    setReportLoading(true);
    try {
      const res = await fetch('/api/customer/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_profile_id: reportTarget.id,
          reported_user_id: reportTarget.userId,
          category: reportCategory,
          description: reportDescription,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Report submitted. Our Trust & Safety team will review this profile immediately.');
        setReportTarget(null);
        setReportDescription('');
      } else {
        showToast(data.message || 'Failed to submit report');
      }
    } catch {
      showToast('Network error while submitting report.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #0d1e16 0%, #06140e 100%)',
            border: '1.5px solid #e5c158',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 8px 30px rgba(0,0,0,0.6), 0 0 15px rgba(229,193,88,0.3)',
            zIndex: 9999,
          }}
        >
          ✨ {toast}
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0a1f16 0%, #04100b 100%)',
          border: '1px solid rgba(229, 193, 88, 0.25)',
          borderRadius: '18px',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '24px' }}>💖</span>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
              My Shortlisted Profiles
            </h1>
            <span
              style={{
                fontSize: '12px',
                background: 'rgba(255, 42, 115, 0.2)',
                color: '#ff6b9d',
                border: '1px solid rgba(255, 42, 115, 0.35)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontWeight: 700,
              }}
            >
              {shortlists.length} Saved
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#9cb1a6', margin: 0 }}>
            Curated collection of matrimonial matches you've saved for consideration and family review.
          </p>
        </div>

        <button
          onClick={fetchShortlist}
          disabled={loading}
          style={{
            padding: '10px 18px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            color: '#e5c158',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh Shortlist'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(230,0,92,0.15)', border: '1px solid #e6005c', color: '#ffb3c6', padding: '14px 18px', borderRadius: '10px', fontSize: '14px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#9cb1a6' }}>
          <div style={{ fontSize: '32px', marginBottom: '14px' }}>💖</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#e5c158' }}>Loading your shortlisted profiles...</div>
        </div>
      ) : shortlists.length === 0 ? (
        /* Empty State */
        <div
          style={{
            background: '#04100b',
            border: '1px dashed rgba(229,193,88,0.3)',
            borderRadius: '20px',
            padding: '50px 30px',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '20px auto',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💌</div>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
            No Shortlisted Profiles Yet
          </h3>
          <p style={{ fontSize: '14px', color: '#9cb1a6', lineHeight: '1.6', marginBottom: '24px' }}>
            You haven't added any matrimonial profiles to your shortlist. Explore high-compatibility candidates from your Matches or use Advanced Search with specific community and location filters.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {onNavigateToMatches && (
              <button
                onClick={onNavigateToMatches}
                style={{
                  padding: '12px 22px',
                  background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(230,0,92,0.4)',
                }}
              >
                💍 Browse Best Matches
              </button>
            )}
            {onNavigateToSearch && (
              <button
                onClick={onNavigateToSearch}
                style={{
                  padding: '12px 22px',
                  background: 'rgba(229,193,88,0.12)',
                  border: '1px solid rgba(229,193,88,0.35)',
                  color: '#e5c158',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                🔍 Search Profiles
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Profiles Cards Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '22px' }}>
          {shortlists.map((p) => (
            <div
              key={p.id}
              style={{
                background: 'linear-gradient(180deg, #091a13 0%, #04100b 100%)',
                border: '1px solid rgba(229, 193, 88, 0.25)',
                borderRadius: '18px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                transition: 'all 0.25s ease',
              }}
            >
              {/* Photo Area */}
              <div style={{ height: '230px', position: 'relative', background: '#020905' }}>
                <img
                  src={p.photo_url || '/images/priya.jpg'}
                  alt={p.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: p.is_photo_hidden ? 'blur(16px)' : 'none',
                  }}
                />
                {p.is_photo_hidden && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.4)',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>🔒</span>
                    <span style={{ fontSize: '11px', color: '#fae8a4', fontWeight: 600 }}>Photo Protected</span>
                  </div>
                )}

                {/* Top Badges */}
                <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {p.is_verified && (
                    <span
                      style={{
                        background: 'rgba(3, 23, 16, 0.85)',
                        backdropFilter: 'blur(8px)',
                        color: '#48bb78',
                        border: '1px solid rgba(72,187,120,0.4)',
                        padding: '4px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      ✓ Verified Member
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveShortlist(p.id)}
                    title="Remove from Shortlist"
                    style={{
                      background: 'rgba(230,0,92,0.85)',
                      backdropFilter: 'blur(8px)',
                      color: '#fff',
                      border: 'none',
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '16px',
                      boxShadow: '0 4px 12px rgba(230,0,92,0.4)',
                      marginLeft: 'auto',
                    }}
                  >
                    ❤️
                  </button>
                </div>

                {/* Bottom Overlay Gradient */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '70px',
                    background: 'linear-gradient(180deg, transparent 0%, rgba(9,26,19,0.95) 100%)',
                  }}
                />
              </div>

              {/* Card Body */}
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '0 0 4px 0' }}>
                    {p.name}, {p.age}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#e5c158', fontWeight: 600 }}>
                    {p.profession} {p.company ? `at ${p.company}` : ''}
                  </div>
                </div>

                {/* Attributes Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#cbd5e0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📍</span> {p.city}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📏</span> {p.heightFormatted}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🪔</span> {p.religion} {p.caste ? `• ${p.caste}` : ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🎓</span> {p.education}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', gridColumn: 'span 2' }}>
                    <span>💰</span> Income: {p.annualIncomeFormatted}
                  </div>
                </div>

                {/* Shortlist Timestamp */}
                <div style={{ fontSize: '11px', color: '#718096', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', marginTop: 'auto' }}>
                  Shortlisted on {new Date(p.shortlisted_at).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    onClick={() => handleOpenProfileModal(p.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(230,0,92,0.3)',
                    }}
                  >
                    View Full Profile 👤
                  </button>
                  <button
                    onClick={() => handleRemoveShortlist(p.id)}
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#cbd5e0',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                    title="Remove from Shortlist"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= PROFILE VIEW MODAL ================= */}
      {selectedProfileId && profileModalData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
          onClick={() => setSelectedProfileId(null)}
        >
          <div
            style={{
              background: '#0a1611',
              border: '1.5px solid #e5c158',
              borderRadius: '20px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0 }}>
                  {profileModalData.name}, {profileModalData.age}
                </h2>
                <div style={{ fontSize: '13px', color: '#e5c158', marginTop: '2px', fontWeight: 600 }}>
                  {profileModalData.profession} • {profileModalData.city}
                </div>
              </div>
              <button
                onClick={() => setSelectedProfileId(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Profile Photos Row */}
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '6px' }}>
              {profileModalData.photos && profileModalData.photos.length > 0 ? (
                profileModalData.photos.map((url: string, idx: number) => (
                  <img
                    key={idx}
                    src={url}
                    alt=""
                    style={{
                      width: '130px',
                      height: '160px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      border: '1px solid rgba(229,193,88,0.3)',
                    }}
                  />
                ))
              ) : (
                <img
                  src={profileModalData.primary_photo || '/images/priya.jpg'}
                  alt=""
                  style={{
                    width: '130px',
                    height: '160px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    filter: profileModalData.is_photo_hidden ? 'blur(12px)' : 'none',
                  }}
                />
              )}
            </div>

            {/* About Me */}
            {profileModalData.about_me && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#e5c158', fontWeight: 700, marginBottom: '6px' }}>ABOUT MEMBER</div>
                <div style={{ fontSize: '13.5px', color: '#cbd5e0', lineHeight: '1.6' }}>{profileModalData.about_me}</div>
              </div>
            )}

            {/* Detailed Key Factors */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px', fontSize: '13px' }}>
              <div style={{ background: '#05140d', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#9cb1a6' }}>Religion & Caste:</span>{' '}
                <strong style={{ color: '#fff' }}>{profileModalData.religion} {profileModalData.caste ? `(${profileModalData.caste})` : ''}</strong>
              </div>
              <div style={{ background: '#05140d', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#9cb1a6' }}>Height:</span>{' '}
                <strong style={{ color: '#fff' }}>{profileModalData.heightFormatted}</strong>
              </div>
              <div style={{ background: '#05140d', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#9cb1a6' }}>Education:</span>{' '}
                <strong style={{ color: '#fff' }}>{profileModalData.education}</strong>
              </div>
              <div style={{ background: '#05140d', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#9cb1a6' }}>Income:</span>{' '}
                <strong style={{ color: '#48bb78' }}>{profileModalData.annual_income_formatted || profileModalData.annualIncomeFormatted}</strong>
              </div>
              <div style={{ background: '#05140d', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#9cb1a6' }}>Marital Status:</span>{' '}
                <strong style={{ color: '#fff' }}>{profileModalData.marital_status}</strong>
              </div>
              <div style={{ background: '#05140d', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#9cb1a6' }}>Diet / Lifestyle:</span>{' '}
                <strong style={{ color: '#fff' }}>{profileModalData.diet}</strong>
              </div>
            </div>

            {/* Footer Action Strip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setBlockTarget({ id: profileModalData.id, name: profileModalData.name, userId: profileModalData.userId });
                  }}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(230,0,92,0.12)',
                    border: '1px solid rgba(230,0,92,0.3)',
                    color: '#ff6b9d',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🚫 Block Member
                </button>
                <button
                  onClick={() => {
                    setReportTarget({ id: profileModalData.id, name: profileModalData.name, userId: profileModalData.userId });
                  }}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#cbd5e0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ⚠️ Report Profile
                </button>
              </div>

              <button
                onClick={() => handleRemoveShortlist(profileModalData.id)}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(230,0,92,0.2)',
                  border: '1px solid #ff2a73',
                  color: '#ffb3c6',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                💔 Remove from Shortlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BLOCK CONFIRMATION MODAL ================= */}
      {blockTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1100,
          }}
          onClick={() => setBlockTarget(null)}
        >
          <div
            style={{
              background: '#0a1611',
              border: '1.5px solid #ff2a73',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🚫</div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
              Block {blockTarget.name}?
            </h3>
            <p style={{ fontSize: '13px', color: '#cbd5e0', lineHeight: '1.6', marginBottom: '16px' }}>
              Are you sure you want to block this member? Once blocked, they will be removed from your Shortlist, and neither of you will see each other in Search Results, Matches, or Recommendations.
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                REASON FOR BLOCKING (CONFIDENTIAL)
              </label>
              <select
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#031710',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              >
                <option value="Not a compatible match">Not a compatible match</option>
                <option value="Inappropriate communication">Inappropriate communication</option>
                <option value="Unwanted contact or harassment">Unwanted contact or harassment</option>
                <option value="Suspicious or fake profile">Suspicious or fake profile</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setBlockTarget(null)}
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
                onClick={handleConfirmBlock}
                disabled={blockLoading}
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
                {blockLoading ? 'Blocking...' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REPORT PROFILE MODAL ================= */}
      {reportTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1100,
          }}
          onClick={() => setReportTarget(null)}
        >
          <div
            style={{
              background: '#0a1611',
              border: '1.5px solid rgba(229,193,88,0.5)',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '30px', marginBottom: '8px' }}>⚠️</div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
              Report {reportTarget.name}'s Profile
            </h3>
            <p style={{ fontSize: '12.5px', color: '#9cb1a6', lineHeight: '1.5', marginBottom: '16px' }}>
              Help us maintain a safe, trusted matrimonial community. Reports are strictly confidential and investigated by our Trust & Safety Team.
            </p>

            <form onSubmit={handleConfirmReport}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 700, marginBottom: '8px' }}>
                  REASON FOR REPORT *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { val: 'ABUSE', label: 'Harassment or Inappropriate Behavior', desc: 'Offensive language, abusive messages, or misconduct' },
                    { val: 'FRAUD', label: 'Financial Fraud or Solicitation', desc: 'Asking for money, commercial sales, or scam activities' },
                    { val: 'IMPERSONATION', label: 'Fake Identity or Impersonation', desc: 'Stolen photographs, fake credentials, or false claims' },
                  ].map((cat) => (
                    <label
                      key={cat.val}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: reportCategory === cat.val ? 'rgba(229,193,88,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${reportCategory === cat.val ? '#e5c158' : 'rgba(255,255,255,0.08)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="reportCategory"
                        value={cat.val}
                        checked={reportCategory === cat.val}
                        onChange={() => setReportCategory(cat.val as any)}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{cat.label}</div>
                        <div style={{ fontSize: '11px', color: '#9cb1a6' }}>{cat.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 700, marginBottom: '6px' }}>
                  ADDITIONAL DETAILS (OPTIONAL)
                </label>
                <textarea
                  rows={3}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide any specific context, messages, or details that help our investigation..."
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
                  onClick={() => setReportTarget(null)}
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
                  type="submit"
                  disabled={reportLoading}
                  style={{
                    padding: '10px 22px',
                    background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {reportLoading ? 'Submitting...' : 'Submit Confidential Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
