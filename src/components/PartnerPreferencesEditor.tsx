'use client';

import React, { useState, useEffect } from 'react';

export interface PartnerPreferencesData {
  min_age: number;
  max_age: number;
  min_height_cm: number;
  max_height_cm: number;
  accepted_marital_status: string;
  preferred_religions: string;
  preferred_castes: string;
  preferred_sub_castes: string;
  preferred_educations: string;
  preferred_professions: string;
  min_income: number;
  preferred_country: string;
  preferred_state: string;
  preferred_city: string;
  preferred_diet: string;
  preferred_manglik: string;
  preferred_smoking: string;
  preferred_drinking: string;
  deal_breakers?: string;
}

interface PartnerPreferencesEditorProps {
  user?: any;
  onSaved?: (data: PartnerPreferencesData) => void;
}

// User-specified: Never Married, Divorced, Widowed, Separated, Any
const MARITAL_STATUS_OPTIONS = [
  'Never Married',
  'Divorced',
  'Widowed',
  'Separated',
  'Any',
];

// User-specified: School, Diploma, Graduate, Post Graduate, Doctorate, Other
const EDUCATION_OPTIONS = [
  'School',
  'Diploma',
  'Graduate',
  'Post Graduate',
  'Doctorate',
  'Other',
  'Any',
];

// User-specified: Government, Private, Business, Self-employed, Professional, Student, Any
const PROFESSION_OPTIONS = [
  'Government',
  'Private',
  'Business',
  'Self-employed',
  'Professional',
  'Student',
  'Any',
];

const RELIGION_OPTIONS = [
  'Any',
  'Hindu',
  'Muslim',
  'Sikh',
  'Christian',
  'Jain',
  'Buddhist',
  'Parsi',
  'Jewish',
  'Spiritual',
];

const COMMON_CASTES = [
  'Any / Open to all castes',
  'Brahmin',
  'Rajput / Kshatriya',
  'Agarwal / Vaishya',
  'Gupta / Banya',
  'Yadav / Ahir',
  'Khatri / Arora',
  'Maratha',
  'Jat',
  'Kayastha',
  'Nair',
  'Reddy',
  'Vokkaliga',
  'Lingayat',
  'Choudhary',
  'Mudaliar',
  'Iyer / Iyengar',
  'Other',
];

const HEIGHT_OPTIONS = [
  { cm: 140, label: `4'7" (140 cm)` },
  { cm: 145, label: `4'9" (145 cm)` },
  { cm: 150, label: `4'11" (150 cm)` },
  { cm: 152, label: `5'0" (152 cm)` },
  { cm: 155, label: `5'1" (155 cm)` },
  { cm: 157, label: `5'2" (157 cm)` },
  { cm: 160, label: `5'3" (160 cm)` },
  { cm: 163, label: `5'4" (163 cm)` },
  { cm: 165, label: `5'5" (165 cm)` },
  { cm: 168, label: `5'6" (168 cm)` },
  { cm: 170, label: `5'7" (170 cm)` },
  { cm: 173, label: `5'8" (173 cm)` },
  { cm: 175, label: `5'9" (175 cm)` },
  { cm: 178, label: `5'10" (178 cm)` },
  { cm: 180, label: `5'11" (180 cm)` },
  { cm: 183, label: `6'0" (183 cm)` },
  { cm: 185, label: `6'1" (185 cm)` },
  { cm: 188, label: `6'2" (188 cm)` },
  { cm: 193, label: `6'4" (193 cm)` },
  { cm: 198, label: `6'6" (198 cm)` },
];

const INCOME_OPTIONS = [
  { val: 0, label: 'Any / No Minimum Bar' },
  { val: 300000, label: '₹3 Lakhs & above' },
  { val: 500000, label: '₹5 Lakhs & above' },
  { val: 1000000, label: '₹10 Lakhs & above' },
  { val: 1500000, label: '₹15 Lakhs & above' },
  { val: 2500000, label: '₹25 Lakhs & above' },
  { val: 5000000, label: '₹50 Lakhs & above' },
  { val: 10000000, label: '₹1 Crore & above' },
];

export default function PartnerPreferencesEditor({ user, onSaved }: PartnerPreferencesEditorProps) {
  const [prefs, setPrefs] = useState<PartnerPreferencesData>({
    min_age: 21,
    max_age: 32,
    min_height_cm: 150,
    max_height_cm: 190,
    accepted_marital_status: 'Never Married',
    preferred_religions: 'Hindu',
    preferred_castes: 'Any',
    preferred_sub_castes: 'Any',
    preferred_educations: 'Graduate, Post Graduate',
    preferred_professions: 'Any',
    min_income: 0,
    preferred_country: 'India',
    preferred_state: 'Any',
    preferred_city: 'Any',
    preferred_diet: 'Any',
    preferred_manglik: 'Any',
    preferred_smoking: 'No',
    preferred_drinking: 'No',
    deal_breakers: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/preferences');
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setPrefs({
          min_age: Number(d.min_age) || 21,
          max_age: Number(d.max_age) || 32,
          min_height_cm: Number(d.min_height_cm) || 150,
          max_height_cm: Number(d.max_height_cm) || 190,
          accepted_marital_status: d.accepted_marital_status || 'Never Married',
          preferred_religions: d.preferred_religions || 'Hindu',
          preferred_castes: d.preferred_castes || 'Any',
          preferred_sub_castes: d.preferred_sub_castes || 'Any',
          preferred_educations: d.preferred_educations || 'Graduate, Post Graduate',
          preferred_professions: d.preferred_professions || 'Any',
          min_income: Number(d.min_income) || 0,
          preferred_country: d.preferred_country || 'India',
          preferred_state: d.preferred_state || 'Any',
          preferred_city: d.preferred_city || 'Any',
          preferred_diet: d.preferred_diet || 'Any',
          preferred_manglik: d.preferred_manglik || 'Any',
          preferred_smoking: d.preferred_smoking || 'No',
          preferred_drinking: d.preferred_drinking || 'No',
          deal_breakers: d.deal_breakers || '',
        });
      }
    } catch (err: any) {
      console.error('Failed to load partner preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof PartnerPreferencesData, value: any) => {
    setPrefs((prev) => ({ ...prev, [field]: value }));
  };

  // Toggle helpers for comma-separated chip lists
  const toggleChipSelection = (
    currentListStr: string,
    option: string,
    field: keyof PartnerPreferencesData
  ) => {
    if (option === 'Any') {
      handleFieldChange(field, 'Any');
      return;
    }

    const currentItems = currentListStr
      ? currentListStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    let updated: string[];
    if (currentItems.includes(option)) {
      updated = currentItems.filter((i) => i !== option);
    } else {
      updated = [...currentItems.filter((i) => i !== 'Any'), option];
    }

    if (updated.length === 0) {
      updated = ['Any'];
    }

    handleFieldChange(field, updated.join(', '));
  };

  const isSelected = (currentListStr: string, option: string) => {
    if (!currentListStr) return option === 'Any';
    const items = currentListStr.split(',').map((s) => s.trim().toLowerCase());
    return items.includes(option.toLowerCase());
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/customer/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess('Partner preferences saved successfully! Matrimonial compatibility ranking has been refreshed. 💖');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        if (onSaved) {
          onSaved(prefs);
        }
      } else {
        setError(json.message || 'Failed to save partner preferences.');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving partner preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#e5c158' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1.5s linear infinite' }}>❤️</div>
        <p style={{ fontSize: '15px', color: '#9cb1a6' }}>Loading your partner criteria preferences...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* Alert Banners */}
      {error && (
        <div style={{
          background: 'rgba(230,0,92,0.18)',
          border: '1px solid #ff2a73',
          color: '#ffb3c6',
          padding: '14px 18px',
          borderRadius: '12px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          background: 'rgba(56,161,105,0.18)',
          border: '1px solid #38a169',
          color: '#9ae6b4',
          padding: '14px 18px',
          borderRadius: '12px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {/* ================= HERO CARD ================= */}
      <div style={{
        background: 'linear-gradient(135deg, #031710 0%, #062a1c 100%)',
        border: '1px solid rgba(229,193,88,0.3)',
        borderRadius: '20px',
        padding: '28px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                background: 'rgba(255,42,115,0.15)',
                color: '#ff6b9d',
                border: '1px solid rgba(255,42,115,0.4)',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}>
                Section 6.3 Partner Criteria
              </span>
              {lastSavedTime && (
                <span style={{ fontSize: '12px', color: '#9cb1a6' }}>
                  Last saved at {lastSavedTime}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0 }}>
              Desired Partner Preferences
            </h2>
            <p style={{ fontSize: '13px', color: '#9cb1a6', margin: '4px 0 0 0', maxWidth: '620px' }}>
              Define your ideal partner profile. Our AI discovery engine and Ashtakoota Kundali compatibility algorithms will automatically prioritize candidates matching these criteria.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            style={primaryPinkBtnStyle}
          >
            {saving ? '⏳ Saving...' : '💾 Save Preferences'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* ================= 1. AGE & HEIGHT RANGES ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📏</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                1. Preferred Age & Height Ranges
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              {prefs.min_age} to {prefs.max_age} yrs • {prefs.min_height_cm}cm - {prefs.max_height_cm}cm
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {/* Min Age */}
            <div>
              <label style={labelStyle}>Minimum Age ({prefs.min_age} years)</label>
              <input
                type="number"
                min="18"
                max={prefs.max_age}
                value={prefs.min_age}
                onChange={(e) => handleFieldChange('min_age', Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            {/* Max Age */}
            <div>
              <label style={labelStyle}>Maximum Age ({prefs.max_age} years)</label>
              <input
                type="number"
                min={prefs.min_age}
                max="75"
                value={prefs.max_age}
                onChange={(e) => handleFieldChange('max_age', Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            {/* Min Height */}
            <div>
              <label style={labelStyle}>Minimum Height</label>
              <select
                value={prefs.min_height_cm}
                onChange={(e) => handleFieldChange('min_height_cm', Number(e.target.value))}
                style={inputStyle}
              >
                {HEIGHT_OPTIONS.map((h) => (
                  <option key={h.cm} value={h.cm}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Height */}
            <div>
              <label style={labelStyle}>Maximum Height</label>
              <select
                value={prefs.max_height_cm}
                onChange={(e) => handleFieldChange('max_height_cm', Number(e.target.value))}
                style={inputStyle}
              >
                {HEIGHT_OPTIONS.map((h) => (
                  <option key={h.cm} value={h.cm}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ================= 2. MARITAL STATUS PREFERENCE ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>💍</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                2. Preferred Marital Status
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Select all that apply
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#9cb1a6', margin: '0 0 14px 0' }}>
            Choose which marital statuses you are open to in prospective life partners:
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {MARITAL_STATUS_OPTIONS.map((status) => {
              const active = isSelected(prefs.accepted_marital_status, status);
              return (
                <button
                  type="button"
                  key={status}
                  onClick={() => toggleChipSelection(prefs.accepted_marital_status, status, 'accepted_marital_status')}
                  style={active ? activeChipStyle : inactiveChipStyle}
                >
                  {active ? '✓ ' : '+ '}
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= 3. RELIGION, CASTE & SUB-CASTE ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🕉️</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                3. Religion, Caste & Sub-caste Preferences
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Community Alignment
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {/* Religion */}
            <div>
              <label style={labelStyle}>Preferred Religion</label>
              <select
                value={prefs.preferred_religions}
                onChange={(e) => handleFieldChange('preferred_religions', e.target.value)}
                style={inputStyle}
              >
                {RELIGION_OPTIONS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
            </div>

            {/* Caste */}
            <div>
              <label style={labelStyle}>Preferred Caste / Community</label>
              <input
                type="text"
                list="prefCastesList"
                value={prefs.preferred_castes || ''}
                onChange={(e) => handleFieldChange('preferred_castes', e.target.value)}
                placeholder="e.g. Brahmin, Rajput, Yadav, or Any"
                style={inputStyle}
              />
              <datalist id="prefCastesList">
                {COMMON_CASTES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Sub-caste */}
            <div>
              <label style={labelStyle}>Preferred Sub-caste / Gotra</label>
              <input
                type="text"
                value={prefs.preferred_sub_castes || ''}
                onChange={(e) => handleFieldChange('preferred_sub_castes', e.target.value)}
                placeholder="e.g. Any, Kashyap, Bhardwaj, Garg"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* ================= 4. EDUCATION LEVEL PREFERENCE ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🎓</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                4. Preferred Education Level
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Academic Qualifications
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#9cb1a6', margin: '0 0 14px 0' }}>
            Select one or more education qualifications you prefer for your partner:
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {EDUCATION_OPTIONS.map((edu) => {
              const active = isSelected(prefs.preferred_educations, edu);
              return (
                <button
                  type="button"
                  key={edu}
                  onClick={() => toggleChipSelection(prefs.preferred_educations, edu, 'preferred_educations')}
                  style={active ? activeChipStyle : inactiveChipStyle}
                >
                  {active ? '✓ ' : '+ '}
                  {edu}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= 5. PROFESSION PREFERENCE ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>💼</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                5. Preferred Partner Profession
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Career & Employment Sector
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#9cb1a6', margin: '0 0 14px 0' }}>
            Select the employment fields you are seeking (as specified in WedWithMe Proposal 6.3):
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {PROFESSION_OPTIONS.map((prof) => {
              const active = isSelected(prefs.preferred_professions, prof);
              return (
                <button
                  type="button"
                  key={prof}
                  onClick={() => toggleChipSelection(prefs.preferred_professions, prof, 'preferred_professions')}
                  style={active ? activeChipStyle : inactiveChipStyle}
                >
                  {active ? '✓ ' : '+ '}
                  {prof}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= 6. FINANCIAL & INCOME EXPECTATION ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>💰</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                6. Annual Income Expectation
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Minimum Earnings Bar
            </span>
          </div>

          <div style={{ maxWidth: '480px' }}>
            <label style={labelStyle}>Minimum Partner Annual Income</label>
            <select
              value={prefs.min_income}
              onChange={(e) => handleFieldChange('min_income', Number(e.target.value))}
              style={inputStyle}
            >
              {INCOME_OPTIONS.map((inc) => (
                <option key={inc.val} value={inc.val}>
                  {inc.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ================= 7. LOCATION & RESIDENCE PREFERENCES ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📍</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                7. Country, State & City Preferences
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Geographic Settlement
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {/* Country */}
            <div>
              <label style={labelStyle}>Preferred Country</label>
              <input
                type="text"
                value={prefs.preferred_country || ''}
                onChange={(e) => handleFieldChange('preferred_country', e.target.value)}
                placeholder="e.g. India, Any, USA, Canada, UAE"
                style={inputStyle}
              />
            </div>

            {/* State */}
            <div>
              <label style={labelStyle}>Preferred State / Region</label>
              <input
                type="text"
                value={prefs.preferred_state || ''}
                onChange={(e) => handleFieldChange('preferred_state', e.target.value)}
                placeholder="e.g. Delhi NCR, Maharashtra, Karnataka, Any"
                style={inputStyle}
              />
            </div>

            {/* City */}
            <div>
              <label style={labelStyle}>Preferred City / Cities</label>
              <input
                type="text"
                value={prefs.preferred_city || ''}
                onChange={(e) => handleFieldChange('preferred_city', e.target.value)}
                placeholder="e.g. Mumbai, New Delhi, Bengaluru, Pune, Any"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* ================= 8. LIFESTYLE & ASTROLOGY PREFERENCES ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>✨</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                8. Lifestyle, Diet & Astrological Preferences
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Values & Habits
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {/* Diet */}
            <div>
              <label style={labelStyle}>Dietary Preference</label>
              <select
                value={prefs.preferred_diet}
                onChange={(e) => handleFieldChange('preferred_diet', e.target.value)}
                style={inputStyle}
              >
                <option value="Any">Any / No Diet Restriction</option>
                <option value="Vegetarian">Pure Vegetarian</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Eggetarian">Eggetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Jain">Jain Diet Only</option>
              </select>
            </div>

            {/* Manglik */}
            <div>
              <label style={labelStyle}>Manglik Alignment</label>
              <select
                value={prefs.preferred_manglik}
                onChange={(e) => handleFieldChange('preferred_manglik', e.target.value)}
                style={inputStyle}
              >
                <option value="Any">Doesn&apos;t Matter / Any</option>
                <option value="Non-Manglik">Non-Manglik Only</option>
                <option value="Manglik">Manglik Only</option>
              </select>
            </div>

            {/* Smoking */}
            <div>
              <label style={labelStyle}>Smoking Habit</label>
              <select
                value={prefs.preferred_smoking}
                onChange={(e) => handleFieldChange('preferred_smoking', e.target.value)}
                style={inputStyle}
              >
                <option value="No">No (Non-Smoker Preferred)</option>
                <option value="Any">Doesn&apos;t Matter</option>
              </select>
            </div>

            {/* Drinking */}
            <div>
              <label style={labelStyle}>Drinking Habit</label>
              <select
                value={prefs.preferred_drinking}
                onChange={(e) => handleFieldChange('preferred_drinking', e.target.value)}
                style={inputStyle}
              >
                <option value="No">No (Teetotaler Preferred)</option>
                <option value="Occasionally">Socially / Occasionally OK</option>
                <option value="Any">Doesn&apos;t Matter</option>
              </select>
            </div>
          </div>

          {/* Deal Breakers */}
          <div style={{ marginTop: '18px' }}>
            <label style={labelStyle}>Specific Deal Breakers / Must-Have Criteria</label>
            <textarea
              rows={3}
              value={prefs.deal_breakers || ''}
              onChange={(e) => handleFieldChange('deal_breakers', e.target.value)}
              placeholder="e.g. Willing to relocate to Mumbai, Non-smoker, Family-oriented, Kundali Ashtakoota score >= 24..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* ================= BOTTOM SUBMIT BAR ================= */}
        <div style={{
          background: '#031710',
          border: '1px solid rgba(229,193,88,0.25)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
              Save Your Section 6.3 Partner Criteria
            </div>
            <div style={{ fontSize: '12px', color: '#9cb1a6' }}>
              Saved preferences are immediately incorporated into your matching queue and discovery ranks.
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={primaryPinkBtnStyle}
          >
            {saving ? '⏳ Saving Preferences...' : '💾 Save Partner Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Styling tokens
const cardStyle: React.CSSProperties = {
  background: '#031710',
  borderRadius: '16px',
  border: '1px solid rgba(229,193,88,0.22)',
  padding: '24px',
  boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '16px',
  marginBottom: '20px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11.5px',
  color: '#e5c158',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '8px',
  background: '#062a1c',
  border: '1px solid rgba(255,255,255,0.14)',
  color: '#ffffff',
  fontSize: '13.5px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
};

const primaryPinkBtnStyle: React.CSSProperties = {
  padding: '12px 28px',
  borderRadius: '9999px',
  background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
  color: '#fff',
  fontSize: '14px',
  fontWeight: '800',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 6px 20px rgba(230,0,92,0.45)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.2s ease',
};

const activeChipStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '9999px',
  background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
  color: '#fff',
  border: '1px solid #ff2a73',
  fontSize: '13px',
  fontWeight: '700',
  cursor: 'pointer',
  boxShadow: '0 3px 10px rgba(230,0,92,0.35)',
  transition: 'all 0.2s ease',
};

const inactiveChipStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '9999px',
  background: 'rgba(255,255,255,0.05)',
  color: '#cbd5e0',
  border: '1px solid rgba(255,255,255,0.14)',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};
