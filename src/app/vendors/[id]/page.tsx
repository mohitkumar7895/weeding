'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import VendorBookPayPanel from '@/components/VendorBookPayPanel';
import './vendor-detail.css';

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const [activeTab, setActiveTab] = useState<'portfolio' | 'packages' | 'services'>('packages');
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const openBookPanel = (packageId?: string) => {
    if (packageId) setSelectedPackageId(packageId);
    requestAnimationFrame(() => {
      document.getElementById('vendor-book-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => {
    if (vendorId) fetchVendorDetails();
  }, [vendorId]);

  const fetchVendorDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendors/${vendorId}`);
      const data = await res.json();
      if (data.success) setVendor(data.data);
      else setError(data.message || 'Vendor not found');
    } catch (err: any) {
      setError(err.message || 'Failed to load vendor details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && vendor && typeof window !== 'undefined' && window.location.hash === '#vendor-book-panel') {
      document.getElementById('vendor-book-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, vendor]);

  if (loading || error || !vendor) {
    return (
      <div className="vd-page">
        <Navbar onOpenLogin={() => {}} onOpenRegister={() => {}} />
        <div style={{ padding: '100px 20px', textAlign: 'center', color: '#fff8e8' }}>
          <h2>{loading ? 'Loading vendor details...' : error || 'Vendor not found or not approved'}</h2>
          {!loading && (
            <p style={{ marginTop: 20 }}>
              <a href="/vendors" style={{ color: '#ff8ab0' }}>← Back to Directory</a>
            </p>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  const ratingNum = Number(vendor.rating) || 4.8;
  const reviewsNum = vendor.review_count || 0;
  const locationBits = [vendor.address, vendor.city, vendor.state, vendor.pincode].filter(Boolean);

  return (
    <div className="vd-page">
      <Navbar
        onOpenLogin={() => { setAuthMode('login'); setAuthModalOpen(true); }}
        onOpenRegister={() => { setAuthMode('register'); setAuthModalOpen(true); }}
      />

      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
        />
      )}

      <div className="vd-hero">
        <img
          className="vd-cover"
          src={vendor.cover_image || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80'}
          alt={vendor.business_name}
        />
        <div className="vd-hero-fade" />
        <div className="vd-hero-inner">
          <div className="container-custom vd-hero-row">
            <div>
              <span className="vd-kicker">{vendor.category_name || 'Wedding Vendor'}</span>
              <h1 className="vd-title">{vendor.business_name}</h1>
              <div className="vd-meta">
                <span>📍 {vendor.city}{vendor.state ? `, ${vendor.state}` : ''}</span>
                <span>⭐ {ratingNum.toFixed(1)} ({reviewsNum} reviews)</span>
                {vendor.is_verified && <span className="vd-badge-gold">✓ Verified</span>}
                {vendor.is_featured && <span className="vd-badge-gold">✦ Featured</span>}
                {vendor.is_sponsored && <span className="vd-badge-gold">❖ Sponsored</span>}
              </div>
            </div>
            <button className="btn-search-primary" style={{ padding: '14px 28px', fontSize: 15 }} onClick={() => openBookPanel()}>
              Check availability & pay
            </button>
          </div>
        </div>
      </div>

      <main className="container-custom vd-layout">
        <div>
          <section className="vd-card">
            <h2 className="vd-section-title">About {vendor.business_name}</h2>
            <p className="vd-copy">
              {vendor.description || 'Premium wedding services with personalized planning, trusted execution, and escrow-protected booking.'}
            </p>
            <div className="vd-stats">
              <div className="vd-stat">
                <div className="vd-stat-label">Experience</div>
                <div className="vd-stat-value">{vendor.experience_years || 1} Years</div>
              </div>
              <div className="vd-stat">
                <div className="vd-stat-label">Starting price</div>
                <div className="vd-stat-value">₹{Number(vendor.starting_price || 0).toLocaleString('en-IN')}</div>
              </div>
              <div className="vd-stat">
                <div className="vd-stat-label">Travels to venue</div>
                <div className="vd-stat-value">{vendor.travels_to_venue ? 'Yes' : 'No'}</div>
              </div>
            </div>
            {vendor.city && (
              <iframe
                className="vd-map"
                title="Vendor location"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(`${vendor.address || ''} ${vendor.city}`)}&z=12&output=embed`}
              />
            )}
          </section>

          <div className="vd-tabs">
            {(['packages', 'services', 'portfolio'] as const).map((tab) => (
              <button key={tab} className={`vd-tab${activeTab === tab ? ' is-active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'packages' && (
            vendor.packages?.length ? (
              vendor.packages.map((pkg: any) => (
                <div key={pkg.id} className="vd-pkg">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      {pkg.package_tier && <span className="vd-kicker">{pkg.package_tier}</span>}
                      <h3>{pkg.name}</h3>
                    </div>
                    <div className="vd-price">₹{Number(pkg.price).toLocaleString('en-IN')}</div>
                  </div>
                  {pkg.description && <p className="vd-copy" style={{ marginTop: 8 }}>{pkg.description}</p>}
                  <button className="btn-search-primary" type="button" onClick={() => openBookPanel(pkg.id)} style={{ marginTop: 14, padding: '10px 16px' }}>
                    Book this package
                  </button>
                </div>
              ))
            ) : (
              <p className="vd-empty">No packages listed yet. You can still book using the starting price of ₹{Number(vendor.starting_price || 0).toLocaleString('en-IN')}.</p>
            )
          )}

          {activeTab === 'services' && (
            vendor.services?.length ? (
              vendor.services.map((srv: any) => (
                <div key={srv.id} className="vd-pkg">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <h3>{srv.title}</h3>
                    <div className="vd-price">₹{Number(srv.starting_price).toLocaleString('en-IN')}</div>
                  </div>
                  {srv.description && <p className="vd-copy" style={{ marginTop: 8 }}>{srv.description}</p>}
                </div>
              ))
            ) : (
              <p className="vd-empty">No specific services listed.</p>
            )
          )}

          {activeTab === 'portfolio' && (
            vendor.portfolios?.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {vendor.portfolios.map((media: any) => (
                  <div key={media.id} style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '1', background: '#000' }}>
                    {media.media_type === 'VIDEO' ? (
                      <video src={media.media_url} poster={media.thumbnail_url || media.image_url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={media.image_url || media.media_url} alt={media.caption || 'Portfolio'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="vd-empty">Portfolio coming soon.</p>
            )
          )}
        </div>

        <aside>
          <div className="vd-card">
            <div className="vd-loc-label">Base location</div>
            <div className="vd-loc-val">{locationBits.join(', ')}</div>
            {vendor.service_area_cities?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {vendor.service_area_cities.map((c: string) => (
                  <span key={c} className="vd-chip">{c}</span>
                ))}
              </div>
            )}
            <VendorBookPayPanel
              vendor={vendor}
              selectedPackageId={selectedPackageId}
              onNeedLogin={() => {
                setAuthMode('login');
                setAuthModalOpen(true);
              }}
            />
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}
