'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export interface SearchProfileCard {
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
  profile_visibility?: string;
}

export interface SavedSearchItem {
  id: string;
  name: string;
  criteria: any;
  created_at: string;
  updated_at: string;
}

const RELIGIONS = ['Any', 'Hindu', 'Muslim', 'Sikh', 'Christian', 'Jain', 'Buddhist', 'Parsi', 'Jewish', 'Other'];
const MARITAL_STATUSES = ['Any', 'Never Married', 'Divorced', 'Widowed', 'Separated'];
const EDUCATION_LEVELS = ['Any', 'Doctorate', 'Post Graduate', 'Graduate', 'Diploma', 'School', 'Other'];
const PROFESSIONS = ['Any', 'Private', 'Government', 'Business', 'Self-employed', 'Professional', 'Student', 'Other'];

export default function CustomerSearchSection({ initialSubTab = 'search' }: { initialSubTab?: 'search' | 'saved' }) {
  const [subTab, setSubTab] = useState<'search' | 'saved'>(initialSubTab);

  // Filter States
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  const [religion, setReligion] = useState<string>('Any');
  const [caste, setCaste] = useState<string>('');
  const [subCaste, setSubCaste] = useState<string>('');
  const [maritalStatus, setMaritalStatus] = useState<string>('Any');
  const [education, setEducation] = useState<string>('Any');
  const [profession, setProfession] = useState<string>('Any');
  const [minIncome, setMinIncome] = useState<string>('');
  const [maxIncome, setMaxIncome] = useState<string>('');
  const [minHeight, setMinHeight] = useState<string>('');
  const [maxHeight, setMaxHeight] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');

  // Sorting
  const [sort, setSort] = useState<string>('best_match');

  // Search Data State
  const [results, setResults] = useState<SearchProfileCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(true);

  // Saved Searches
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [savedLoading, setSavedLoading] = useState<boolean>(false);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [saveSearchName, setSaveSearchName] = useState<string>('');
  const [editSavedSearchId, setEditSavedSearchId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Profile Detail Modal
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileModalData, setProfileModalData] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [interestSentIds, setInterestSentIds] = useState<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };
  const setToastMessage = (msg: string | null) => setToast(msg);

  // Trigger search on filter / sort changes
  useEffect(() => {
    if (subTab === 'search') {
      executeSearch();
    }
  }, [sort, subTab]);

  // Load saved searches when entering saved searches tab
  useEffect(() => {
    if (subTab === 'saved') {
      fetchSavedSearches();
    }
  }, [subTab]);

  // Perform live API search
  const executeSearch = async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();

      const fMinAge = overrides?.min_age !== undefined ? overrides.min_age : minAge;
      const fMaxAge = overrides?.max_age !== undefined ? overrides.max_age : maxAge;
      const fReligion = overrides?.religion !== undefined ? overrides.religion : religion;
      const fCaste = overrides?.caste !== undefined ? overrides.caste : caste;
      const fSubCaste = overrides?.sub_caste !== undefined ? overrides.sub_caste : subCaste;
      const fMaritalStatus = overrides?.marital_status !== undefined ? overrides.marital_status : maritalStatus;
      const fEducation = overrides?.education !== undefined ? overrides.education : education;
      const fProfession = overrides?.profession !== undefined ? overrides.profession : profession;
      const fMinIncome = overrides?.min_income !== undefined ? overrides.min_income : minIncome;
      const fMaxIncome = overrides?.max_income !== undefined ? overrides.max_income : maxIncome;
      const fMinHeight = overrides?.min_height !== undefined ? overrides.min_height : minHeight;
      const fMaxHeight = overrides?.max_height !== undefined ? overrides.max_height : maxHeight;
      const fCountry = overrides?.country !== undefined ? overrides.country : country;
      const fState = overrides?.state !== undefined ? overrides.state : state;
      const fCity = overrides?.city !== undefined ? overrides.city : city;
      const fKeyword = overrides?.keyword !== undefined ? overrides.keyword : keyword;
      const fSort = overrides?.sort !== undefined ? overrides.sort : sort;

      if (fMinAge) params.set('min_age', fMinAge);
      if (fMaxAge) params.set('max_age', fMaxAge);
      if (fReligion && fReligion !== 'Any') params.set('religion', fReligion);
      if (fCaste.trim()) params.set('caste', fCaste.trim());
      if (fSubCaste.trim()) params.set('sub_caste', fSubCaste.trim());
      if (fMaritalStatus && fMaritalStatus !== 'Any') params.set('marital_status', fMaritalStatus);
      if (fEducation && fEducation !== 'Any') params.set('education', fEducation);
      if (fProfession && fProfession !== 'Any') params.set('profession', fProfession);
      if (fMinIncome) params.set('min_income', String(parseFloat(fMinIncome) * 100000));
      if (fMaxIncome) params.set('max_income', String(parseFloat(fMaxIncome) * 100000));
      if (fMinHeight) params.set('min_height', fMinHeight);
      if (fMaxHeight) params.set('max_height', fMaxHeight);
      if (fCountry.trim()) params.set('country', fCountry.trim());
      if (fState.trim()) params.set('state', fState.trim());
      if (fCity.trim()) params.set('city', fCity.trim());
      if (fKeyword.trim()) params.set('keyword', fKeyword.trim());
      if (fSort) params.set('sort', fSort);

      const res = await fetch(`/api/customer/search?${params.toString()}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setResults(json.data);
      } else {
        setError(json.message || 'Failed to fetch search results.');
      }
    } catch (err: any) {
      console.error('Search request failed:', err);
      setError('Network connection error while executing search.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    setMinAge('');
    setMaxAge('');
    setReligion('Any');
    setCaste('');
    setSubCaste('');
    setMaritalStatus('Any');
    setEducation('Any');
    setProfession('Any');
    setMinIncome('');
    setMaxIncome('');
    setMinHeight('');
    setMaxHeight('');
    setCountry('');
    setState('');
    setCity('');
    setKeyword('');
    setSort('best_match');

    // Run clean search immediately
    executeSearch({
      min_age: '',
      max_age: '',
      religion: 'Any',
      caste: '',
      sub_caste: '',
      marital_status: 'Any',
      education: 'Any',
      profession: 'Any',
      min_income: '',
      max_income: '',
      min_height: '',
      max_height: '',
      country: '',
      state: '',
      city: '',
      keyword: '',
      sort: 'best_match',
    });
  };

  // Fetch Saved Searches List
  const fetchSavedSearches = async () => {
    setSavedLoading(true);
    try {
      const res = await fetch('/api/customer/saved-searches');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSavedSearches(data.data);
      }
    } catch {
      showToast('Could not load saved searches.');
    } finally {
      setSavedLoading(false);
    }
  };

  // Save Current Filter Configuration
  const handleSaveSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveSearchName.trim()) return;

    const criteria = {
      min_age: minAge || null,
      max_age: maxAge || null,
      religion: religion !== 'Any' ? religion : null,
      caste: caste.trim() || null,
      sub_caste: subCaste.trim() || null,
      marital_status: maritalStatus !== 'Any' ? maritalStatus : null,
      education: education !== 'Any' ? education : null,
      profession: profession !== 'Any' ? profession : null,
      min_income: minIncome || null,
      max_income: maxIncome || null,
      min_height: minHeight || null,
      max_height: maxHeight || null,
      country: country.trim() || null,
      state: state.trim() || null,
      city: city.trim() || null,
      keyword: keyword.trim() || null,
      sort,
    };

    try {
      if (editSavedSearchId) {
        // Update existing saved search
        const res = await fetch(`/api/customer/saved-searches/${editSavedSearchId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: saveSearchName.trim(), criteria }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Search "${saveSearchName.trim()}" updated successfully!`);
          fetchSavedSearches();
          setSaveModalOpen(false);
          setEditSavedSearchId(null);
          setSaveSearchName('');
        } else {
          showToast(data.message || 'Failed to update saved search.');
        }
      } else {
        // Create new saved search
        const res = await fetch('/api/customer/saved-searches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: saveSearchName.trim(), criteria }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Search "${saveSearchName.trim()}" saved to your account!`);
          fetchSavedSearches();
          setSaveModalOpen(false);
          setSaveSearchName('');
        } else {
          showToast(data.message || 'Failed to save search.');
        }
      }
    } catch {
      showToast('Error saving search criteria.');
    }
  };

  // Restore and execute a Saved Search against current live database data
  const handleApplySavedSearch = (savedItem: SavedSearchItem) => {
    const c = savedItem.criteria || {};
    setMinAge(c.min_age || '');
    setMaxAge(c.max_age || '');
    setReligion(c.religion || 'Any');
    setCaste(c.caste || '');
    setSubCaste(c.sub_caste || '');
    setMaritalStatus(c.marital_status || 'Any');
    setEducation(c.education || 'Any');
    setProfession(c.profession || 'Any');
    setMinIncome(c.min_income || '');
    setMaxIncome(c.max_income || '');
    setMinHeight(c.min_height || '');
    setMaxHeight(c.max_height || '');
    setCountry(c.country || '');
    setState(c.state || '');
    setCity(c.city || '');
    setKeyword(c.keyword || '');
    setSort(c.sort || 'best_match');

    setSubTab('search');
    showToast(`Loaded saved search "${savedItem.name}". Running live query...`);
    executeSearch({
      min_age: c.min_age || '',
      max_age: c.max_age || '',
      religion: c.religion || 'Any',
      caste: c.caste || '',
      sub_caste: c.sub_caste || '',
      marital_status: c.marital_status || 'Any',
      education: c.education || 'Any',
      profession: c.profession || 'Any',
      min_income: c.min_income || '',
      max_income: c.max_income || '',
      min_height: c.min_height || '',
      max_height: c.max_height || '',
      country: c.country || '',
      state: c.state || '',
      city: c.city || '',
      keyword: c.keyword || '',
      sort: c.sort || 'best_match',
    });
  };

  // Delete Saved Search
  const handleDeleteSavedSearch = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the saved search "${name}"?`)) return;
    try {
      const res = await fetch(`/api/customer/saved-searches/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Saved search deleted.');
        setSavedSearches((prev) => prev.filter((item) => item.id !== id));
      } else {
        showToast(data.message || 'Failed to delete saved search.');
      }
    } catch {
      showToast('Error deleting saved search.');
    }
  };

  // Toggle Shortlist action
  const handleToggleShortlist = async (profileId: string) => {
    const currentItem = results.find((m) => m.id === profileId);
    const nextState = !currentItem?.is_shortlisted;

    setResults((prev) =>
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
        setResults((prev) =>
          prev.map((m) => (m.id === profileId ? { ...m, is_shortlisted: !nextState } : m))
        );
        showToast(data.message || 'Failed to update shortlist');
      }
    } catch {
      setResults((prev) =>
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

  // Count active filters
  const activeFiltersCount = [
    minAge,
    maxAge,
    religion !== 'Any' ? religion : '',
    caste,
    subCaste,
    maritalStatus !== 'Any' ? maritalStatus : '',
    education !== 'Any' ? education : '',
    profession !== 'Any' ? profession : '',
    minIncome,
    maxIncome,
    minHeight,
    maxHeight,
    country,
    state,
    city,
    keyword,
  ].filter(Boolean).length;

  return (
    <div style={{ width: '100%', color: '#fff' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #031710 0%, #0c3827 100%)',
            border: '1px solid #e5c158',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '12px',
            fontSize: '13.5px',
            fontWeight: '600',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✨</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header & Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(3,23,16,0.9) 0%, rgba(6,42,28,0.7) 100%)',
          padding: '20px 24px',
          borderRadius: '16px',
          border: '1px solid rgba(229,193,88,0.25)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔍</span>
            <span>Customer Matrimonial Search</span>
          </h2>
          <p style={{ fontSize: '13px', color: '#9cb1a6', margin: '4px 0 0 0' }}>
            Multi-factor filtering across approved profiles with real-time MySQL query execution & privacy protection.
          </p>
        </div>

        {/* Tab Toggle Buttons */}
        <div style={{ display: 'flex', gap: '8px', background: '#031710', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={() => setSubTab('search')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: subTab === 'search' ? '700' : '500',
              background: subTab === 'search' ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'transparent',
              color: subTab === 'search' ? '#fff' : '#9cb1a6',
              boxShadow: subTab === 'search' ? '0 4px 12px rgba(230,0,92,0.35)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            🔍 Search Profiles
          </button>

          <button
            type="button"
            onClick={() => setSubTab('saved')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: subTab === 'saved' ? '700' : '500',
              background: subTab === 'saved' ? 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)' : 'transparent',
              color: subTab === 'saved' ? '#fff' : '#9cb1a6',
              boxShadow: subTab === 'saved' ? '0 4px 12px rgba(230,0,92,0.35)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            💾 Saved Searches {savedSearches.length > 0 && `(${savedSearches.length})`}
          </button>
        </div>
      </div>

      {/* ======================= TAB 1: SEARCH PROFILES ======================= */}
      {subTab === 'search' && (
        <div>
          {/* Collapsible Filter Panel */}
          <div
            style={{
              background: '#031710',
              border: '1px solid rgba(229,193,88,0.25)',
              borderRadius: '16px',
              marginBottom: '24px',
              overflow: 'hidden',
            }}
          >
            {/* Filter Panel Header */}
            <div
              style={{
                padding: '16px 20px',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: filtersOpen ? '1px solid rgba(255,255,255,0.06)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>⚡</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#e5c158', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Advanced Filters
                </span>
                {activeFiltersCount > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(255,42,115,0.2)',
                      border: '1px solid #ff2a73',
                      color: '#ffb3c6',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontWeight: '700',
                    }}
                  >
                    {activeFiltersCount} Active
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearAll();
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ffb3c6',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Clear All
                  </button>
                )}
                <span style={{ color: '#9cb1a6', fontSize: '14px' }}>
                  {filtersOpen ? '▲ Collapse' : '▼ Expand'}
                </span>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            {filtersOpen && (
              <div style={{ padding: '20px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px',
                    marginBottom: '20px',
                  }}
                >
                  {/* Keyword / Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '5px' }}>
                      KEYWORD / NAME
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Engineer, MBA, Delhi"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#062a1c',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Age Min & Max */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '5px' }}>
                      AGE RANGE (YEARS)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="number"
                        placeholder="Min (e.g. 21)"
                        value={minAge}
                        onChange={(e) => setMinAge(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          borderRadius: '8px',
                          background: '#062a1c',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#fff',
                          fontSize: '13px',
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Max (e.g. 35)"
                        value={maxAge}
                        onChange={(e) => setMaxAge(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          borderRadius: '8px',
                          background: '#062a1c',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#fff',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Religion */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '5px' }}>
                      RELIGION
                    </label>
                    <select
                      value={religion}
                      onChange={(e) => setReligion(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#062a1c',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    >
                      {RELIGIONS.map((r) => (
                        <option key={r} value={r} style={{ background: '#062a1c', color: '#fff' }}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Caste & Sub-caste */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '5px' }}>
                      CASTE / COMMUNITY
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Brahmin, Rajput, Yadav"
                      value={caste}
                      onChange={(e) => setCaste(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#062a1c',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Sub-caste */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '5px' }}>
                      SUB-CASTE
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Saraswat, Kanyakubja"
                      value={subCaste}
                      onChange={(e) => setSubCaste(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#062a1c',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Marital Status */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '5px' }}>
                      MARITAL STATUS
                    </label>
                    <select
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#062a1c',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    >
                      {MARITAL_STATUSES.map((m) => (
                        <option key={m} value={m} style={{ background: '#062a1c', color: '#fff' }}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Education */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '5px' }}>
                      EDUCATION
                    </label>
                    <select
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#062a1c',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    >
                      {EDUCATION_LEVELS.map((ed) => (
                        <option key={ed} value={ed} style={{ background: '#062a1c', color: '#fff' }}>
                          {ed}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Profession */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '5px' }}>
                      PROFESSION
                    </label>
                    <select
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#062a1c',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    >
                      {PROFESSIONS.map((pr) => (
                        <option key={pr} value={pr} style={{ background: '#062a1c', color: '#fff' }}>
                          {pr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Income Range (in Lakhs ₹) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '5px' }}>
                      ANNUAL INCOME (₹ LAKHS)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="number"
                        placeholder="Min (e.g. 5)"
                        value={minIncome}
                        onChange={(e) => setMinIncome(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          borderRadius: '8px',
                          background: '#062a1c',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#fff',
                          fontSize: '13px',
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Max (e.g. 40)"
                        value={maxIncome}
                        onChange={(e) => setMaxIncome(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          borderRadius: '8px',
                          background: '#062a1c',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#fff',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Height Range (in cm) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '5px' }}>
                      HEIGHT (CM)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="number"
                        placeholder="Min (e.g. 150)"
                        value={minHeight}
                        onChange={(e) => setMinHeight(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          borderRadius: '8px',
                          background: '#062a1c',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#fff',
                          fontSize: '13px',
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Max (e.g. 190)"
                        value={maxHeight}
                        onChange={(e) => setMaxHeight(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          borderRadius: '8px',
                          background: '#062a1c',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#fff',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </div>

                  {/* City */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '5px' }}>
                      CITY
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai, Delhi, Agra"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#062a1c',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '5px' }}>
                      STATE
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra, UP"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#062a1c',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                {/* Filter Actions: Apply & Save Search */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => executeSearch()}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '9999px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        fontSize: '13.5px',
                        fontWeight: '700',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(230,0,92,0.4)',
                      }}
                    >
                      Apply Filters & Search 🔍
                    </button>

                    <button
                      type="button"
                      onClick={handleClearAll}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '9999px',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '600',
                        border: '1px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer',
                      }}
                    >
                      Clear All
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditSavedSearchId(null);
                      setSaveSearchName('');
                      setSaveModalOpen(true);
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '9999px',
                      background: 'rgba(229,193,88,0.15)',
                      color: '#e5c158',
                      fontSize: '13px',
                      fontWeight: '700',
                      border: '1px solid #e5c158',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>💾</span>
                    <span>Save This Search Criteria</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Bar & Sorting Controls */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            <div>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>
                {loading ? 'Searching profiles...' : `${results.length} Eligible Matrimonial Profiles Found`}
              </span>
              {activeFiltersCount > 0 && (
                <span style={{ fontSize: '12.5px', color: '#9cb1a6', marginLeft: '8px' }}>
                  (Filtered by {activeFiltersCount} criteria)
                </span>
              )}
            </div>

            {/* Real Backend Sorting Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>SORT BY:</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#031710',
                  border: '1px solid #e5c158',
                  color: '#fae8a4',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <option value="best_match">✨ Best Match (Compatibility Score)</option>
                <option value="recently_added">🕒 Recently Added (Newest Profiles)</option>
                <option value="age_asc">👶 Age: Youngest First</option>
                <option value="age_desc">👴 Age: Oldest First</option>
                <option value="income_desc">💰 Income: High to Low</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {keyword && (
                <span style={filterChipStyle}>
                  Keyword: {keyword} <button onClick={() => { setKeyword(''); executeSearch({ keyword: '' }); }}>✕</button>
                </span>
              )}
              {(minAge || maxAge) && (
                <span style={filterChipStyle}>
                  Age: {minAge || '18'} - {maxAge || '70+'} yrs{' '}
                  <button onClick={() => { setMinAge(''); setMaxAge(''); executeSearch({ min_age: '', max_age: '' }); }}>✕</button>
                </span>
              )}
              {religion !== 'Any' && (
                <span style={filterChipStyle}>
                  Religion: {religion}{' '}
                  <button onClick={() => { setReligion('Any'); executeSearch({ religion: 'Any' }); }}>✕</button>
                </span>
              )}
              {caste && (
                <span style={filterChipStyle}>
                  Caste: {caste} <button onClick={() => { setCaste(''); executeSearch({ caste: '' }); }}>✕</button>
                </span>
              )}
              {subCaste && (
                <span style={filterChipStyle}>
                  Sub-caste: {subCaste} <button onClick={() => { setSubCaste(''); executeSearch({ sub_caste: '' }); }}>✕</button>
                </span>
              )}
              {maritalStatus !== 'Any' && (
                <span style={filterChipStyle}>
                  Marital: {maritalStatus}{' '}
                  <button onClick={() => { setMaritalStatus('Any'); executeSearch({ marital_status: 'Any' }); }}>✕</button>
                </span>
              )}
              {education !== 'Any' && (
                <span style={filterChipStyle}>
                  Education: {education}{' '}
                  <button onClick={() => { setEducation('Any'); executeSearch({ education: 'Any' }); }}>✕</button>
                </span>
              )}
              {profession !== 'Any' && (
                <span style={filterChipStyle}>
                  Profession: {profession}{' '}
                  <button onClick={() => { setProfession('Any'); executeSearch({ profession: 'Any' }); }}>✕</button>
                </span>
              )}
              {(minIncome || maxIncome) && (
                <span style={filterChipStyle}>
                  Income: ₹{minIncome || '0'} - {maxIncome || '50+'} L{' '}
                  <button onClick={() => { setMinIncome(''); setMaxIncome(''); executeSearch({ min_income: '', max_income: '' }); }}>✕</button>
                </span>
              )}
              {city && (
                <span style={filterChipStyle}>
                  City: {city} <button onClick={() => { setCity(''); executeSearch({ city: '' }); }}>✕</button>
                </span>
              )}
              {state && (
                <span style={filterChipStyle}>
                  State: {state} <button onClick={() => { setState(''); executeSearch({ state: '' }); }}>✕</button>
                </span>
              )}
            </div>
          )}

          {/* Results State */}
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9cb1a6' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              <p style={{ fontSize: '15px', fontWeight: '600' }}>Querying verified matrimonial profiles...</p>
            </div>
          ) : error ? (
            <div style={{ background: 'rgba(230,0,92,0.15)', border: '1px solid #ff2a73', color: '#ffb3c6', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          ) : results.length === 0 ? (
            /* Clean Empty State */
            <div
              style={{
                background: '#031710',
                border: '1px dashed rgba(229,193,88,0.3)',
                borderRadius: '16px',
                padding: '50px 20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔍</div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: '0 0 8px 0' }}>
                No Matching Profiles Found
              </h3>
              <p style={{ color: '#9cb1a6', fontSize: '13.5px', maxWidth: '480px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
                We could not find any active profiles matching all of your applied filters. Try broadening your criteria or clear specific filters.
              </p>
              <button
                type="button"
                onClick={handleClearAll}
                style={{
                  padding: '10px 22px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(230,0,92,0.4)',
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            /* Search Results Grid */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
              }}
            >
              {results.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: '#062a1c',
                    borderRadius: '16px',
                    border: '1px solid rgba(229,193,88,0.25)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  {/* Photo Container */}
                  <div style={{ position: 'relative', width: '100%', height: '230px', background: '#031710' }}>
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
                        <span style={{ fontSize: '42px' }}>🛡️</span>
                        <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#fae8a4' }}>
                          Photo Protected by Member
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#9cb1a6' }}>
                          Disclosed upon mutual consent
                        </span>
                      </div>
                    ) : (
                      <img
                        src={m.photo_url}
                        alt={m.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}

                    {/* Compatibility Pill */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                        color: '#fff',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>✨</span>
                      <span>{m.match_score}</span>
                    </div>

                    {/* Verification Badge */}
                    {m.is_verified && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(6, 42, 28, 0.9)',
                          border: '1px solid #38a169',
                          color: '#9ae6b4',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '10.5px',
                          fontWeight: '700',
                        }}
                      >
                        ✓ Verified
                      </div>
                    )}

                    {/* Shortlist Heart Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleShortlist(m.id)}
                      title={m.is_shortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: m.is_shortlisted ? '#ff2a73' : 'rgba(3, 23, 16, 0.85)',
                        border: '1px solid rgba(229,193,88,0.4)',
                        color: '#fff',
                        fontSize: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                      }}
                    >
                      {m.is_shortlisted ? '❤️' : '🤍'}
                    </button>
                  </div>

                  {/* Body Specs */}
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#fff', margin: 0 }}>
                          {m.name}
                        </h3>
                        <span style={{ fontSize: '13px', color: '#e5c158', fontWeight: '700' }}>
                          {m.age} yrs
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#9cb1a6', display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
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
                    </div>

                    {/* Actions Bar */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenProfileModal(m.id)}
                        style={{
                          padding: '8px 0',
                          borderRadius: '8px',
                          background: 'rgba(229,193,88,0.12)',
                          border: '1px solid #e5c158',
                          color: '#e5c158',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        👁️ View Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleShortlist(m.id)}
                        style={{
                          padding: '8px 0',
                          borderRadius: '8px',
                          background: m.is_shortlisted ? 'rgba(230,0,92,0.2)' : 'rgba(255,255,255,0.08)',
                          border: m.is_shortlisted ? '1px solid #ff2a73' : '1px solid rgba(255,255,255,0.2)',
                          color: m.is_shortlisted ? '#ffb3c6' : '#fff',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        {m.is_shortlisted ? '❤️ Shortlisted' : '🤍 Shortlist'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 2: SAVED SEARCHES ======================= */}
      {subTab === 'saved' && (
        <div>
          {savedLoading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9cb1a6' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              <p style={{ fontSize: '15px' }}>Loading your saved search configurations...</p>
            </div>
          ) : savedSearches.length === 0 ? (
            <div
              style={{
                background: '#031710',
                border: '1px dashed rgba(229,193,88,0.3)',
                borderRadius: '16px',
                padding: '50px 20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>💾</div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: '0 0 8px 0' }}>
                No Saved Searches Yet
              </h3>
              <p style={{ color: '#9cb1a6', fontSize: '13.5px', maxWidth: '480px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
                Save your ideal partner search criteria to quickly run live searches and discover newly matching profiles at any time.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('search')}
                style={{
                  padding: '10px 24px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(230,0,92,0.4)',
                }}
              >
                Go to Search Profiles 🔍
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {savedSearches.map((item) => {
                const c = item.criteria || {};
                const criteriaBadges: string[] = [];
                if (c.religion) criteriaBadges.push(`Religion: ${c.religion}`);
                if (c.caste) criteriaBadges.push(`Caste: ${c.caste}`);
                if (c.sub_caste) criteriaBadges.push(`Sub-caste: ${c.sub_caste}`);
                if (c.min_age || c.max_age) criteriaBadges.push(`Age: ${c.min_age || '18'}-${c.max_age || '70'}`);
                if (c.marital_status) criteriaBadges.push(`Status: ${c.marital_status}`);
                if (c.education) criteriaBadges.push(`Edu: ${c.education}`);
                if (c.profession) criteriaBadges.push(`Prof: ${c.profession}`);
                if (c.city) criteriaBadges.push(`City: ${c.city}`);
                if (c.min_income || c.max_income) criteriaBadges.push(`Income: ₹${c.min_income || '0'}-${c.max_income || '50+'}L`);

                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#062a1c',
                      borderRadius: '16px',
                      border: '1px solid rgba(229,193,88,0.25)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
                          {item.name}
                        </h3>
                        <span style={{ fontSize: '11px', color: '#9cb1a6', background: '#031710', padding: '3px 8px', borderRadius: '6px' }}>
                          {new Date(item.updated_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Criteria Badges */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '12px 0 16px 0' }}>
                        {criteriaBadges.length > 0 ? (
                          criteriaBadges.map((badge, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '11.5px',
                                background: 'rgba(229,193,88,0.12)',
                                border: '1px solid rgba(229,193,88,0.3)',
                                color: '#fae8a4',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                              }}
                            >
                              {badge}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#9cb1a6' }}>All profiles / Open criteria</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <button
                        type="button"
                        onClick={() => handleApplySavedSearch(item)}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                          color: '#fff',
                          fontSize: '12.5px',
                          fontWeight: '700',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Run Live Search 🔍
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditSavedSearchId(item.id);
                          setSaveSearchName(item.name);
                          setSaveModalOpen(true);
                        }}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#e5c158',
                          fontSize: '12.5px',
                          fontWeight: '600',
                          border: '1px solid rgba(229,193,88,0.3)',
                          cursor: 'pointer',
                        }}
                      >
                        Rename ✏️
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSavedSearch(item.id, item.name)}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: 'rgba(230,0,92,0.12)',
                          color: '#ffb3c6',
                          fontSize: '12.5px',
                          fontWeight: '600',
                          border: '1px solid #ff2a73',
                          cursor: 'pointer',
                        }}
                      >
                        Delete 🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: SAVE SEARCH CRITERIA ================= */}
      {saveModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSaveModalOpen(false)}
        >
          <div
            style={{
              background: '#062a1c',
              border: '1px solid #e5c158',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '26px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '0 0 6px 0' }}>
              {editSavedSearchId ? 'Rename Saved Search' : 'Save Current Search Configuration'}
            </h3>
            <p style={{ fontSize: '12.5px', color: '#9cb1a6', margin: '0 0 18px 0', lineHeight: 1.4 }}>
              Give this search a name to quickly re-run it against current database profiles at any time.
            </p>

            <form onSubmit={handleSaveSearchSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#e5c158', fontWeight: '700', marginBottom: '6px' }}>
                  SEARCH NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delhi NCR IT Professionals"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#031710',
                    border: '1px solid rgba(229,193,88,0.4)',
                    color: '#fff',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(230,0,92,0.4)',
                  }}
                >
                  {editSavedSearchId ? 'Update Search' : 'Save Search'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW FULL PROFILE DETAILS ================= */}
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

const filterChipStyle: React.CSSProperties = {
  fontSize: '12px',
  background: 'rgba(229,193,88,0.12)',
  border: '1px solid rgba(229,193,88,0.35)',
  color: '#fae8a4',
  padding: '4px 10px',
  borderRadius: '9999px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};
