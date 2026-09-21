'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context';

export default function VendorRegisterPage() {
  const router = useRouter();
  const { setUser } = useAppContext();

  // Form State
  const [formData, setFormData] = useState({
    name: '', // Owner/Contact person
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    business_name: '',
    category_id: 'cat_photographers',
    city: 'Delhi NCR',
    address: '',
    description: '',
    starting_price: '25000',
    agreeTerms: false,
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const majorCities = [
    'Delhi NCR',
    'Mumbai',
    'Jaipur',
    'Bengaluru',
    'Lucknow',
    'Udaipur',
    'Goa',
    'Chandigarh',
    'Hyderabad',
    'Kolkata',
    'Pune',
    'Ahmedabad',
  ];

  useEffect(() => {
    // Load categories
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setCategories(data.data);
          if (!formData.category_id) {
            setFormData((prev) => ({ ...prev, category_id: data.data[0].id }));
          }
        } else {
          setCategories([
            { id: 'cat_photographers', name: 'Photographers' },
            { id: 'cat_caterers', name: 'Caterers' },
            { id: 'cat_decorators', name: 'Decorators' },
            { id: 'cat_venues', name: 'Venues' },
            { id: 'cat_makeup', name: 'Bridal Makeup' },
            { id: 'cat_mehendi', name: 'Mehendi Artists' },
            { id: 'cat_dj', name: 'DJ & Music' },
          ]);
        }
      })
      .catch(() => {
        setCategories([
          { id: 'cat_photographers', name: 'Photographers' },
          { id: 'cat_caterers', name: 'Caterers' },
          { id: 'cat_decorators', name: 'Decorators' },
          { id: 'cat_venues', name: 'Venues' },
          { id: 'cat_makeup', name: 'Bridal Makeup' },
          { id: 'cat_mehendi', name: 'Mehendi Artists' },
          { id: 'cat_dj', name: 'DJ & Music' },
        ]);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend Validations
    if (!formData.name.trim()) {
      setError('Owner / Primary contact person name is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please provide a valid business email address.');
      return;
    }
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!formData.business_name.trim()) {
      setError('Business / Studio name is required.');
      return;
    }
    if (!formData.address.trim()) {
      setError('Business physical address / studio location is required.');
      return;
    }
    const startingPriceNum = parseFloat(formData.starting_price);
    if (isNaN(startingPriceNum) || startingPriceNum <= 0) {
      setError('Starting price must be a valid positive number.');
      return;
    }
    if (!formData.agreeTerms) {
      setError('You must agree to the WedWithMe Vendor Partner Terms and Escrow policy.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: cleanPhone,
          password: formData.password,
          role: 'VENDOR',
          business_name: formData.business_name.trim(),
          category_id: formData.category_id,
          city: formData.city,
          address: formData.address.trim(),
          description: formData.description.trim(),
          starting_price: startingPriceNum,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Vendor registration failed. Please try again.');
      }

      setSuccess(true);
      if (data.user) {
        setUser(data.user);
      }

      // Redirect immediately to vendor dashboard / onboarding tab
      setTimeout(() => {
        router.push('/vendor');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#06140e', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          height: '72px',
          background: '#031710',
          borderBottom: '1px solid rgba(229,193,88,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="34" height="26" viewBox="0 0 54 40" fill="none">
            <defs>
              <linearGradient id="vrPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff2a73" />
                <stop offset="100%" stopColor="#e6005c" />
              </linearGradient>
              <linearGradient id="vrHeartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff528c" />
                <stop offset="100%" stopColor="#d8004f" />
              </linearGradient>
            </defs>
            <path d="M4 10L11 32L17 14L22 30L26 12" stroke="url(#vrPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z" fill="url(#vrHeartGrad)" />
            <path d="M28 12L32 30L37 14L43 32L50 10" stroke="url(#vrPinkGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: '24px', fontWeight: '800', color: '#e5c158', letterSpacing: '-0.5px' }}>WedWithMe</span>
          <span style={{ fontSize: '11px', background: 'rgba(229,193,88,0.12)', color: '#e5c158', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(229,193,88,0.25)', fontWeight: 600 }}>
            Vendor Partner
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: '#a0aec0' }}>Already a partner?</span>
          <Link
            href="/vendor"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#fff',
              background: 'transparent',
              border: '1px solid rgba(229,193,88,0.35)',
              padding: '8px 18px',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            Sign In to Vendor Suite
          </Link>
        </div>
      </header>

      {/* Main Registration Container */}
      <main style={{ flex: 1, padding: '40px 20px', maxWidth: '840px', margin: '0 auto', width: '100%' }}>
        {/* Header Hero Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,42,115,0.15)', border: '1px solid #ff2a73', color: '#ff759f', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px' }}>
            ✨ JOIN INDIA&apos;S PREMIER WEDDING ECOSYSTEM
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>
            Register as a WedWithMe Vendor Partner
          </h1>

        </div>

        {/* Status Messages */}
        {error && (
          <div style={{ background: 'rgba(230,0,92,0.15)', border: '1.5px solid #e6005c', color: '#ffb3c6', padding: '14px 18px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(56,161,105,0.2)', border: '1.5px solid #38a169', color: '#9ae6b4', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>✓ Vendor Partner Account Created!</div>
            <div>Redirecting to your Onboarding Checklist and KYC Dossier...</div>
          </div>
        )}

        {/* Registration Form Card */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'linear-gradient(180deg, #072218 0%, #031710 100%)',
            border: '1.5px solid rgba(229,193,88,0.25)',
            borderRadius: '20px',
            padding: '36px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          }}
        >
          {/* Section 1: Vendor Account Credentials */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid rgba(229,193,88,0.15)' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff2a73, #e6005c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>1</span>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158' }}>Account Credentials & Primary Contact</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                  OWNER / CONTACT PERSON NAME *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Vikramaditya Rathore"
                  value={formData.name}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0a271c', border: '1px solid rgba(229,193,88,0.25)', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                  BUSINESS EMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="partner@studio.com"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0a271c', border: '1px solid rgba(229,193,88,0.25)', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                  MOBILE NUMBER (10 DIGITS) *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ padding: '12px 14px', borderRadius: '8px', background: '#061d15', border: '1px solid rgba(229,193,88,0.25)', color: '#e5c158', fontSize: '14px', fontWeight: 'bold' }}>+91</span>
                  <input
                    type="tel"
                    name="phone"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={handleChange}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#0a271c', border: '1px solid rgba(229,193,88,0.25)', color: '#fff', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                    PASSWORD *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0a271c', border: '1px solid rgba(229,193,88,0.25)', color: '#fff', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                    CONFIRM PASSWORD *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    placeholder="Re-type password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0a271c', border: '1px solid rgba(229,193,88,0.25)', color: '#fff', fontSize: '14px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Business Identity & Location */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid rgba(229,193,88,0.15)' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff2a73, #e6005c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>2</span>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5c158' }}>Business Identity & Storefront Details</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                  BUSINESS / BRAND NAME *
                </label>
                <input
                  type="text"
                  name="business_name"
                  required
                  placeholder="e.g. Royal Shringar Studio"
                  value={formData.business_name}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0a271c', border: '1px solid rgba(229,193,88,0.25)', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                  WEDDING SERVICE CATEGORY *
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0a271c', border: '1px solid rgba(229,193,88,0.25)', color: '#fff', fontSize: '14px' }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                  OPERATING CITY / REGION *
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0a271c', border: '1px solid rgba(229,193,88,0.25)', color: '#fff', fontSize: '14px' }}
                >
                  {majorCities.map((ct) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                  STARTING PACKAGE PRICE (₹) *
                </label>
                <input
                  type="number"
                  name="starting_price"
                  required
                  min={1000}
                  step={500}
                  placeholder="25000"
                  value={formData.starting_price}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0a271c', border: '1px solid rgba(229,193,88,0.25)', color: '#fff', fontSize: '14px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                STUDIO / PHYSICAL ADDRESS *
              </label>
              <input
                type="text"
                name="address"
                required
                placeholder="e.g. Shop 14, Heritage Square, Defence Colony, New Delhi"
                value={formData.address}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0a271c', border: '1px solid rgba(229,193,88,0.25)', color: '#fff', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#e5c158', fontWeight: 600, marginBottom: '6px' }}>
                BUSINESS OVERVIEW & SPECIALTIES
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder="Describe your style, years of experience, signature offerings, destination wedding capabilities..."
                value={formData.description}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0a271c', border: '1px solid rgba(229,193,88,0.25)', color: '#fff', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Section 3: Terms & Agreement */}
          <div style={{ marginBottom: '28px', padding: '16px', borderRadius: '10px', background: '#061d15', border: '1px solid rgba(229,193,88,0.18)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#cbd5e0' }}>
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                style={{ marginTop: '3px', accentColor: '#ff2a73', width: '16px', height: '16px' }}
              />
              <span>
                I agree to the <strong style={{ color: '#e5c158' }}>WedWithMe Vendor Partner Agreement</strong>, Escrow settlement rules (10% platform commission), and declare that all submitted identity and contact details are authentic and verifiable.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              border: 'none',
              cursor: loading || success ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 20px rgba(230, 0, 92, 0.45)',
              transition: 'all 0.2s ease',
              opacity: loading || success ? 0.75 : 1,
            }}
          >
            {loading ? 'Creating Vendor Partner Account...' : success ? '✓ Account Created — Loading Dashboard...' : 'Complete Vendor Registration & Go to Onboarding'}
          </button>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#a0aec0' }}>
            Note: Newly registered vendors enter <strong>Pending Compliance</strong> status. Complete your KYC and Bank details inside to activate your storefront.
          </div>
        </form>
      </main>
    </div>
  );
}
