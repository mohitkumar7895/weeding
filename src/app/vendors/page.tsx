'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import PackageComparisonModal, { ComparedPackage, PackageAddOn } from '@/components/PackageComparisonModal';
import { useAppContext } from '@/context';

interface Vendor {
  id: string;
  business_name: string;
  category_name?: string;
  category?: string;
  city: string;
  rating: number | string;
  review_count?: number;
  total_reviews?: number;
  starting_price?: number | string;
  cover_image?: string;
  is_verified?: boolean;
  verification_status?: string;
  is_sponsored?: boolean;
  is_featured?: boolean;
  bio?: string;
  description?: string;
}

interface Package {
  id: string;
  name: string;
  package_tier?: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'CUSTOM' | string;
  tier?: string;
  price: number;
  description: string;
  guest_capacity?: number;
  service_id?: string;
  service_title?: string;
  inclusions?: string[] | string;
  deliverables?: string[];
}

export default function VendorsPage() {
  const { user } = useAppContext();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc'>('rating');
  const [onlyVerified, setOnlyVerified] = useState(false);

  // Booking / Package Modal state
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorPackages, setVendorPackages] = useState<Package[]>([]);
  const [vendorAddOns, setVendorAddOns] = useState<PackageAddOn[]>([]);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [guestCount, setGuestCount] = useState(250);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');
  const [bookingErrorMsg, setBookingErrorMsg] = useState('');

  // Auth Modal
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const categories = [
    { id: 'ALL', name: 'All Categories', icon: '✨' },
    { id: 'Venue', name: 'Venues', icon: '🏰' },
    { id: 'Decorator', name: 'Decorators', icon: '🌸' },
    { id: 'Photographer', name: 'Photography', icon: '📸' },
    { id: 'Caterer', name: 'Catering', icon: '🍽️' },
    { id: 'Makeup', name: 'Makeup Artists', icon: '💄' },
    { id: 'DJ', name: 'DJ & Music', icon: '🎵' },
  ];

  const cities = ['ALL', 'Delhi NCR', 'Mumbai', 'Jaipur', 'Bengaluru', 'Lucknow', 'Udaipur', 'Goa', 'Chandigarh'];

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory && selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedCity && selectedCity !== 'ALL') params.append('city', selectedCity);
      // Pass radius if needed
      params.append('radius', '50');

      const res = await fetch(`/api/vendors?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        let fetchedVendors = data.data;
        if (onlyVerified) {
          fetchedVendors = fetchedVendors.filter((v: any) => v.is_verified || v.verification_status === 'VERIFIED');
        }
        setVendors(fetchedVendors);
      } else {
        setVendors([]);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [selectedCategory, selectedCity, onlyVerified]); // Fetch when these change

  const handleOpenBookingModal = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setBookingDate('');
    setBookingNotes('');
    setBookingSuccessMsg('');
    setBookingErrorMsg('');
    setSelectedPackageId('');
    setSelectedAddOnIds([]);
    setLoadingPackages(true);

    try {
      const [pkgRes, addOnRes] = await Promise.all([
        fetch(`/api/vendor/packages?vendor_id=${vendor.id}`),
        fetch(`/api/vendor/add-ons?vendor_id=${vendor.id}`).catch(() => null)
      ]);

      const pkgData = await pkgRes.json();
      if (pkgData.success && Array.isArray(pkgData.data) && pkgData.data.length > 0) {
        setVendorPackages(pkgData.data);
        setSelectedPackageId(pkgData.data[0].id);
      } else {
        setVendorPackages([]);
      }

      if (addOnRes && addOnRes.ok) {
        const addOnData = await addOnRes.json();
        if (addOnData.success && Array.isArray(addOnData.data)) {
          setVendorAddOns(addOnData.data);
        } else {
          setVendorAddOns([]);
        }
      } else {
        setVendorAddOns([]);
      }
    } catch (err) {
      console.error('Error loading vendor packages and add-ons:', err);
      setVendorPackages([]);
      setVendorAddOns([]);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleToggleAddOn = (addonId: string) => {
    setSelectedAddOnIds(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  const selectedPkg = vendorPackages.find(p => p.id === selectedPackageId);
  const selectedPkgPrice = selectedPkg ? Number(selectedPkg.price) : 0;
  const selectedAddOnsTotal = vendorAddOns
    .filter(a => selectedAddOnIds.includes(a.id))
    .reduce((acc, a) => acc + Number(a.price || 0), 0);
  const grandTotal = selectedPkgPrice + selectedAddOnsTotal;

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingErrorMsg('');
    setBookingSuccessMsg('');

    if (!user) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }

    if (!bookingDate) {
      setBookingErrorMsg('Please select your preferred wedding or event date.');
      return;
    }

    setBookingSubmitting(true);
    try {
      const chosenAddOns = vendorAddOns.filter(a => selectedAddOnIds.includes(a.id));
      let inquiryNotes = bookingNotes || `Booking inquiry for ${selectedPkg?.name || 'Tailored Package'}`;
      if (chosenAddOns.length > 0) {
        inquiryNotes += `\nSelected Add-ons: ` + chosenAddOns.map(a => `${a.name} (+₹${Number(a.price).toLocaleString('en-IN')})`).join(', ');
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: selectedVendor?.id,
          package_id: selectedPackageId || null,
          event_date: bookingDate,
          guest_count: Number(guestCount),
          notes: inquiryNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBookingSuccessMsg(`🎉 Success! Booking request #${data.data?.booking_number || 'WWM-INQUIRY'} placed. The vendor will confirm date availability.`);
      } else {
        setBookingErrorMsg(data.message || 'Unable to place booking request. Please check date availability.');
      }
    } catch (err: any) {
      setBookingErrorMsg(err.message || 'Network error submitting booking request.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Sort vendors (filtering is now mostly backend-driven, but we keep sort local for fast UI interaction if needed, though backend sorts by rank by default)
  const filteredVendors = [...vendors].sort((a, b) => {
    const ratingA = Number(a.rating) || 0;
    const ratingB = Number(b.rating) || 0;
    const priceA = Number(a.starting_price) || 0;
    const priceB = Number(b.starting_price) || 0;

    if (sortBy === 'rating') return ratingB - ratingA; // Or fallback to organic_score if backend does it
    if (sortBy === 'price_asc') return priceA - priceB;
    if (sortBy === 'price_desc') return priceB - priceA;
    return 0;
  });

  return (
    <div className="vendors-page-root">
      <Navbar
        onOpenLogin={() => { setAuthMode('login'); setAuthModalOpen(true); }}
        onOpenRegister={() => { setAuthMode('register'); setAuthModalOpen(true); }}
      />

      <main className="vendors-main-content">
        {/* Hero Header */}
        <section className="vendors-hero-section">
          <div className="container-custom">
            <div className="hero-text-center">
              <span className="hero-badge">Verified Indian Wedding Marketplace</span>
              <h1 className="hero-title">Book Top Wedding Vendors with Escrow Protection</h1>

              {/* Search & Location Bar */}
              <div className="search-filter-card">
                <div className="search-input-group">
                  <span className="input-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by vendor name, service, or specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="main-search-input"
                  />
                </div>

                <div className="city-select-group">
                  <span className="input-icon">📍</span>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="city-dropdown"
                  >
                    <option value="ALL">All Across India</option>
                    {cities.filter(c => c !== 'ALL').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <button className="btn-search-primary" onClick={fetchVendors}>
                  Find Vendors
                </button>
              </div>


            </div>
          </div>
        </section>

        {/* Category Pills Bar */}
        <section className="category-scroll-bar">
          <div className="container-custom">
            <div className="pills-wrapper">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`category-pill-btn ${selectedCategory === cat.id ? 'active-pill' : ''}`}
                >
                  <span className="pill-icon">{cat.icon}</span>
                  <span className="pill-name">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Results & Filter Bar */}
        <section className="vendors-grid-section">
          <div className="container-custom">
            <div className="filter-summary-row">
              <div className="results-count">
                Showing <strong>{filteredVendors.length}</strong> verified wedding professionals
              </div>

              <div className="sort-controls">
                <label className="verified-checkbox-label">
                  <input
                    type="checkbox"
                    checked={onlyVerified}
                    onChange={(e) => setOnlyVerified(e.target.checked)}
                  />
                  <span>Govt KYC Verified Only</span>
                </label>

                <div className="sort-by-group">
                  <span className="sort-label">Sort By:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="sort-dropdown"
                  >
                    <option value="rating">Highest Rated</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vendor Cards Grid */}
            {loading ? (
              <div className="loading-state-box">
                <div className="spinner"></div>
                <p>Curating top verified vendors for your big day...</p>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="empty-state-card">
                <span className="empty-icon">🏰</span>
                <h3>No Vendors Found Matching Your Criteria</h3>
                <p>Try broadening your search query, switching city, or clearing the category filter.</p>
                <button
                  className="btn-reset-filters"
                  onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setSelectedCity('ALL'); setOnlyVerified(false); }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="vendors-cards-grid">
                {filteredVendors.map((vendor) => {
                  const ratingNum = Number(vendor.rating) || 4.8;
                  const priceFormatted = Number(vendor.starting_price)?.toLocaleString('en-IN') || '15,000';
                  const reviewsNum = vendor.review_count || vendor.total_reviews || 24;

                  return (
                    <div key={vendor.id} className="vendor-item-card">
                      <div className="vendor-card-media" onClick={() => window.location.href = `/vendors/${vendor.id}`} style={{ cursor: 'pointer' }}>
                        <img
                          src={vendor.cover_image || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80'}
                          alt={vendor.business_name}
                          className="vendor-cover-img"
                        />
                        <div className="card-top-badges">
                          <span className="vendor-cat-badge">{vendor.category || vendor.category_name || 'Vendor'}</span>
                          {vendor.is_sponsored && (
                            <span className="sponsored-badge" style={{ marginLeft: '8px', background: 'rgba(255, 215, 0, 0.9)', color: '#000', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>Sponsored</span>
                          )}
                          {vendor.is_featured && !vendor.is_sponsored && (
                            <span className="featured-badge" style={{ marginLeft: '8px', background: 'rgba(255, 105, 180, 0.9)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>Featured</span>
                          )}
                          {(vendor.is_verified || vendor.verification_status === 'VERIFIED') && (
                            <span className="verified-gold-badge" style={{ marginLeft: 'auto' }}>✓ Verified</span>
                          )}
                        </div>
                      </div>

                      <div className="vendor-card-body">
                        <div className="card-header-row" onClick={() => window.location.href = `/vendors/${vendor.id}`} style={{ cursor: 'pointer' }}>
                          <h3 className="vendor-name-title">{vendor.business_name}</h3>
                          <div className="rating-pill">
                            <span className="star-icon">★</span>
                            <span className="rating-value">{ratingNum.toFixed(1)}</span>
                          </div>
                        </div>

                        <div className="vendor-location-row">
                          <span className="loc-pin">📍</span>
                          <span className="city-text">{vendor.city || 'Pan India'}</span>
                          <span className="dot-divider">•</span>
                          <span className="reviews-text">{reviewsNum} verified reviews</span>
                        </div>

                        <p className="vendor-bio-excerpt">
                          {vendor.description || vendor.bio || 'Premium bespoke wedding services with personalized event managers, top equipment, and transparent pricing.'}
                        </p>

                        <div className="vendor-card-footer">
                          <div className="price-tag-group">
                            <span className="price-label">Starting From</span>
                            <span className="price-val">₹{priceFormatted}</span>
                          </div>

                          <button
                            className="btn-view-book"
                            onClick={() => handleOpenBookingModal(vendor)}
                          >
                            Check Availability & Book
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Booking & Package Drawer Modal */}
      {selectedVendor && (
        <div className="booking-modal-backdrop" onClick={() => setSelectedVendor(null)}>
          <div className="booking-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="vendor-badge-mini">{selectedVendor.category || 'Wedding Vendor'}</span>
                <h2>{selectedVendor.business_name}</h2>
                <p className="modal-sub">Direct Inquiry & Escrow Protected Booking</p>
              </div>
              <button className="btn-close-modal" onClick={() => setSelectedVendor(null)}>✕</button>
            </div>

            <div className="modal-body">
              {bookingSuccessMsg ? (
                <div className="booking-alert success">
                  <span className="alert-icon">✓</span>
                  <div>
                    <h4>Inquiry Submitted Successfully!</h4>
                    <p>{bookingSuccessMsg}</p>
                    <p className="status-note">
                      Track your inquiry progress anytime in your <a href="/bookings" style={{ color: '#ff4d79', textDecoration: 'underline' }}>My Bookings</a> dashboard.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitBooking} className="booking-form">
                  {bookingErrorMsg && (
                    <div className="booking-alert error">
                      <span>⚠️</span>
                      <p>{bookingErrorMsg}</p>
                    </div>
                  )}

                  <div className="form-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label className="form-label" style={{ margin: 0 }}>1. Choose Service Package</label>
                      {vendorPackages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setShowCompareModal(true)}
                          className="compare-btn-inline"
                        >
                          ⚖️ Compare Packages Side-by-Side
                        </button>
                      )}
                    </div>

                    {loadingPackages ? (
                      <div className="p-4 text-center" style={{ color: '#888', padding: '24px' }}>Loading packages...</div>
                    ) : vendorPackages.length === 0 ? (
                      <div className="custom-consultation-banner">
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a202c', marginBottom: '4px' }}>
                          ✨ Tailored Packages Upon Consultation
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#718096' }}>
                          This vendor crafts bespoke packages tailored to your ceremony and guest requirements. Starting from ₹{Number(selectedVendor?.starting_price || 15000).toLocaleString('en-IN')}.
                        </p>
                      </div>
                    ) : (
                      <div className="packages-selection-grid">
                        {vendorPackages.map(pkg => {
                          const isSelected = selectedPackageId === pkg.id;
                          const tier = pkg.package_tier || pkg.tier || 'STANDARD';
                          const inclusionsList = Array.isArray(pkg.inclusions)
                            ? pkg.inclusions
                            : (typeof pkg.inclusions === 'string'
                                ? pkg.inclusions.split(',').map(s => s.trim()).filter(Boolean)
                                : (pkg.deliverables || []));
                          return (
                            <div
                              key={pkg.id}
                              onClick={() => setSelectedPackageId(pkg.id)}
                              className={`package-radio-card ${isSelected ? 'selected' : ''}`}
                            >
                              <div className="pkg-header">
                                <div>
                                  <span className={`tier-badge ${tier}`}>
                                    {tier}
                                  </span>
                                  <strong style={{ display: 'block', marginTop: '4px', fontSize: '15px', color: '#1a202c' }}>
                                    {pkg.name}
                                  </strong>
                                </div>
                                <span className="pkg-price">₹{Number(pkg.price).toLocaleString('en-IN')}</span>
                              </div>
                              <p className="pkg-desc">{pkg.description}</p>
                              {inclusionsList.length > 0 && (
                                <div className="pkg-inclusions-mini">
                                  {inclusionsList.slice(0, 3).map((item: string, idx: number) => (
                                    <span key={idx} className="inclusion-pill">✓ {item}</span>
                                  ))}
                                  {inclusionsList.length > 3 && (
                                    <span className="inclusion-pill more">+{inclusionsList.length - 3} more</span>
                                  )}
                                </div>
                              )}
                              {pkg.guest_capacity && (
                                <div style={{ fontSize: '11px', color: '#718096', marginTop: '6px' }}>
                                  👥 Capacity: Up to {pkg.guest_capacity} guests
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Optional Add-ons Section */}
                  {vendorAddOns.length > 0 && (
                    <div className="form-section add-ons-section" style={{ marginTop: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <label className="form-label" style={{ margin: 0 }}>✨ Optional Enhancements & Add-ons</label>
                        <span style={{ fontSize: '12px', color: '#718096' }}>Select any to include</span>
                      </div>
                      <div className="addons-grid">
                        {vendorAddOns.map(addon => {
                          const isChecked = selectedAddOnIds.includes(addon.id);
                          return (
                            <div
                              key={addon.id}
                              onClick={() => handleToggleAddOn(addon.id)}
                              className={`addon-choice-card ${isChecked ? 'checked' : ''}`}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  style={{ accentColor: '#ff2a73', marginTop: '3px', cursor: 'pointer' }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ fontSize: '13px', color: '#1a202c' }}>{addon.name}</strong>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#ff2a73' }}>
                                      +₹{Number(addon.price).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  {addon.description && (
                                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#718096', lineHeight: 1.4 }}>
                                      {addon.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Pricing Summary Bar */}
                  {(selectedPkg || selectedAddOnIds.length > 0) && (
                    <div className="pricing-summary-bar">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#718096', fontWeight: 600 }}>Estimated Total</div>
                          <div style={{ fontSize: '11px', color: '#a0aec0' }}>
                            {selectedPkg ? selectedPkg.name : 'Custom Consultation'}
                            {selectedAddOnIds.length > 0 && ` + ${selectedAddOnIds.length} add-on${selectedAddOnIds.length > 1 ? 's' : ''}`}
                          </div>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#031710' }}>
                          ₹{grandTotal.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">2. Preferred Event Date *</label>
                      <input
                        type="date"
                        required
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="form-input"
                      />
                      <span className="field-hint">Anti double-booking engine automatically reserves this date</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Expected Guest Count</label>
                      <input
                        type="number"
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        min={10}
                        max={5000}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Special Requests / Requirements</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Sangeet theme, specific floral choices, dietary restrictions, arrival timings..."
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      className="form-textarea"
                    />
                  </div>

                  <div className="escrow-reassurance-box">
                    <div className="reassurance-icon">🛡️</div>
                    <div className="reassurance-text">
                      <strong>WedWithMe Escrow Protection Guarantee</strong>
                      <p>Your payment is safely held in platform escrow until services are delivered to your satisfaction. Full refund guaranteed if vendor cancels.</p>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setSelectedVendor(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bookingSubmitting}
                      className="btn-confirm-inquiry"
                    >
                      {bookingSubmitting ? 'Submitting Inquiry...' : 'Submit Booking Inquiry'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal if unauthenticated */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Package Comparison Modal */}
      {selectedVendor && (
        <PackageComparisonModal
          isOpen={showCompareModal}
          vendorId={selectedVendor.id}
          serviceId={selectedPkg?.service_id}
          initialPackageId={selectedPackageId}
          onClose={() => setShowCompareModal(false)}
          onSelectPackage={(pkg, addOns) => {
            setSelectedPackageId(pkg.id);
            if (addOns && addOns.length > 0) {
              setSelectedAddOnIds(addOns.map(a => a.id));
            }
            setShowCompareModal(false);
          }}
        />
      )}

      <Footer />

      <style jsx>{`
        .vendors-page-root {
          min-height: 100vh;
          background: #fdfbf9;
          display: flex;
          flex-direction: column;
          font-family: inherit;
        }

        .vendors-hero-section {
          background-color: #031710;
          background-image: radial-gradient(circle at 50% 50%, rgba(6, 42, 28, 0.7) 0%, rgba(3, 23, 16, 0.98) 100%);
          border-bottom: 1px solid rgba(229, 193, 88, 0.2);
          color: #ffffff;
          padding: 60px 0 45px;
          text-align: center;
          position: relative;
        }

        .hero-badge {
          display: inline-block;
          background: rgba(229, 193, 88, 0.15);
          color: #e5c158;
          border: 1px solid rgba(229, 193, 88, 0.35);
          padding: 6px 16px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-bottom: 16px;
        }

        .hero-title {
          font-size: 38px;
          font-weight: 800;
          margin-bottom: 12px;
          color: #ffffff;
        }

        .hero-subtitle {
          font-size: 16px;
          color: #9cb1a6;
          max-width: 720px;
          margin: 0 auto 36px;
          line-height: 1.6;
        }

        .search-filter-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 860px;
          margin: 0 auto;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.25);
        }

        .search-input-group {
          flex: 2;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 10px;
        }

        .city-select-group {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          border-left: 1px solid #eee;
          padding-left: 12px;
        }

        .input-icon {
          font-size: 18px;
        }

        .main-search-input {
          width: 100%;
          border: none;
          outline: none;
          font-size: 15px;
          color: #222;
        }

        .city-dropdown {
          width: 100%;
          border: none;
          outline: none;
          font-size: 15px;
          color: #333;
          background: transparent;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-search-primary {
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          border: none;
          padding: 12px 28px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: transform 0.15s ease;
          box-shadow: 0 4px 14px rgba(230, 0, 92, 0.38);
        }

        .btn-search-primary:hover {
          transform: scale(1.02);
          box-shadow: 0 6px 20px rgba(230, 0, 92, 0.55);
        }

        .category-scroll-bar {
          background: #ffffff;
          border-bottom: 1px solid #ebe5df;
          padding: 14px 0;
        }

        .pills-wrapper {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 4px 0;
        }

        .category-pill-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f5f2ed;
          border: 1px solid #e8e2d9;
          padding: 8px 18px;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          color: #4a403a;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .category-pill-btn:hover {
          background: #eee8e0;
        }

        .category-pill-btn.active-pill {
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          border-color: #ff2a73;
          box-shadow: 0 2px 8px rgba(230, 0, 92, 0.35);
        }

        .vendors-grid-section {
          padding: 40px 0 80px;
        }

        .filter-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .results-count {
          font-size: 16px;
          color: #555;
        }

        .sort-controls {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .verified-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #1a7f37;
          cursor: pointer;
        }

        .sort-by-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sort-label {
          font-size: 14px;
          color: #666;
        }

        .sort-dropdown {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          background: #fff;
          cursor: pointer;
        }

        .vendors-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
        }

        .vendor-item-card {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #ede8e3;
          box-shadow: 0 4px 16px rgba(0,0,0,0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .vendor-item-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0,0,0,0.09);
        }

        .vendor-card-media {
          height: 200px;
          position: relative;
          background: #e5e5e5;
        }

        .vendor-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .card-top-badges {
          position: absolute;
          top: 12px;
          left: 12px;
          display: flex;
          gap: 8px;
        }

        .vendor-cat-badge {
          background: rgba(0,0,0,0.7);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 50px;
          backdrop-filter: blur(4px);
        }

        .verified-gold-badge {
          background: #2e7d32;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 50px;
        }

        .vendor-card-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6px;
        }

        .vendor-name-title {
          font-size: 19px;
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.3;
        }

        .rating-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #e8f5e9;
          color: #2e7d32;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 13px;
        }

        .star-icon {
          color: #fbc02d;
        }

        .vendor-location-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #666;
          margin-bottom: 12px;
        }

        .dot-divider {
          color: #ccc;
        }

        .vendor-bio-excerpt {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
          margin-bottom: 20px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }

        .vendor-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 14px;
          border-top: 1px solid #f0eee9;
        }

        .price-tag-group {
          display: flex;
          flex-direction: column;
        }

        .price-label {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
          font-weight: 600;
        }

        .price-val {
          font-size: 18px;
          font-weight: 800;
          color: #031710;
        }

        .btn-view-book {
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(230, 0, 92, 0.35);
          transition: all 0.2s ease;
        }

        .btn-view-book:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(230, 0, 92, 0.5);
          filter: brightness(1.08);
        }

        /* Modal Styles */
        .booking-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .booking-modal-panel {
          background: #ffffff;
          border-radius: 20px;
          max-width: 650px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 60px rgba(0,0,0,0.3);
        }

        .modal-header {
          padding: 24px;
          border-bottom: 1px solid rgba(229, 193, 88, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: #031710;
        }

        .vendor-badge-mini {
          font-size: 11px;
          font-weight: 700;
          color: #e5c158;
          text-transform: uppercase;
        }

        .modal-header h2 {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          margin: 4px 0 2px;
        }

        .modal-sub {
          font-size: 13px;
          color: #9cb1a6;
        }

        .btn-close-modal {
          background: none;
          border: none;
          font-size: 20px;
          color: #e5c158;
          cursor: pointer;
        }

        .modal-body {
          padding: 24px;
        }

        .form-section {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #333;
          margin-bottom: 8px;
        }

        .compare-btn-inline {
          background: rgba(229, 193, 88, 0.12);
          color: #8c6d1f;
          border: 1px solid rgba(229, 193, 88, 0.4);
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .compare-btn-inline:hover {
          background: #e5c158;
          color: #031710;
        }

        .packages-selection-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .package-radio-card {
          border: 2px solid #eee;
          border-radius: 12px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #fff;
        }

        .package-radio-card:hover {
          border-color: #cbd5e0;
        }

        .package-radio-card.selected {
          border-color: #e5c158;
          background: rgba(229, 193, 88, 0.08);
          box-shadow: 0 4px 14px rgba(229, 193, 88, 0.18);
        }

        .tier-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .tier-badge.BASIC {
          background: #edf2f7;
          color: #4a5568;
        }

        .tier-badge.STANDARD {
          background: rgba(229, 193, 88, 0.2);
          color: #8c6d1f;
        }

        .tier-badge.PREMIUM {
          background: linear-gradient(135deg, rgba(229, 193, 88, 0.3) 0%, rgba(255, 42, 115, 0.2) 100%);
          color: #9b2c2c;
          border: 1px solid rgba(229, 193, 88, 0.5);
        }

        .tier-badge.CUSTOM {
          background: #e2e8f0;
          color: #2d3748;
        }

        .pkg-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6px;
        }

        .pkg-price {
          color: #b8932f;
          font-weight: 700;
          font-size: 14px;
        }

        .pkg-desc {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
          margin: 0;
        }

        .pkg-inclusions-mini {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }

        .inclusion-pill {
          font-size: 10.5px;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 2px 6px;
          color: #4a5568;
        }

        .inclusion-pill.more {
          background: rgba(229, 193, 88, 0.15);
          color: #8c6d1f;
          font-weight: 600;
          border-color: rgba(229, 193, 88, 0.3);
        }

        .addons-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .addon-choice-card {
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 12px;
          background: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .addon-choice-card:hover {
          border-color: #cbd5e0;
        }

        .addon-choice-card.checked {
          border-color: #ff2a73;
          background: rgba(255, 42, 115, 0.03);
          box-shadow: 0 2px 8px rgba(255, 42, 115, 0.12);
        }

        .pricing-summary-bar {
          background: linear-gradient(135deg, rgba(3, 23, 16, 0.04) 0%, rgba(229, 193, 88, 0.12) 100%);
          border: 1.5px solid rgba(229, 193, 88, 0.35);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }

        .custom-consultation-banner {
          padding: 16px;
          background: #f7fafc;
          border: 1.5px dashed #cbd5e0;
          border-radius: 10px;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-input, .form-textarea {
          width: 100%;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
        }

        .form-input:focus, .form-textarea:focus {
          border-color: #e5c158;
        }

        .field-hint {
          font-size: 11px;
          color: #888;
          margin-top: 4px;
          display: block;
        }

        .escrow-reassurance-box {
          background: #f0f7ff;
          border: 1px solid #d0e5ff;
          border-radius: 10px;
          padding: 12px 16px;
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .reassurance-icon {
          font-size: 24px;
        }

        .reassurance-text strong {
          font-size: 13px;
          color: #0b5cab;
          display: block;
          margin-bottom: 2px;
        }

        .reassurance-text p {
          font-size: 12px;
          color: #4a6585;
          margin: 0;
          line-height: 1.4;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-cancel {
          background: #f0f0f0;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-confirm-inquiry {
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(230, 0, 92, 0.38);
        }

        .booking-alert {
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          display: flex;
          gap: 12px;
          font-size: 14px;
        }

        .booking-alert.success {
          background: #edf7ed;
          border: 1px solid #c8e6c9;
          color: #1e4620;
        }

        .booking-alert.error {
          background: #fde8e8;
          border: 1px solid #f8b4b4;
          color: #9b1c1c;
        }

        .vendors-page-root {
          overflow-x: clip;
          max-width: 100vw;
          width: 100%;
        }

        @media (max-width: 768px) {
          .vendors-hero-section {
            padding: 28px 0 20px !important;
          }
          .hero-title {
            font-size: 24px !important;
            line-height: 1.3 !important;
          }
          .hero-subtitle {
            font-size: 13px !important;
            margin-bottom: 20px !important;
          }
          .search-filter-card {
            flex-direction: column !important;
            gap: 10px !important;
            padding: 12px !important;
          }
          .search-input-group {
            width: 100% !important;
            padding: 0 !important;
          }
          .city-select-group {
            border-left: none !important;
            border-top: 1px solid #eee !important;
            padding-left: 0 !important;
            padding-top: 10px !important;
            width: 100% !important;
          }
          .btn-search-primary {
            width: 100% !important;
          }
          .pills-wrapper {
            padding: 4px 0 10px !important;
            gap: 8px !important;
          }
          .category-pill-btn {
            padding: 6px 14px !important;
            font-size: 12.5px !important;
            white-space: nowrap !important;
          }
          .filters-summary-bar {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .filter-controls-right {
            width: 100% !important;
            justify-content: space-between !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .vendors-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .vendors-listing-section {
            padding: 20px 0 60px !important;
          }
          .packages-selection-grid, .form-row-2 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
