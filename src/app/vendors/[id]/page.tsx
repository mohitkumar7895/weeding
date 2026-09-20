'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  const [activeTab, setActiveTab] = useState<'portfolio' | 'packages' | 'services'>('packages');

  useEffect(() => {
    if (vendorId) {
      fetchVendorDetails();
    }
  }, [vendorId]);

  const fetchVendorDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendors/${vendorId}`);
      const data = await res.json();
      if (data.success) {
        setVendor(data.data);
      } else {
        setError(data.message || 'Vendor not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load vendor details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="vendors-page-root">
        <Navbar onOpenLogin={() => {}} onOpenRegister={() => {}} />
        <div style={{ padding: '100px 20px', textAlign: 'center', color: '#fff' }}>
          <h2>Loading vendor details...</h2>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="vendors-page-root">
        <Navbar onOpenLogin={() => {}} onOpenRegister={() => {}} />
        <div style={{ padding: '100px 20px', textAlign: 'center', color: '#fff' }}>
          <h2>{error || 'Vendor not found or not approved'}</h2>
          <p style={{ marginTop: '20px' }}><a href="/vendors" style={{ color: '#ff4d79' }}>← Back to Directory</a></p>
        </div>
        <Footer />
      </div>
    );
  }

  const ratingNum = Number(vendor.rating) || 4.8;
  const reviewsNum = vendor.review_count || 0;

  return (
    <div className="vendors-page-root">
      <Navbar
        onOpenLogin={() => { setAuthMode('login'); setAuthModalOpen(true); }}
        onOpenRegister={() => { setAuthMode('register'); setAuthModalOpen(true); }}
      />
      
      {/* Auth Modal */}
      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
        />
      )}

      {/* Cover Section */}
      <div style={{ width: '100%', height: '400px', position: 'relative', background: '#1a1a2e' }}>
        <img 
          src={vendor.cover_image || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80'} 
          alt={vendor.business_name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
        />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, #0b0c10, transparent)', padding: '40px' }}>
          <div className="container-custom" style={{ display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ display: 'inline-block', background: 'rgba(255, 77, 121, 0.2)', color: '#ff4d79', padding: '4px 12px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                {vendor.category_name || 'Wedding Vendor'}
              </span>
              <h1 style={{ fontSize: '36px', color: '#fff', margin: '0 0 8px 0' }}>{vendor.business_name}</h1>
              <div style={{ display: 'flex', gap: '16px', color: '#cbd5e0', fontSize: '15px', alignItems: 'center' }}>
                <span>📍 {vendor.city}{vendor.state ? `, ${vendor.state}` : ''}</span>
                <span>⭐ {ratingNum.toFixed(1)} ({reviewsNum} reviews)</span>
                {vendor.is_verified && <span style={{ color: '#d4af37', fontWeight: 'bold' }}>✓ Verified</span>}
                {vendor.is_featured && <span style={{ color: '#ff69b4', fontWeight: 'bold' }}>✦ Featured</span>}
                {vendor.is_sponsored && <span style={{ color: '#ffd700', fontWeight: 'bold' }}>❖ Sponsored</span>}
              </div>
              {vendor.city && (
                <iframe
                  title="Vendor location"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(`${vendor.address || ''} ${vendor.city}`)}&z=12&output=embed`}
                  style={{ width: '100%', height: '220px', border: 0, borderRadius: '12px', marginTop: '12px' }}
                />
              )}
            </div>
            <button className="btn-search-primary" style={{ padding: '16px 32px', fontSize: '16px', whiteSpace: 'nowrap' }}>
              Check Availability & Book
            </button>
          </div>
        </div>
      </div>

      <main className="container-custom" style={{ padding: '40px 20px', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        {/* Left Column: Details */}
        <div style={{ flex: '1 1 60%', minWidth: '300px' }}>
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>About {vendor.business_name}</h2>
            <p style={{ color: '#a0aec0', lineHeight: 1.7, fontSize: '16px' }}>
              {vendor.description || 'Premium bespoke wedding services with personalized event managers, top equipment, and transparent pricing.'}
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '24px' }}>
              {vendor.experience_years && (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ color: '#718096', fontSize: '13px', marginBottom: '4px' }}>Experience</div>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>{vendor.experience_years} Years</div>
                </div>
              )}
              {vendor.starting_price && (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ color: '#718096', fontSize: '13px', marginBottom: '4px' }}>Starting Price</div>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>₹{Number(vendor.starting_price).toLocaleString('en-IN')}</div>
                </div>
              )}
              {vendor.travels_to_venue !== null && (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ color: '#718096', fontSize: '13px', marginBottom: '4px' }}>Travels to Venue</div>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>{vendor.travels_to_venue ? 'Yes' : 'No'}</div>
                </div>
              )}
            </div>
          </section>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px' }}>
            {['packages', 'services', 'portfolio'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: activeTab === tab ? '#ff4d79' : '#a0aec0',
                  padding: '12px 0',
                  fontSize: '16px',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  borderBottom: activeTab === tab ? '2px solid #ff4d79' : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'packages' && (
              <div>
                {vendor.packages && vendor.packages.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {vendor.packages.map((pkg: any) => (
                      <div key={pkg.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '12px', background: '#2d3748', color: '#fff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{pkg.package_tier}</span>
                            <h3 style={{ color: '#fff', fontSize: '20px', marginTop: '8px' }}>{pkg.name}</h3>
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff4d79' }}>
                            ₹{Number(pkg.price).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <p style={{ color: '#a0aec0', fontSize: '15px', lineHeight: 1.6 }}>{pkg.description}</p>
                        {pkg.guest_capacity && (
                          <div style={{ marginTop: '12px', color: '#cbd5e0', fontSize: '14px' }}>👤 Up to {pkg.guest_capacity} guests</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#a0aec0' }}>No packages currently listed. Contact vendor for custom quotes.</p>
                )}
              </div>
            )}

            {activeTab === 'services' && (
              <div>
                {vendor.services && vendor.services.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {vendor.services.map((srv: any) => (
                      <div key={srv.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <h3 style={{ color: '#fff', fontSize: '18px' }}>{srv.title}</h3>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff4d79' }}>
                            Starts at ₹{Number(srv.starting_price).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <p style={{ color: '#a0aec0', fontSize: '14px', marginTop: '8px', lineHeight: 1.5 }}>{srv.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#a0aec0' }}>No specific services listed.</p>
                )}
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div>
                {vendor.portfolios && vendor.portfolios.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {vendor.portfolios.map((media: any) => (
                      <div key={media.id} style={{ borderRadius: '8px', overflow: 'hidden', background: '#000', aspectRatio: '1/1', position: 'relative' }}>
                        {media.media_type === 'VIDEO' ? (
                          <video 
                            src={media.media_url} 
                            poster={media.thumbnail_url || media.image_url} 
                            controls 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <img 
                            src={media.image_url || media.media_url} 
                            alt={media.caption || 'Portfolio item'} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#a0aec0' }}>Portfolio coming soon.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Contact & Location */}
        <div style={{ flex: '1 1 30%', minWidth: '300px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px', position: 'sticky', top: '100px' }}>
            <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              Service Areas & Contact
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#718096', fontSize: '13px', marginBottom: '4px' }}>Base Location</div>
              <div style={{ color: '#cbd5e0', fontSize: '15px' }}>{vendor.address ? `${vendor.address}, ` : ''}{vendor.city}, {vendor.state} - {vendor.pincode}</div>
            </div>

            {vendor.service_area_cities && vendor.service_area_cities.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ color: '#718096', fontSize: '13px', marginBottom: '4px' }}>Service Areas</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {vendor.service_area_cities.map((c: string) => (
                    <span key={c} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '4px 10px', borderRadius: '16px', fontSize: '12px' }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button className="btn-search-primary" style={{ width: '100%', padding: '14px', fontSize: '16px', marginTop: '16px' }}>
              Check Availability
            </button>
            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: '#a0aec0' }}>
              Escrow protected booking via WedWithMe
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
