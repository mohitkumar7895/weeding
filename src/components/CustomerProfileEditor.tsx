'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReelsLikesBadge from '@/components/ReelsLikesBadge';

interface ProfileFields {
  gender: string;
  date_of_birth: string;
  height_cm: string | number;
  marital_status: string;
  religion: string;
  caste: string;
  sub_caste: string;
  mother_tongue: string;
  education: string;
  college: string;
  profession: string;
  company: string;
  annual_income: string | number;
  country: string;
  state: string;
  city: string;
  about_me: string;
  family_type: string;
  family_values: string;
  father_occupation: string;
  mother_occupation: string;
  siblings_details: string;
  hobbies: string;
  diet: string;
  smoking: string;
  drinking: string;
  interests: string;
  photo_url: string;
  profile_visibility?: 'PUBLIC' | 'PRIVATE' | 'LIMITED';
  hide_phone?: boolean;
  hide_photos?: boolean;
  hide_income?: boolean;
  hide_location?: boolean;
}

interface CustomerProfileEditorProps {
  user?: any;
  onProfileUpdated?: (data: any) => void;
}

const COMMON_RELIGIONS = [
  'Hindu',
  'Muslim',
  'Sikh',
  'Christian',
  'Jain',
  'Buddhist',
  'Parsi',
  'Jewish',
  'Spiritual - Not Religious',
  'Other',
];

const COMMON_CASTES = [
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
  'Gursikh',
  'Sunni / Shia',
  'Roman Catholic / Protestant',
  'Other / Inter-caste Welcome',
];

const COMMON_MOTHER_TONGUES = [
  'Hindi',
  'Punjabi',
  'Bengali',
  'Marathi',
  'Gujarati',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Odia',
  'Urdu',
  'Marwari',
  'Bhojpuri',
  'Assamese',
  'English',
  'Other',
];

const COMMON_EDUCATIONS = [
  'B.Tech / B.E. (Engineering)',
  'MBA / PGDM (Management)',
  'MBBS / MD / MS (Medicine)',
  'M.Tech / M.E. / MS',
  'CA / CS / CFA (Finance)',
  'B.Com / M.Com',
  'B.Sc / M.Sc',
  'BCA / MCA (Computer Science)',
  'LLB / LLM (Law)',
  'Ph.D / Doctorate',
  'B.Arch / Architecture',
  'BBA / BBM',
  'Diploma / Vocational',
  'Higher Secondary / 12th',
  'Other',
];

const COMMON_PROFESSIONS = [
  'Software Engineer / IT Professional',
  'Product Manager / Tech Lead',
  'Doctor / Healthcare Professional',
  'Chartered Accountant / Financial Analyst',
  'Civil Services / Govt Officer (IAS/IPS/IES)',
  'Business Owner / Entrepreneur',
  'Banking / Investment Professional',
  'Marketing / Advertising Professional',
  'Professor / Lecturer / Teacher',
  'Architect / Interior Designer',
  'Lawyer / Legal Professional',
  'Defence / Armed Forces Officer',
  'Consultant / Strategy',
  'HR / People Operations',
  'Civil / Mechanical / Electrical Engineer',
  'Other',
];

const HEIGHT_OPTIONS = [
  { cm: 145, label: `4'9" (145 cm)` },
  { cm: 147, label: `4'10" (147 cm)` },
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
  { cm: 191, label: `6'3" (191 cm)` },
  { cm: 193, label: `6'4" (193 cm)` },
  { cm: 198, label: `6'6" (198 cm)` },
];

const INCOME_OPTIONS = [
  { val: 300000, label: '₹3 - 5 Lakhs per annum' },
  { val: 600000, label: '₹6 - 9 Lakhs per annum' },
  { val: 1000000, label: '₹10 - 15 Lakhs per annum' },
  { val: 1800000, label: '₹18 - 25 Lakhs per annum' },
  { val: 3000000, label: '₹30 - 50 Lakhs per annum' },
  { val: 6000000, label: '₹60 - 99 Lakhs per annum' },
  { val: 10000000, label: '₹1 Crore & above' },
];

export function computeClientCompletion(
  name: string,
  form: ProfileFields
): { percentage: number; missingFields: { key: string; label: string; points: number }[] } {
  let score = 0;
  const missing: { key: string; label: string; points: number }[] = [];

  // 1. Photo (15)
  if (form.photo_url && form.photo_url.trim().length > 0) score += 15;
  else missing.push({ key: 'photo', label: 'Profile Photo', points: 15 });

  // 2. Basic Details (15)
  if (name && name.trim().length > 0) score += 3;
  else missing.push({ key: 'name', label: 'Full Name', points: 3 });

  if (form.gender) score += 3;
  else missing.push({ key: 'gender', label: 'Gender', points: 3 });

  if (form.date_of_birth) score += 3;
  else missing.push({ key: 'date_of_birth', label: 'Date of Birth', points: 3 });

  if (Number(form.height_cm) > 100) score += 3;
  else missing.push({ key: 'height_cm', label: 'Height', points: 3 });

  if (form.marital_status) score += 3;
  else missing.push({ key: 'marital_status', label: 'Marital Status', points: 3 });

  // 3. Religious & Cultural Background (15)
  if (form.religion && form.religion.trim().length > 0) score += 5;
  else missing.push({ key: 'religion', label: 'Religion', points: 5 });

  if (form.caste && form.caste.trim().length > 0) score += 5;
  else missing.push({ key: 'caste', label: 'Caste / Community', points: 5 });

  if (form.mother_tongue && form.mother_tongue.trim().length > 0) score += 5;
  else missing.push({ key: 'mother_tongue', label: 'Mother Tongue', points: 5 });

  // 4. Education & Institution (15)
  if (form.education && form.education.trim().length > 0) score += 8;
  else missing.push({ key: 'education', label: 'Highest Education', points: 8 });

  if (form.college && form.college.trim().length > 0) score += 7;
  else missing.push({ key: 'college', label: 'College / University', points: 7 });

  // 5. Profession & Financials (15)
  if (form.profession && form.profession.trim().length > 0) score += 5;
  else missing.push({ key: 'profession', label: 'Profession', points: 5 });

  if (form.company && form.company.trim().length > 0) score += 5;
  else missing.push({ key: 'company', label: 'Company / Organization', points: 5 });

  if (Number(form.annual_income) > 0) score += 5;
  else missing.push({ key: 'annual_income', label: 'Annual Income', points: 5 });

  // 6. Location (10)
  if (form.country && form.country.trim().length > 0) score += 3;
  else missing.push({ key: 'country', label: 'Country', points: 3 });

  if (form.state && form.state.trim().length > 0) score += 3;
  else missing.push({ key: 'state', label: 'State', points: 3 });

  if (form.city && form.city.trim().length > 0) score += 4;
  else missing.push({ key: 'city', label: 'City', points: 4 });

  // 7. Family Details (10)
  if (form.family_type) score += 3;
  else missing.push({ key: 'family_type', label: 'Family Type', points: 3 });

  if (form.father_occupation && form.father_occupation.trim().length > 0) score += 3;
  else missing.push({ key: 'father_occupation', label: "Father's Occupation", points: 3 });

  if (form.mother_occupation && form.mother_occupation.trim().length > 0) score += 2;
  else missing.push({ key: 'mother_occupation', label: "Mother's Occupation", points: 2 });

  if (form.siblings_details && form.siblings_details.trim().length > 0) score += 2;
  else missing.push({ key: 'siblings_details', label: 'Siblings Info', points: 2 });

  // 8. About Me & Lifestyle (5)
  if (form.about_me && form.about_me.trim().length > 10) score += 2;
  else missing.push({ key: 'about_me', label: 'About Me Bio', points: 2 });

  if (form.hobbies && form.hobbies.trim().length > 0) score += 2;
  else missing.push({ key: 'hobbies', label: 'Hobbies & Interests', points: 2 });

  if (form.diet) score += 1;
  else missing.push({ key: 'diet', label: 'Dietary Preference', points: 1 });

  return {
    percentage: Math.min(100, Math.round(score)),
    missingFields: missing,
  };
}

export default function CustomerProfileEditor({ user, onProfileUpdated }: CustomerProfileEditorProps) {
  const [fullName, setFullName] = useState(user?.name || '');
  const [form, setForm] = useState<ProfileFields>({
    gender: '',
    date_of_birth: '',
    height_cm: '',
    marital_status: '',
    religion: '',
    caste: '',
    sub_caste: '',
    mother_tongue: '',
    education: '',
    college: '',
    profession: '',
    company: '',
    annual_income: '',
    country: '',
    state: '',
    city: '',
    about_me: '',
    family_type: '',
    family_values: '',
    father_occupation: '',
    mother_occupation: '',
    siblings_details: '',
    hobbies: '',
    diet: '',
    smoking: '',
    drinking: '',
    interests: '',
    photo_url: '',
    profile_visibility: 'PUBLIC',
    hide_phone: true,
    hide_photos: false,
    hide_income: false,
    hide_location: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute live score
  const { percentage, missingFields } = computeClientCompletion(fullName, form);

  // Load existing profile from database
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/profile');
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        const p = d.profile || d;
        const u = d.user || d;
        if (u?.name || p?.name) setFullName(u?.name || p?.name || '');
        setForm({
          gender: p.gender || '',
          date_of_birth: p.date_of_birth ? String(p.date_of_birth).substring(0, 10) : '',
          height_cm: p.height_cm ? String(p.height_cm) : '',
          marital_status: p.marital_status || '',
          religion: p.religion || '',
          caste: p.caste || '',
          sub_caste: p.sub_caste || '',
          mother_tongue: p.mother_tongue || '',
          education: p.education || '',
          college: p.college || '',
          profession: p.profession || '',
          company: p.company || '',
          annual_income: p.annual_income ? String(p.annual_income) : '',
          country: p.country || '',
          state: p.state || '',
          city: p.city || '',
          about_me: p.about_me || '',
          family_type: p.family_type || '',
          family_values: p.family_values || '',
          father_occupation: p.father_occupation || '',
          mother_occupation: p.mother_occupation || '',
          siblings_details: p.siblings_details || '',
          hobbies: p.hobbies || '',
          diet: p.diet || '',
          smoking: p.smoking || '',
          drinking: p.drinking || '',
          interests: p.interests || '',
          photo_url: p.primaryPhotoUrl || p.photo_url || (d.photos?.[0]?.url ?? ''),
          profile_visibility: p.profile_visibility || 'PUBLIC',
          hide_phone: p.hide_phone !== undefined && p.hide_phone !== null ? Boolean(p.hide_phone) : true,
          hide_photos: Boolean(p.hide_photos),
          hide_income: Boolean(p.hide_income),
          hide_location: Boolean(p.hide_location),
        });
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ProfileFields, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Photo file upload to base64
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo size should be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleChange('photo_url', base64);
      setSuccess('Photo selected! Remember to click "Save Profile" below.');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (imageUrlDraft.trim()) {
      handleChange('photo_url', imageUrlDraft.trim());
      setShowUrlInput(false);
      setImageUrlDraft('');
      setSuccess('Photo URL applied! Click "Save Profile" to save.');
    }
  };

  // Save profile to server
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: fullName,
        ...form,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        annual_income: form.annual_income ? Number(form.annual_income) : null,
      };

      const res = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        setSuccess('Profile updated successfully! Matrimonial compatibility scores have been refreshed.');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        if (onProfileUpdated) {
          onProfileUpdated({
            name: fullName,
            ...form,
            photo_url: form.photo_url,
            completion_percentage: percentage,
          });
        }
      } else {
        setError(result.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  // Helper to compute age
  const calculateAge = (dobString: string): number | null => {
    if (!dobString) return null;
    const birth = new Date(dobString);
    if (isNaN(birth.getTime())) return null;
    const diffMs = Date.now() - birth.getTime();
    const ageDate = new Date(diffMs);
    const calculated = Math.abs(ageDate.getUTCFullYear() - 1970);
    return isNaN(calculated) || calculated <= 0 || calculated > 110 ? null : calculated;
  };

  // Helper for height label
  const getHeightLabel = (cmVal: string | number) => {
    const found = HEIGHT_OPTIONS.find((h) => h.cm === Number(cmVal));
    if (found) return found.label;
    if (cmVal && Number(cmVal) > 0) {
      const totalInches = Math.round(Number(cmVal) / 2.54);
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      return `${feet}'${inches}" (${cmVal} cm)`;
    }
    return '';
  };

  const calculatedAge = calculateAge(form.date_of_birth);

  // Badge tier based on percentage
  const getBadgeTier = () => {
    if (percentage >= 80) {
      return {
        label: '👑 Gold Verified Profile',
        desc: 'Maximum visibility & top algorithmic compatibility match ranking',
        color: '#e5c158',
        bg: 'rgba(229,193,88,0.18)',
        border: 'rgba(229,193,88,0.4)',
      };
    }
    if (percentage >= 50) {
      return {
        label: '🥈 Silver Profile',
        desc: 'Good discovery potential — complete remaining details for Gold status',
        color: '#90cdf4',
        bg: 'rgba(144,205,244,0.15)',
        border: 'rgba(144,205,244,0.3)',
      };
    }
    return {
      label: '🥉 Bronze Profile',
      desc: 'Add basic details, education, & photo to unlock matrimonial matches',
      color: '#ed8936',
      bg: 'rgba(237,137,54,0.15)',
      border: 'rgba(237,137,54,0.3)',
    };
  };

  const badgeTier = getBadgeTier();

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#e5c158' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1.5s linear infinite' }}>👑</div>
        <p style={{ fontSize: '15px', color: '#9cb1a6' }}>Loading your personalized matrimonial profile...</p>
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

      {/* ================= HERO: PROFILE COMPLETION METER ================= */}
      <div style={{
        background: 'linear-gradient(135deg, #031710 0%, #062a1c 100%)',
        border: '1px solid rgba(229,193,88,0.3)',
        borderRadius: '20px',
        padding: '28px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(229,193,88,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                background: badgeTier.bg,
                color: badgeTier.color,
                border: `1px solid ${badgeTier.border}`,
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}>
                {badgeTier.label}
              </span>
              {lastSavedTime && (
                <span style={{ fontSize: '12px', color: '#9cb1a6' }}>
                  Last saved at {lastSavedTime}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0 }}>
              Matrimonial Profile Completeness: <span style={{ color: '#e5c158' }}>{percentage}%</span>
            </h2>
            <p style={{ fontSize: '13px', color: '#9cb1a6', margin: '4px 0 0 0', maxWidth: '560px' }}>
              {badgeTier.desc}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            style={{
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
            }}
          >
            {saving ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: '22px' }}>
          <div style={{
            height: '14px',
            width: '100%',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '9999px',
            overflow: 'hidden',
            border: '1px solid rgba(229,193,88,0.2)',
          }}>
            <div style={{
              height: '100%',
              width: `${percentage}%`,
              background: 'linear-gradient(90deg, #ff2a73 0%, #e5c158 60%, #38a169 100%)',
              borderRadius: '9999px',
              transition: 'width 0.4s ease',
              boxShadow: '0 0 14px rgba(229,193,88,0.5)',
            }} />
          </div>
        </div>

        {/* Missing fields breakdown chips */}
        {missingFields.length > 0 && (
          <div style={{ marginTop: '18px' }}>
            <div style={{ fontSize: '11.5px', color: '#fae8a4', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
              ⚡ Complete These to Reach 100%:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {missingFields.slice(0, 6).map((item) => (
                <span
                  key={item.key}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ color: '#e5c158', fontWeight: '800' }}>+{item.points}%</span>
                  <span>{item.label}</span>
                </span>
              ))}
              {missingFields.length > 6 && (
                <span style={{ fontSize: '11px', color: '#9cb1a6', padding: '4px 8px' }}>
                  +{missingFields.length - 6} more fields
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <ReelsLikesBadge />

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* ================= 1. PROFILE PHOTO ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📸</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                1. Profile Photo & Portrait
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: form.photo_url ? '#48bb78' : '#e5c158', fontWeight: '700' }}>
              {form.photo_url ? '✓ Photo Added (+15%)' : 'Needs Photo (+15%)'}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '24px' }}>
            {/* Avatar Preview */}
            <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '3px solid #e5c158',
                overflow: 'hidden',
                background: '#062a1c',
                boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {form.photo_url ? (
                  <img
                    src={form.photo_url}
                    alt="Profile Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '42px', color: '#e5c158' }}>
                    {fullName?.charAt(0)?.toUpperCase() || '👤'}
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '13px', color: '#9cb1a6', margin: 0, lineHeight: 1.5 }}>
                Clear, front-facing portrait photos receive up to <strong style={{ color: '#fff' }}>5x more verified interests</strong>. Recommended aspect ratio: 1:1 square or portrait.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={pinkBtnStyle}
                >
                  📁 Upload Photo from Device
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  style={outlineBtnStyle}
                >
                  🔗 Image URL
                </button>

                {form.photo_url && (
                  <button
                    type="button"
                    onClick={() => {
                      handleChange('photo_url', '');
                      setSuccess('Photo removed. Remember to save changes.');
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: 'rgba(230,0,92,0.15)',
                      border: '1px solid #ff2a73',
                      color: '#ffb3c6',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Remove
                  </button>
                )}
              </div>

              {showUrlInput && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="url"
                    placeholder="https://example.com/my-photo.jpg"
                    value={imageUrlDraft}
                    onChange={(e) => setImageUrlDraft(e.target.value)}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    style={pinkBtnStyle}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= 2. BASIC & PERSONAL DETAILS ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>👤</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                2. Basic & Personal Details
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Core Matrimonial Bio
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
            {/* Full Name */}
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Aditi Sharma"
                style={inputStyle}
              />
            </div>

            {/* Gender */}
            <div>
              <label style={labelStyle}>Gender</label>
              <select
                value={form.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                style={inputStyle}
              >
                <option value="">Select Gender</option>
                <option value="male">Male (Groom)</option>
                <option value="female">Female (Bride)</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>Date of Birth</label>
                {calculatedAge !== null && (
                  <span style={{ fontSize: '11px', background: 'rgba(229,193,88,0.2)', color: '#e5c158', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                    🎂 {calculatedAge} years old
                  </span>
                )}
              </div>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Height */}
            <div>
              <label style={labelStyle}>
                Height {form.height_cm ? `(${getHeightLabel(form.height_cm)})` : ''}
              </label>
              <select
                value={form.height_cm}
                onChange={(e) => handleChange('height_cm', e.target.value)}
                style={inputStyle}
              >
                <option value="">Select Height</option>
                {HEIGHT_OPTIONS.map((h) => (
                  <option key={h.cm} value={h.cm}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Marital Status */}
            <div>
              <label style={labelStyle}>Marital Status</label>
              <select
                value={form.marital_status}
                onChange={(e) => handleChange('marital_status', e.target.value)}
                style={inputStyle}
              >
                <option value="">Select Status</option>
                <option value="never_married">Never Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="awaiting_divorce">Awaiting Divorce</option>
              </select>
            </div>
          </div>
        </div>

        {/* ================= 3. RELIGIOUS & CULTURAL COMMUNITY ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🕉️</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                3. Religious, Caste & Community
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Kundali & Community Align
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
            {/* Religion */}
            <div>
              <label style={labelStyle}>Religion</label>
              <select
                value={form.religion}
                onChange={(e) => handleChange('religion', e.target.value)}
                style={inputStyle}
              >
                <option value="">Select Religion</option>
                {COMMON_RELIGIONS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
            </div>

            {/* Caste / Community */}
            <div>
              <label style={labelStyle}>Caste / Community</label>
              <input
                type="text"
                list="casteOptions"
                value={form.caste}
                onChange={(e) => handleChange('caste', e.target.value)}
                placeholder="e.g. Brahmin, Rajput, Yadav, Khatri"
                style={inputStyle}
              />
              <datalist id="casteOptions">
                {COMMON_CASTES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Sub-caste / Gotra */}
            <div>
              <label style={labelStyle}>Sub-Caste / Gotra</label>
              <input
                type="text"
                value={form.sub_caste}
                onChange={(e) => handleChange('sub_caste', e.target.value)}
                placeholder="e.g. Kashyap, Garg, Vats, Bhardwaj"
                style={inputStyle}
              />
            </div>

            {/* Mother Tongue */}
            <div>
              <label style={labelStyle}>Mother Tongue</label>
              <select
                value={form.mother_tongue}
                onChange={(e) => handleChange('mother_tongue', e.target.value)}
                style={inputStyle}
              >
                <option value="">Select Mother Tongue</option>
                {COMMON_MOTHER_TONGUES.map((mt) => (
                  <option key={mt} value={mt}>
                    {mt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ================= 4. EDUCATION & INSTITUTION ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🎓</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                4. Education & Institution
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Academic Background
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            {/* Highest Education */}
            <div>
              <label style={labelStyle}>Highest Education Qualification</label>
              <input
                type="text"
                list="educationOptions"
                value={form.education}
                onChange={(e) => handleChange('education', e.target.value)}
                placeholder="e.g. B.Tech, MBA, MBBS, MS, CA"
                style={inputStyle}
              />
              <datalist id="educationOptions">
                {COMMON_EDUCATIONS.map((ed) => (
                  <option key={ed} value={ed} />
                ))}
              </datalist>
            </div>

            {/* College / Institution */}
            <div>
              <label style={labelStyle}>College / University / Institution</label>
              <input
                type="text"
                value={form.college}
                onChange={(e) => handleChange('college', e.target.value)}
                placeholder="e.g. IIT Delhi, IIM Ahmedabad, Delhi University"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* ================= 5. PROFESSION & CAREER ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>💼</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                5. Profession, Employer & Annual Income
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Career & Financials
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
            {/* Profession */}
            <div>
              <label style={labelStyle}>Profession / Occupation</label>
              <input
                type="text"
                list="professionOptions"
                value={form.profession}
                onChange={(e) => handleChange('profession', e.target.value)}
                placeholder="e.g. Software Engineer, Doctor, CA, Civil Services"
                style={inputStyle}
              />
              <datalist id="professionOptions">
                {COMMON_PROFESSIONS.map((prof) => (
                  <option key={prof} value={prof} />
                ))}
              </datalist>
            </div>

            {/* Company / Organization */}
            <div>
              <label style={labelStyle}>Company / Organization / Business</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="e.g. Google, TCS, Govt of India, Self-Employed"
                style={inputStyle}
              />
            </div>

            {/* Annual Income */}
            <div>
              <label style={labelStyle}>Annual Income (₹ INR)</label>
              <select
                value={form.annual_income}
                onChange={(e) => handleChange('annual_income', e.target.value)}
                style={inputStyle}
              >
                <option value="">Select Annual Income</option>
                {INCOME_OPTIONS.map((inc) => (
                  <option key={inc.val} value={inc.val}>
                    {inc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ================= 6. LOCATION & RESIDENCE ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📍</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                6. Location & Residence
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Current Living City
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
            {/* Country */}
            <div>
              <label style={labelStyle}>Country</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="e.g. India, USA, Canada, UAE"
                style={inputStyle}
              />
            </div>

            {/* State */}
            <div>
              <label style={labelStyle}>State / Province</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="e.g. Delhi NCR, Maharashtra, Karnataka, Punjab"
                style={inputStyle}
              />
            </div>

            {/* City */}
            <div>
              <label style={labelStyle}>City / Location</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="e.g. New Delhi, Mumbai, Bengaluru, Pune"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* ================= 7. FAMILY BACKGROUND ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>👨‍👩‍👧‍👦</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                7. Family Background & Details
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Heritage & Values
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
            {/* Family Type */}
            <div>
              <label style={labelStyle}>Family Type</label>
              <select
                value={form.family_type}
                onChange={(e) => handleChange('family_type', e.target.value)}
                style={inputStyle}
              >
                <option value="">Select Family Type</option>
                <option value="Nuclear">Nuclear Family</option>
                <option value="Joint">Joint Family</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Family Values */}
            <div>
              <label style={labelStyle}>Family Values</label>
              <select
                value={form.family_values}
                onChange={(e) => handleChange('family_values', e.target.value)}
                style={inputStyle}
              >
                <option value="">Select Family Values</option>
                <option value="Traditional">Traditional</option>
                <option value="Moderate">Moderate / Blend of Modern & Traditional</option>
                <option value="Liberal">Liberal / Modern</option>
              </select>
            </div>

            {/* Father's Occupation */}
            <div>
              <label style={labelStyle}>Father&apos;s Occupation</label>
              <input
                type="text"
                value={form.father_occupation}
                onChange={(e) => handleChange('father_occupation', e.target.value)}
                placeholder="e.g. Business, Retired Govt Official, Engineer"
                style={inputStyle}
              />
            </div>

            {/* Mother's Occupation */}
            <div>
              <label style={labelStyle}>Mother&apos;s Occupation</label>
              <input
                type="text"
                value={form.mother_occupation}
                onChange={(e) => handleChange('mother_occupation', e.target.value)}
                placeholder="e.g. Homemaker, Teacher, Doctor, Business"
                style={inputStyle}
              />
            </div>

            {/* Siblings */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Siblings Details</label>
              <input
                type="text"
                value={form.siblings_details}
                onChange={(e) => handleChange('siblings_details', e.target.value)}
                placeholder="e.g. 1 Elder Brother (Married, living in USA), 1 Younger Sister (Pursuing Masters)"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* ================= 8. ABOUT ME, LIFESTYLE & INTERESTS ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>✨</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                8. About Me, Lifestyle & Passions
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#e5c158', fontWeight: '700' }}>
              Personality & Habits
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* About Me */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>About Me / Matrimonial Bio</label>
                <span style={{ fontSize: '11px', color: '#9cb1a6' }}>
                  {form.about_me.length} characters
                </span>
              </div>
              <textarea
                rows={4}
                value={form.about_me}
                onChange={(e) => handleChange('about_me', e.target.value)}
                placeholder="Tell prospective life partners about your nature, life goals, how you spend weekends, family upbringing, and what kind of companionship you envision..."
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            {/* Lifestyle Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
              {/* Diet */}
              <div>
                <label style={labelStyle}>Dietary Preference</label>
                <select
                  value={form.diet}
                  onChange={(e) => handleChange('diet', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select Diet</option>
                  <option value="Vegetarian">Pure Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Jain">Jain Diet (Strictly No Root Veggies)</option>
                </select>
              </div>

              {/* Smoking */}
              <div>
                <label style={labelStyle}>Smoking</label>
                <select
                  value={form.smoking}
                  onChange={(e) => handleChange('smoking', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select Smoking Habit</option>
                  <option value="No">No (Non-Smoker)</option>
                  <option value="Occasionally">Occasionally</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {/* Drinking */}
              <div>
                <label style={labelStyle}>Drinking</label>
                <select
                  value={form.drinking}
                  onChange={(e) => handleChange('drinking', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select Drinking Habit</option>
                  <option value="No">No (Teetotaler)</option>
                  <option value="Occasionally">Socially / Occasionally</option>
                  <option value="Yes">Regularly</option>
                </select>
              </div>
            </div>

            {/* Hobbies & Passions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              <div>
                <label style={labelStyle}>Hobbies & Leisure Activities</label>
                <input
                  type="text"
                  value={form.hobbies}
                  onChange={(e) => handleChange('hobbies', e.target.value)}
                  placeholder="e.g. Traveling, Reading, Classical Music, Hiking, Cooking"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Interests & Astrological Details</label>
                <input
                  type="text"
                  value={form.interests}
                  onChange={(e) => handleChange('interests', e.target.value)}
                  placeholder="e.g. Kundali Match Preferred, Non-Manglik, Rashi: Leo, Yoga, Photography"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= SECTION 9: PROFILE PRIVACY & VISIBILITY ================= */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🛡️</span>
                <span>Section 9: Profile Privacy & Visibility Controls</span>
              </h3>
              <p style={{ fontSize: '13px', color: '#9cb1a6', margin: 0 }}>
                Control how your matrimonial profile is discovered on WedWithMe and manage disclosure for sensitive fields.
              </p>
            </div>
            <span style={{
              fontSize: '11px',
              background: form.profile_visibility === 'PUBLIC' ? 'rgba(56,161,105,0.2)' : form.profile_visibility === 'LIMITED' ? 'rgba(229,193,88,0.2)' : 'rgba(230,0,92,0.2)',
              color: form.profile_visibility === 'PUBLIC' ? '#9ae6b4' : form.profile_visibility === 'LIMITED' ? '#fae8a4' : '#ffb3c6',
              border: `1px solid ${form.profile_visibility === 'PUBLIC' ? '#38a169' : form.profile_visibility === 'LIMITED' ? '#e5c158' : '#ff2a73'}`,
              padding: '4px 10px',
              borderRadius: '9999px',
              fontWeight: '800',
              textTransform: 'uppercase',
            }}>
              {form.profile_visibility || 'PUBLIC'} Mode
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 1. Overall Profile Visibility Mode */}
            <div>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>
                Profile Visibility Mode (Choose One) *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {/* Mode A: Public */}
                <div
                  onClick={() => handleChange('profile_visibility', 'PUBLIC')}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: form.profile_visibility === 'PUBLIC' ? 'rgba(56,161,105,0.12)' : '#062a1c',
                    border: `1.5px solid ${form.profile_visibility === 'PUBLIC' ? '#38a169' : 'rgba(255,255,255,0.1)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🌐</span> Public
                    </span>
                    <span style={{ fontSize: '10px', background: 'rgba(56,161,105,0.2)', color: '#9ae6b4', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                      Recommended
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#9cb1a6', margin: 0, lineHeight: 1.4 }}>
                    Profile can be discovered by verified matrimonial members according to compatibility rules.
                  </p>
                </div>

                {/* Mode B: Limited */}
                <div
                  onClick={() => handleChange('profile_visibility', 'LIMITED')}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: form.profile_visibility === 'LIMITED' ? 'rgba(229,193,88,0.12)' : '#062a1c',
                    border: `1.5px solid ${form.profile_visibility === 'LIMITED' ? '#e5c158' : 'rgba(255,255,255,0.1)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🛡️</span> Limited
                    </span>
                    <span style={{ fontSize: '10px', background: 'rgba(229,193,88,0.2)', color: '#fae8a4', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                      Shielded
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#9cb1a6', margin: 0, lineHeight: 1.4 }}>
                    Only permitted profile information is shown. Sensitive details are shielded based on field controls.
                  </p>
                </div>

                {/* Mode C: Private */}
                <div
                  onClick={() => handleChange('profile_visibility', 'PRIVATE')}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: form.profile_visibility === 'PRIVATE' ? 'rgba(230,0,92,0.12)' : '#062a1c',
                    border: `1.5px solid ${form.profile_visibility === 'PRIVATE' ? '#ff2a73' : 'rgba(255,255,255,0.1)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔒</span> Private
                    </span>
                    <span style={{ fontSize: '10px', background: 'rgba(230,0,92,0.2)', color: '#ffb3c6', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                      Hidden
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#9cb1a6', margin: 0, lineHeight: 1.4 }}>
                    Profile is strictly hidden from search, discovery queue, and matches. Direct views are blocked.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Field-Level Sensitive Privacy Controls */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Field-Level Sensitive Privacy Controls (4 Essential Fields)
                </label>
                <span style={{ fontSize: '11px', color: '#9cb1a6' }}>
                  Enforced server-side in all API responses
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {/* Control 1: Phone Number */}
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#062a1c',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📱</span> Phone Number
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: form.hide_phone ? '#fae8a4' : '#9ae6b4',
                        background: form.hide_phone ? 'rgba(229,193,88,0.15)' : 'rgba(56,161,105,0.15)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}>
                        {form.hide_phone ? 'Private' : 'Visible'}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#9cb1a6', margin: 0, lineHeight: 1.4 }}>
                      {form.hide_phone
                        ? 'Masked on discovery/search. Only shared after mutual interest acceptance.'
                        : 'Visible to verified matrimonial candidates.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleChange('hide_phone', false)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: !form.hide_phone ? 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)' : 'rgba(255,255,255,0.06)',
                        color: !form.hide_phone ? '#fff' : '#cbd5e0',
                        border: `1px solid ${!form.hide_phone ? '#38a169' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      ✓ Visible
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('hide_phone', true)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: form.hide_phone ? 'linear-gradient(135deg, #e5c158 0%, #b89530 100%)' : 'rgba(255,255,255,0.06)',
                        color: form.hide_phone ? '#031710' : '#cbd5e0',
                        border: `1px solid ${form.hide_phone ? '#e5c158' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      🔒 Private
                    </button>
                  </div>
                </div>

                {/* Control 2: Photographs */}
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#062a1c',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📷</span> Photographs
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: form.hide_photos ? '#fae8a4' : '#9ae6b4',
                        background: form.hide_photos ? 'rgba(229,193,88,0.15)' : 'rgba(56,161,105,0.15)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}>
                        {form.hide_photos ? 'Protected' : 'Visible'}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#9cb1a6', margin: 0, lineHeight: 1.4 }}>
                      {form.hide_photos
                        ? 'Photo is hidden behind a privacy shield. URL is not sent in public APIs.'
                        : 'Visible on discovery cards and matches profile views.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleChange('hide_photos', false)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: !form.hide_photos ? 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)' : 'rgba(255,255,255,0.06)',
                        color: !form.hide_photos ? '#fff' : '#cbd5e0',
                        border: `1px solid ${!form.hide_photos ? '#38a169' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      ✓ Visible
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('hide_photos', true)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: form.hide_photos ? 'linear-gradient(135deg, #e5c158 0%, #b89530 100%)' : 'rgba(255,255,255,0.06)',
                        color: form.hide_photos ? '#031710' : '#cbd5e0',
                        border: `1px solid ${form.hide_photos ? '#e5c158' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      🔒 Private
                    </button>
                  </div>
                </div>

                {/* Control 3: Income */}
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#062a1c',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>💰</span> Annual Income
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: form.hide_income ? '#fae8a4' : '#9ae6b4',
                        background: form.hide_income ? 'rgba(229,193,88,0.15)' : 'rgba(56,161,105,0.15)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}>
                        {form.hide_income ? 'Confidential' : 'Visible'}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#9cb1a6', margin: 0, lineHeight: 1.4 }}>
                      {form.hide_income
                        ? 'Exact income is masked as "Confidential / Disclosed after connection".'
                        : 'Income range is shown on verified cards and matches.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleChange('hide_income', false)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: !form.hide_income ? 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)' : 'rgba(255,255,255,0.06)',
                        color: !form.hide_income ? '#fff' : '#cbd5e0',
                        border: `1px solid ${!form.hide_income ? '#38a169' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      ✓ Visible
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('hide_income', true)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: form.hide_income ? 'linear-gradient(135deg, #e5c158 0%, #b89530 100%)' : 'rgba(255,255,255,0.06)',
                        color: form.hide_income ? '#031710' : '#cbd5e0',
                        border: `1px solid ${form.hide_income ? '#e5c158' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      🔒 Confidential
                    </button>
                  </div>
                </div>

                {/* Control 4: Exact Location */}
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#062a1c',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📍</span> Exact Location (City)
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: form.hide_location ? '#fae8a4' : '#9ae6b4',
                        background: form.hide_location ? 'rgba(229,193,88,0.15)' : 'rgba(56,161,105,0.15)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}>
                        {form.hide_location ? 'Protected' : 'Visible'}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#9cb1a6', margin: 0, lineHeight: 1.4 }}>
                      {form.hide_location
                        ? 'Exact city is shielded as "Protected by Member". Only country/region is shown.'
                        : 'City is visible to matching candidates in your region.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleChange('hide_location', false)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: !form.hide_location ? 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)' : 'rgba(255,255,255,0.06)',
                        color: !form.hide_location ? '#fff' : '#cbd5e0',
                        border: `1px solid ${!form.hide_location ? '#38a169' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      ✓ Visible
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('hide_location', true)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: form.hide_location ? 'linear-gradient(135deg, #e5c158 0%, #b89530 100%)' : 'rgba(255,255,255,0.06)',
                        color: form.hide_location ? '#031710' : '#cbd5e0',
                        border: `1px solid ${form.hide_location ? '#e5c158' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      🔒 Protected
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div style={{
              background: 'rgba(229,193,88,0.08)',
              border: '1px solid rgba(229,193,88,0.25)',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '12.5px',
              color: '#fae8a4',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ fontSize: '18px' }}>🔐</span>
              <span>
                <strong>Server-Side Privacy Guarantee:</strong> Your settings are saved directly in MySQL and enforced in all API endpoints. Sensitive fields marked Private are never sent over the wire to unauthorized viewers.
              </span>
            </div>
          </div>
        </div>

        {/* ================= BOTTOM ACTION BAR ================= */}
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
              Ready to submit your matrimonial details?
            </div>
            <div style={{ fontSize: '12px', color: '#9cb1a6' }}>
              Profile updates immediately boost your algorithm score and compatibility index.
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '13px 36px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 6px 22px rgba(230,0,92,0.45)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            {saving ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Reusable styling helpers
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

const pinkBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
  color: '#fff',
  fontSize: '12.5px',
  fontWeight: '700',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(230,0,92,0.35)',
};

const outlineBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(229,193,88,0.35)',
  color: '#e5c158',
  fontSize: '12.5px',
  fontWeight: '700',
  cursor: 'pointer',
};
