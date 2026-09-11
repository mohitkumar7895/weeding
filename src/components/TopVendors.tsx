'use client';

import React, { useState } from 'react';

interface Vendor {
  id: string;
  title: string;
  subtitle: string;
  rating: number;
  reviews: string;
  price: string;
  image: string;
}

const vendorList: Vendor[] = [
  {
    id: 'photographers',
    title: 'Photographers',
    subtitle: 'Capture Your Special Moments',
    rating: 4.8,
    reviews: '1.2k',
    price: '₹15,000',
    image: '/images/photographer.jpg',
  },
  {
    id: 'caterers',
    title: 'Caterers',
    subtitle: 'Delicious Food for Every Moment',
    rating: 4.7,
    reviews: '980',
    price: '₹20,000',
    image: '/images/caterer.jpg',
  },
  {
    id: 'decorators',
    title: 'Decorators',
    subtitle: 'Turn Dreams into Reality',
    rating: 4.9,
    reviews: '1.5k',
    price: '₹25,000',
    image: '/images/decorator.jpg',
  },
  {
    id: 'venues',
    title: 'Venues',
    subtitle: 'Stunning Spaces for Your Big Day',
    rating: 4.6,
    reviews: '760',
    price: '₹50,000',
    image: '/images/venue.jpg',
  },
];

export default function TopVendors() {
  const [favorites, setFavorites] = useState<{ [key: string]: boolean }>({});
  const [vendors, setVendors] = useState<Vendor[]>(vendorList);

  React.useEffect(() => {
    fetch('/api/vendors?limit=4')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data && d.data.length > 0) {
          const mapped = d.data.map((v: any) => ({
            id: v.id,
            title: v.business_name,
            subtitle: `${v.category_name} • ${v.city}`,
            rating: parseFloat(v.rating) || 4.8,
            reviews: `${v.review_count}`,
            price: `₹${parseFloat(v.starting_price).toLocaleString('en-IN')}`,
            image: v.cover_image || '/images/photographer.jpg'
          }));
          setVendors(mapped);
        }
      })
      .catch((err) => console.log('Live vendors fetch error, using cache:', err));
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section className="vendors-section" id="vendors">
      <div className="container-custom">
        {/* Section Header */}
        <div className="section-header">
          <div className="header-left">
            <h2 className="section-title">Top Wedding Vendors</h2>
            <p className="section-subtitle">
              Discover the best vendors near you. Quality. Trusted. Verified.
            </p>
          </div>
          <a href="#all-vendors" className="view-all-link">
            <span>View All</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>

        {/* Vendors Grid */}
        <div className="vendors-grid">
          {vendors.map((vendor) => {
            const isFav = !!favorites[vendor.id];
            return (
              <div key={vendor.id} className="vendor-card">
                {/* Image Wrap */}
                <div className="card-media">
                  <img src={vendor.image} alt={vendor.title} className="vendor-img" />
                  <button
                    className={`fav-btn ${isFav ? 'fav-active' : ''}`}
                    onClick={(e) => toggleFavorite(vendor.id, e)}
                    aria-label={`Add ${vendor.title} to favorites`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill={isFav ? '#e5c158' : 'none'}
                      stroke={isFav ? '#e5c158' : '#ffffff'}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>

                {/* Details */}
                <div className="card-body">
                  <h3 className="vendor-title">{vendor.title}</h3>
                  <p className="vendor-desc">{vendor.subtitle}</p>

                  <div className="card-footer">
                    <div className="rating-badge">
                      <span className="star-icon">★</span>
                      <span className="rating-num">{vendor.rating}</span>
                      <span className="reviews-count">({vendor.reviews})</span>
                    </div>

                    <div className="pricing-tag">
                      <span className="from-text">From </span>
                      <span className="price-val">{vendor.price}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .vendors-section {
          padding: 36px 0 54px;
          background-color: #ffffff;
        }

        .section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .section-title {
          font-family: var(--font-serif);
          font-size: 34px;
          font-weight: 700;
          color: #122119;
          margin-bottom: 6px;
          letter-spacing: -0.3px;
        }

        .section-subtitle {
          font-size: 14.5px;
          color: #617369;
        }

        .view-all-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 700;
          color: #162a20;
          transition: gap 0.2s ease, color 0.2s ease;
        }

        .view-all-link:hover {
          color: #e6005c;
          gap: 10px;
        }

        .vendors-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 22px;
        }

        .vendor-card {
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid #e7eee9;
          overflow: hidden;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
        }

        .vendor-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.09);
          border-color: #cbd8cf;
        }

        .card-media {
          position: relative;
          width: 100%;
          height: 184px;
          overflow: hidden;
          background-color: #eaf0ec;
        }

        .vendor-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .vendor-card:hover .vendor-img {
          transform: scale(1.05);
        }

        .fav-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .fav-btn:hover {
          background: rgba(0, 0, 0, 0.5);
          transform: scale(1.1);
        }

        .fav-active {
          background: #ffffff !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .card-body {
          padding: 18px 18px 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .vendor-title {
          font-size: 17px;
          font-weight: 700;
          color: #122119;
          margin-bottom: 4px;
          letter-spacing: 0.1px;
        }

        .vendor-desc {
          font-size: 12.5px;
          color: #64756c;
          margin-bottom: 14px;
          line-height: 1.4;
        }

        .card-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid #f0f4f1;
        }

        .rating-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
        }

        .star-icon {
          color: #fbc02d;
          font-size: 14px;
        }

        .rating-num {
          font-weight: 700;
          color: #122119;
        }

        .reviews-count {
          color: #7b8d84;
          font-size: 12px;
        }

        .pricing-tag {
          font-size: 13px;
        }

        .from-text {
          color: #7b8d84;
          font-size: 12px;
        }

        .price-val {
          font-weight: 800;
          color: #031710;
          font-size: 13.5px;
        }

        @media (max-width: 1024px) {
          .vendors-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          .section-title {
            font-size: 26px;
          }
          .vendors-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .card-media {
            height: 200px;
          }
        }
      `}</style>
    </section>
  );
}
