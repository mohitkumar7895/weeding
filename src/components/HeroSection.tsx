'use client';

import React, { useState } from 'react';

export default function HeroSection() {
  const [location, setLocation] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [guests, setGuests] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);

  const popularCities = ['Agra', 'Delhi NCR', 'Jaipur', 'Udaipur', 'Goa', 'Mumbai', 'Bengaluru'];
  const guestRanges = ['< 100 Guests', '100 - 250 Guests', '250 - 500 Guests', '500 - 1000 Guests', '1000+ Royal Feast'];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/vendors?city=${encodeURIComponent(location || '')}&date=${encodeURIComponent(weddingDate || '')}&guests=${encodeURIComponent(guests || '')}`;
  };

  return (
    <section className="hero-section">
      <div className="hero-backdrop">
        <img
          src="/images/hero.jpg"
          alt="Royal Indian destination wedding couple at palace sunset"
          className="hero-full-img"
        />
        <div className="hero-gradient-overlay"></div>
      </div>

      <div className="container-custom hero-inner-container">
        <div className="hero-content">
          <div className="eyebrow-text">
            AI-POWERED GLOBAL WEDDING PLATFORM
          </div>

          <h1 className="hero-main-title">
            From Match<br />to Marriage
          </h1>

          <div className="hero-tagline">
            <span>Plan</span>
            <span className="dot">•</span>
            <span>Book</span>
            <span className="dot">•</span>
            <span>Celebrate</span>
          </div>

          <p className="hero-subtext">
            Find your perfect match, trusted vendors,
            <br className="hide-mobile" />
            and create unforgettable moments — all in one place.
          </p>

          <form className="hero-search-pill" onSubmit={handleSearch}>
            <div
              className="pill-field clickable"
              onClick={() => {
                setShowLocationPicker(!showLocationPicker);
                setShowGuestPicker(false);
              }}
            >
              <div className="pill-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25382e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="pill-text-col">
                <span className="pill-title">City / Location</span>
                <span className="pill-subtitle">{location || '(e.g. Agra, Delhi)'}</span>
              </div>

              {showLocationPicker && (
                <div className="dropdown-panel" onClick={(e) => e.stopPropagation()}>
                  <div className="dropdown-heading">Popular Destinations</div>
                  <div className="dropdown-tags">
                    {popularCities.map((city) => (
                      <button
                        type="button"
                        key={city}
                        className={`tag-btn ${location === city ? 'tag-active' : ''}`}
                        onClick={() => {
                          setLocation(city);
                          setShowLocationPicker(false);
                        }}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pill-divider"></div>

            <div 
              className="pill-field date-field clickable"
              onClick={() => {
                const dateInput = document.getElementById('dateInput') as HTMLInputElement;
                if (dateInput) {
                  try {
                    if ('showPicker' in HTMLInputElement.prototype) {
                      dateInput.showPicker();
                    } else {
                      dateInput.focus();
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }
              }}
            >
              <div className="pill-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25382e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="pill-text-col">
                <label className="pill-title" htmlFor="dateInput">Wedding Date</label>
                <span className="pill-subtitle">{weddingDate || 'Select Date'}</span>
                <input
                  id="dateInput"
                  type="date"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  className="pill-date-hidden"
                />
              </div>
            </div>

            <div className="pill-divider"></div>

            <div
              className="pill-field clickable"
              onClick={() => {
                setShowGuestPicker(!showGuestPicker);
                setShowLocationPicker(false);
              }}
            >
              <div className="pill-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25382e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="pill-text-col">
                <span className="pill-title">Guests</span>
                <span className="pill-subtitle">{guests || 'Select'}</span>
              </div>

              {showGuestPicker && (
                <div className="dropdown-panel guest-panel" onClick={(e) => e.stopPropagation()}>
                  <div className="dropdown-heading">Guest Capacity</div>
                  <div className="guest-options">
                    {guestRanges.map((range) => (
                      <button
                        type="button"
                        key={range}
                        className={`guest-opt-btn ${guests === range ? 'guest-active' : ''}`}
                        onClick={() => {
                          setGuests(range);
                          setShowGuestPicker(false);
                        }}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pill-btn-wrap">
              <button type="submit" className="pill-search-btn">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .hero-section {
          position: relative;
          min-height: 620px;
          display: flex;
          align-items: center;
          padding: 72px 0 88px;
          overflow: visible;
          background: #061a12;
        }

        .hero-backdrop {
          position: absolute;
          inset: 0;
          z-index: 1;
          overflow: hidden;
        }

        .hero-full-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 78% center;
        }

        .hero-gradient-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(5, 24, 16, 0.94) 0%,
            rgba(5, 24, 16, 0.82) 28%,
            rgba(5, 24, 16, 0.42) 52%,
            rgba(5, 24, 16, 0.12) 72%,
            rgba(5, 24, 16, 0.04) 100%
          );
        }

        .hero-inner-container {
          position: relative;
          z-index: 2;
          width: 100%;
        }

        .hero-content {
          max-width: 720px;
        }

        .eyebrow-text {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 2.4px;
          text-transform: uppercase;
          color: #d7e4dc;
          margin-bottom: 18px;
        }

        .hero-main-title {
          font-family: var(--font-serif);
          font-size: 64px;
          font-weight: 700;
          line-height: 1.08;
          color: #ffffff;
          margin-bottom: 16px;
          letter-spacing: -0.8px;
          text-shadow: 0 2px 18px rgba(0, 0, 0, 0.25);
        }

        .hero-tagline {
          font-family: var(--font-serif);
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 24px;
          color: #ffffff;
          font-weight: 500;
          margin-bottom: 18px;
        }

        .hero-tagline .dot {
          color: #e5c158;
          font-size: 16px;
        }

        .hero-subtext {
          font-size: 16px;
          line-height: 1.65;
          color: #c8d9cf;
          margin-bottom: 36px;
          max-width: 520px;
        }

        .hero-search-pill {
          display: flex;
          align-items: center;
          background: #ffffff;
          border-radius: 9999px;
          padding: 8px 8px 8px 20px;
          box-shadow: 0 18px 46px rgba(0, 0, 0, 0.32);
          max-width: 780px;
          position: relative;
        }

        .pill-field {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 12px;
          position: relative;
        }

        .date-field {
          cursor: pointer;
        }

        .clickable {
          cursor: pointer;
          user-select: none;
        }

        .pill-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pill-text-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          position: relative;
        }

        .pill-title {
          font-size: 13px;
          font-weight: 700;
          color: #17241d;
          letter-spacing: 0.1px;
          cursor: pointer;
        }

        .pill-subtitle {
          font-size: 12px;
          color: #7b8e84;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pill-date-hidden {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
        }

        .pill-divider {
          width: 1px;
          height: 36px;
          background-color: #e4ece7;
        }

        .pill-btn-wrap {
          padding-left: 6px;
        }

        .pill-search-btn {
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          font-size: 14.5px;
          font-weight: 800;
          padding: 13px 36px;
          border-radius: 9999px;
          box-shadow: 0 4px 16px rgba(230, 0, 92, 0.4);
          transition: all 0.2s ease;
          letter-spacing: 0.2px;
        }

        .pill-search-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 6px 22px rgba(230, 0, 92, 0.55);
          filter: brightness(1.08);
        }

        .dropdown-panel {
          position: absolute;
          top: calc(100% + 14px);
          left: 0;
          min-width: 280px;
          background: #ffffff;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
          border: 1px solid #e7ece8;
          z-index: 100;
        }

        .guest-panel {
          left: auto;
          right: 0;
        }

        .dropdown-heading {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #72847a;
          margin-bottom: 10px;
        }

        .dropdown-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag-btn {
          font-size: 12px;
          padding: 5px 12px;
          border-radius: 9999px;
          background: #f2f5f3;
          color: #24352c;
          border: 1px solid #dce4de;
          transition: all 0.15s ease;
        }

        .tag-btn.tag-active,
        .tag-btn:hover {
          background: #061a12;
          color: #ffffff;
          border-color: #061a12;
        }

        .guest-options {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .guest-opt-btn {
          text-align: left;
          font-size: 13px;
          padding: 7px 12px;
          border-radius: 8px;
          color: #23342b;
          transition: background 0.15s ease;
        }

        .guest-opt-btn.guest-active,
        .guest-opt-btn:hover {
          background: #f0f7f3;
          color: #061a12;
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .hero-main-title {
            font-size: 48px;
          }
          .desktop-nav {
            position: static;
            transform: none;
          }
        }

        @media (max-width: 768px) {
          .hero-section {
            padding: 42px 0 52px;
            min-height: auto;
          }
          .hero-full-img {
            object-position: 80% center;
          }
          .hero-gradient-overlay {
            background: linear-gradient(
              180deg,
              rgba(4, 22, 15, 0.72) 0%,
              rgba(4, 22, 15, 0.88) 48%,
              rgba(4, 22, 15, 0.94) 100%
            );
          }
          .hero-main-title {
            font-size: 40px;
          }
          .hero-tagline {
            font-size: 20px;
          }
          .hero-search-pill {
            flex-direction: column;
            border-radius: 20px;
            padding: 16px;
            gap: 10px;
            align-items: stretch;
          }
          .pill-divider {
            width: 100%;
            height: 1px;
          }
          .pill-field {
            padding: 6px 2px;
          }
          .pill-btn-wrap {
            padding-left: 0;
            width: 100%;
          }
          .pill-search-btn {
            width: 100%;
            padding: 12px;
          }
          .hide-mobile {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
