'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type HomeVendor = {
  id: string;
  business_name: string;
  category_name?: string;
  city?: string;
  rating?: number | string;
  review_count?: number;
  starting_price?: number | string;
  cover_image?: string;
};

export default function TopVendors() {
  const router = useRouter();
  const [vendors, setVendors] = useState<HomeVendor[]>([]);

  useEffect(() => {
    fetch('/api/vendors?limit=4')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) setVendors(data.data.slice(0, 4));
      })
      .catch(() => setVendors([]));
  }, []);

  return (
    <section className="vendors-section" id="vendors">
      <div className="container-custom">
        <div className="section-header reveal-on-scroll">
          <div className="header-left">
            <h2 className="section-title">Top Wedding Vendors</h2>
            <p className="section-subtitle">
              The same verified vendors as the directory. Open a profile to check dates, pick a package, and pay escrow.
            </p>
          </div>
          <Link href="/vendors" className="view-all-link">
            <span>View All</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>

        <div className="vendors-grid">
          {vendors.map((vendor, idx) => {
            const price = Number(vendor.starting_price || 0);
            const rating = Number(vendor.rating || 0);
            const reviews = vendor.review_count || 0;
            return (
              <div
                key={vendor.id}
                className={`vendor-card reveal-on-scroll stagger-${idx + 1}`}
                onClick={() => router.push(`/vendors/${vendor.id}#vendor-book-panel`)}
              >
                <div className="card-media">
                  <img
                    src={vendor.cover_image || '/images/photographer.jpg'}
                    alt={vendor.business_name}
                    className="vendor-img"
                  />
                  <div className="card-media-overlay" />
                </div>
                <div className="card-body">
                  <h3 className="vendor-title">{vendor.business_name}</h3>
                  <p className="vendor-desc">{[vendor.category_name, vendor.city].filter(Boolean).join(' · ') || 'Wedding vendor'}</p>
                  <div className="card-footer">
                    <div className="rating-badge">
                      <span className="star-icon">★</span>
                      <span className="rating-num">{rating ? rating.toFixed(1) : '—'}</span>
                      <span className="reviews-count">({reviews})</span>
                    </div>
                    <div className="pricing-tag">
                      <span className="from-text">From </span>
                      <span className="price-val">₹{price.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {vendors.length === 0 && (
          <p className="empty-note">No verified vendors yet. They will appear here and in the directory together.</p>
        )}
      </div>

      <style jsx>{`
        .vendors-section {
          padding: 46px 0 54px;
          background: #ffffff;
          color: #122119;
        }
        .section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 26px;
        }
        .section-title {
          font-family: var(--font-serif);
          font-size: 30px;
          font-weight: 700;
          color: #122119;
          margin-bottom: 4px;
        }
        .section-subtitle {
          font-size: 14px;
          color: #5f6e66;
          max-width: 520px;
        }
        .view-all-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #122119;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
        }
        .vendors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 20px;
        }
        .vendor-card {
          background: #ffffff;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid #e7eee9;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          cursor: pointer;
          display: flex;
          flex-direction: column;
        }
        .vendor-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
        }
        .card-media {
          position: relative;
          height: 175px;
          overflow: hidden;
        }
        .vendor-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .card-media-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.25) 100%);
        }
        .card-body {
          padding: 14px 16px 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .vendor-title {
          font-size: 16px;
          font-weight: 700;
          color: #14231b;
          margin-bottom: 3px;
        }
        .vendor-desc {
          font-size: 12.5px;
          color: #697a71;
          margin-bottom: 12px;
        }
        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid #f0f4f1;
        }
        .rating-badge {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 13px;
        }
        .star-icon { color: #ff2a73; }
        .rating-num { font-weight: 700; color: #16241e; }
        .reviews-count { color: #788980; font-size: 12px; }
        .from-text { font-size: 12px; color: #788980; }
        .price-val { font-size: 13.5px; font-weight: 800; color: #16241e; }
        .empty-note { margin-top: 16px; color: #5f6e66; }
        @media (max-width: 640px) {
          .vendors-grid { grid-template-columns: 1fr; }
          .section-header { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </section>
  );
}
