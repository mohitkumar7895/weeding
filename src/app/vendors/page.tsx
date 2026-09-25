'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import VendorCategoryGrid from '@/components/VendorCategoryGrid';
import { findVendorCategory, VENDOR_CATEGORIES } from '@/lib/vendorCategories';

const CITIES = ['Delhi NCR', 'Mumbai', 'Jaipur', 'Bengaluru', 'Lucknow', 'Udaipur', 'Goa', 'Chandigarh', 'Agra'];

export default function VendorsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const goFind = () => {
    const q = searchQuery.trim();
    const hit =
      findVendorCategory(q) ||
      VENDOR_CATEGORIES.find(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.aliases.some((a) => a.toLowerCase().includes(q.toLowerCase()) || q.toLowerCase().includes(a))
      );
    const params = new URLSearchParams();
    if (selectedCity && selectedCity !== 'ALL') params.set('city', selectedCity);
    if (q && !hit) params.set('search', q);
    if (!hit) return;
    const qs = params.toString();
    router.push(qs ? `/vendors/category/${hit.slug}?${qs}` : `/vendors/category/${hit.slug}`);
  };

  return (
    <div className="vendors-page-root">
      <Navbar
        onOpenLogin={() => {
          setAuthMode('login');
          setAuthModalOpen(true);
        }}
        onOpenRegister={() => {
          setAuthMode('register');
          setAuthModalOpen(true);
        }}
      />

      <main>
        <section className="vendors-hero-section">
          <div className="container-custom">
            <div className="hero-text-center">
              <span className="hero-badge">Verified Indian Wedding Marketplace</span>
              <h1 className="hero-title">Book Top Wedding Vendors with Escrow Protection</h1>

              <div className="search-filter-card">
                <div className="search-input-group">
                  <span className="input-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by category, vendor name, or specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') goFind();
                    }}
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
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="button" className="btn-search-primary" onClick={goFind}>
                  Find Vendors
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="category-mosaic-section">
          <div className="container-custom">
            <div className="mosaic-heading">
              <h2>Wedding categories</h2>
              <p>Open a category to see vendors on a dedicated page.</p>
            </div>
            <VendorCategoryGrid />
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} initialMode={authMode} onClose={() => setAuthModalOpen(false)} />
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
          margin-bottom: 28px;
          color: #ffffff;
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
        }

        .category-mosaic-section {
          background: #07261c;
          padding: 28px 0 48px;
          flex: 1;
        }
        .mosaic-heading {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 16px;
          color: #fff;
        }
        .mosaic-heading h2 {
          margin: 0;
          font-size: 22px;
        }
        .mosaic-heading p {
          margin: 0;
          color: #d7e8df;
          font-size: 14px;
        }

        @media (max-width: 720px) {
          .hero-title {
            font-size: 26px;
          }
          .search-filter-card {
            flex-direction: column;
            align-items: stretch;
          }
          .city-select-group {
            border-left: none;
            padding-left: 10px;
          }
        }
      `}</style>
    </div>
  );
}
