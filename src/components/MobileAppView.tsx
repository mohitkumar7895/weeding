'use client';

import React, { useState } from 'react';

interface MobileAppViewProps {
  onOpenDesktop?: () => void;
  onOpenLoginModal?: () => void;
}

export default function MobileAppView({ onOpenLoginModal }: MobileAppViewProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'matches' | 'bookings' | 'vendors' | 'profile'>('home');
  const [selectedCity, setSelectedCity] = useState('Firozabad');
  const [showCityPicker, setShowCityPicker] = useState(false);
  
  // Sub-screens & modals
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showSagunChat, setShowSagunChat] = useState(false);
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(false);
  const [showReelsModal, setShowReelsModal] = useState(false);

  // Tab internal states
  const [matchFilter, setMatchFilter] = useState<'foryou' | 'liked' | 'requests'>('foryou');
  const [bookingFilter, setBookingFilter] = useState<'upcoming' | 'completed'>('upcoming');
  const [vendorCategory, setVendorCategory] = useState<'all' | 'photographers' | 'caterers' | 'decorators' | 'venues'>('all');
  const [likedProfiles, setLikedProfiles] = useState<number[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Chat messages
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'sagun', text: "Hello! I'm Sagun 🙏, Your AI wedding assistant. How can I help you today?" },
    { sender: 'user', text: "मुझे 200 लोगों के लिए वेडिंग वेन्यू चाहिए, बजट 2 लाख तक है." },
    { sender: 'sagun', text: "यह आपके लिए कुछ बेहतरीन वेन्यू ऑप्शंस हैं:" },
  ]);

  const matchesData = [
    {
      id: 1,
      name: 'Priya Sharma',
      age: 24,
      height: "5'4\"",
      city: 'Lucknow',
      matchScore: '96% Match',
      profession: 'IT Professional',
      religion: 'Hindu',
      education: 'B.Tech',
      image: '/images/priya.jpg',
    },
    {
      id: 2,
      name: 'Ananya Verma',
      age: 25,
      height: "5'5\"",
      city: 'Delhi NCR',
      matchScore: '94% Match',
      profession: 'Product Designer',
      religion: 'Hindu',
      education: 'NIFT Graduate',
      image: '/images/priya.jpg',
    },
  ];

  const [liveMatches, setLiveMatches] = useState<any[]>(matchesData);
  const [liveVendors, setLiveVendors] = useState<any[]>([]);

  React.useEffect(() => {
    // Fetch live matches
    fetch('/api/matrimonial/matches')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data && d.data.length > 0) {
          const mapped = d.data.map((m: any, idx: number) => ({
            id: idx + 1,
            name: m.name,
            age: m.age,
            height: `${Math.floor(m.height_cm / 30.48)}'${Math.round((m.height_cm % 30.48) / 2.54)}"`,
            city: m.city,
            matchScore: `${m.match_score}% Match`,
            profession: m.profession,
            religion: m.religion,
            education: m.education,
            image: m.photo_url || '/images/priya.jpg',
          }));
          setLiveMatches(mapped);
        }
      })
      .catch(() => {});

    // Fetch live vendors
    fetch('/api/vendors')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setLiveVendors(d.data);
        }
      })
      .catch(() => {});
  }, []);

  const activeMatchesList = liveMatches.length > 0 ? liveMatches : matchesData;

  const handleLikeMatch = (id: number) => {
    setLikedProfiles((prev) => [...prev, id]);
    setActiveMatchIndex((prev) => (prev + 1) % activeMatchesList.length);
  };

  const handlePassMatch = () => {
    setActiveMatchIndex((prev) => (prev + 1) % activeMatchesList.length);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const query = chatInput;
    setChatMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setChatInput('');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        let reply = data.data.reply;
        if (data.data.structuredData?.items?.length) {
          const names = data.data.structuredData.items
            .map((i: any) => `• ${i.business_name || i.name} (${i.city || ''})`)
            .join('\n');
          reply += `\n\n${names}`;
        }
        setChatMessages((prev) => [...prev, { sender: 'sagun', text: reply }]);
      } else {
        throw new Error();
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'sagun',
          text: `मैंने "${query}" के लिए बेस्ट वेडिंग वेंडर्स और ऑफर्स खोज निकाले हैं! आप इन्हें डायरेक्ट बुक कर सकते हैं।`,
        },
      ]);
    }
  };

  const currentMatch = activeMatchesList[activeMatchIndex] || activeMatchesList[0];

  return (
    <div className="mobile-app-root">
      {/* ================= TOP APP HEADER ================= */}
      <header className="app-header">
        {/* Left: Hamburger menu or Back button if in sub-screen */}
        <div className="header-left">
          {showBookingDetails || showSagunChat || showNotifications ? (
            <button
              className="header-icon-btn"
              onClick={() => {
                setShowBookingDetails(false);
                setShowSagunChat(false);
                setShowNotifications(false);
              }}
              aria-label="Back"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          ) : (
            <button className="header-icon-btn" onClick={() => setShowWelcomeSplash(true)} aria-label="Menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="16" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}

          {/* Location Selector */}
          {!showBookingDetails && !showSagunChat && !showNotifications && (
            <div className="city-selector-wrap" onClick={() => setShowCityPicker(!showCityPicker)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#e5c158">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span className="city-name">{selectedCity}</span>
              <span className="arrow-down">▼</span>

              {showCityPicker && (
                <div className="city-dropdown" onClick={(e) => e.stopPropagation()}>
                  {['Firozabad', 'Agra', 'Delhi NCR', 'Jaipur', 'Lucknow'].map((city) => (
                    <div
                      key={city}
                      className={`city-opt ${selectedCity === city ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedCity(city);
                        setShowCityPicker(false);
                      }}
                    >
                      {city}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Brand Monogram */}
        <div className="header-center">
          <div className="brand-monogram">
            <svg width="34" height="24" viewBox="0 0 54 40" fill="none">
              <defs>
                <linearGradient id="mobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff2a73" />
                  <stop offset="100%" stopColor="#e6005c" />
                </linearGradient>
                <linearGradient id="mobHeart" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff528c" />
                  <stop offset="100%" stopColor="#d8004f" />
                </linearGradient>
              </defs>
              <path d="M4 10L11 32L17 14L22 30L26 12" stroke="url(#mobGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z" fill="url(#mobHeart)" />
              <path d="M28 12L32 30L37 14L43 32L50 10" stroke="url(#mobGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Right: Notifications Bell */}
        <div className="header-right">
          <button
            className="header-icon-btn notif-btn"
            onClick={() => setShowNotifications(true)}
            aria-label="Notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="notif-dot"></span>
          </button>
        </div>
      </header>

      {/* ================= MAIN SCROLLABLE BODY ================= */}
      <main className="mobile-scroll-container">
        {/* ================= TAB 1: HOME ================= */}
        {activeTab === 'home' && (
          <div className="tab-pane home-tab">
            {/* Hero Card with Couple */}
            <div className="mob-hero-card">
              <div className="mob-hero-text">
                <h2 className="mob-hero-title">Your Perfect Wedding Journey Starts Here</h2>
              </div>
              <div className="mob-hero-img-wrap">
                <img src="/images/hero.jpg" alt="Wedding Couple" className="mob-couple-thumbnail" />
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="mob-search-bar" onClick={() => setActiveTab('vendors')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#75887e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="search-placeholder">Search vendors, matches, or services...</span>
            </div>

            {/* 4 Circular Category Icons */}
            <div className="mob-category-grid">
              <div className="cat-item" onClick={() => setActiveTab('vendors')}>
                <div className="cat-icon-circle cat-green">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="8" cy="14" r="5" />
                    <circle cx="16" cy="14" r="5" />
                    <path d="M8 9l1.5-3.5h5L16 9" />
                  </svg>
                </div>
                <span className="cat-label">Vendors</span>
              </div>

              <div className="cat-item" onClick={() => setActiveTab('matches')}>
                <div className="cat-icon-circle cat-peach">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
                <span className="cat-label">Matches</span>
              </div>

              <div className="cat-item" onClick={() => setActiveTab('bookings')}>
                <div className="cat-icon-circle cat-teal">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <span className="cat-label">Bookings</span>
              </div>

              <div className="cat-item" onClick={() => setShowSagunChat(true)}>
                <div className="cat-icon-circle cat-gray">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </div>
                <span className="cat-label">More</span>
              </div>
            </div>

            {/* Featured Vendors Row */}
            <div className="section-block">
              <div className="block-header">
                <h3 className="block-title">Featured Vendors</h3>
                <button className="view-all-btn" onClick={() => setActiveTab('vendors')}>
                  View All →
                </button>
              </div>

              <div className="horizontal-vendors-scroll">
                {/* Vendor 1 */}
                <div className="compact-vendor-card" onClick={() => setActiveTab('vendors')}>
                  <div className="thumb-wrap">
                    <img src="/images/photographer.jpg" alt="Photographers" className="vendor-thumb" />
                  </div>
                  <span className="v-name">Photographers</span>
                  <div className="v-rating">
                    <span className="star">★</span> 4.8
                  </div>
                </div>

                {/* Vendor 2 */}
                <div className="compact-vendor-card" onClick={() => setActiveTab('vendors')}>
                  <div className="thumb-wrap">
                    <img src="/images/caterer.jpg" alt="Caterers" className="vendor-thumb" />
                  </div>
                  <span className="v-name">Caterers</span>
                  <div className="v-rating">
                    <span className="star">★</span> 4.7
                  </div>
                </div>

                {/* Vendor 3 */}
                <div className="compact-vendor-card" onClick={() => setActiveTab('vendors')}>
                  <div className="thumb-wrap">
                    <img src="/images/decorator.jpg" alt="Decorators" className="vendor-thumb" />
                  </div>
                  <span className="v-name">Decorators</span>
                  <div className="v-rating">
                    <span className="star">★</span> 4.9
                  </div>
                </div>
              </div>
            </div>

            {/* Meet Sagun Card Banner */}
            <div className="mob-sagun-card" onClick={() => setShowSagunChat(true)}>
              <div className="sagun-mini-avatar">
                <img src="/images/sagun.jpg" alt="Sagun" />
                <span className="pulse-circle"></span>
              </div>
              <div className="sagun-text">
                <div className="sagun-badge">SAGUN AI ASSISTANT</div>
                <div className="sagun-speech">Ask anything in Hindi or English...</div>
              </div>
              <button className="btn-chat-sagun">Chat →</button>
            </div>

            {/* Reels Video Story Card (Screen 9) */}
            <div className="reels-banner-card" onClick={() => setShowReelsModal(true)}>
              <img src="/images/decorator.jpg" alt="Wedding Reels" className="reels-bg-img" />
              <div className="reels-overlay"></div>
              <div className="reels-play-icon">▶</div>
              <div className="reels-caption">
                <h4>Dream Weddings</h4>
                <p>Real Moments & Celebrations</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MATCHES (Screen 3) ================= */}
        {activeTab === 'matches' && (
          <div className="tab-pane matches-tab">
            {/* Top Sub-tabs */}
            <div className="sub-tabs-pills">
              <button
                className={`pill-tab ${matchFilter === 'foryou' ? 'pill-active' : ''}`}
                onClick={() => setMatchFilter('foryou')}
              >
                For You
              </button>
              <button
                className={`pill-tab ${matchFilter === 'liked' ? 'pill-active' : ''}`}
                onClick={() => setMatchFilter('liked')}
              >
                Liked ({likedProfiles.length})
              </button>
              <button
                className={`pill-tab ${matchFilter === 'requests' ? 'pill-active' : ''}`}
                onClick={() => setMatchFilter('requests')}
              >
                Requests
              </button>
            </div>

            {/* Match Profile Card */}
            <div className="match-card-container">
              <div className="match-photo-wrapper">
                <img src={currentMatch.image} alt={currentMatch.name} className="match-portrait" />
                <div className="match-score-badge">{currentMatch.matchScore}</div>
              </div>

              <div className="match-info-card">
                <h3 className="profile-name-text">{currentMatch.name}</h3>
                <p className="profile-meta-text">
                  {currentMatch.age} yrs • {currentMatch.height} • {currentMatch.city}
                </p>

                <div className="profile-tag-list">
                  <div className="prof-tag">💼 {currentMatch.profession}</div>
                  <div className="prof-tag">🕉️ {currentMatch.religion}</div>
                  <div className="prof-tag">🎓 {currentMatch.education}</div>
                </div>

                {/* Like / Pass buttons */}
                <div className="match-actions-row">
                  <button className="match-action-btn btn-pass" onClick={handlePassMatch} aria-label="Pass">
                    ✕
                  </button>
                  <button className="match-action-btn btn-like" onClick={() => handleLikeMatch(currentMatch.id)} aria-label="Like">
                    ♥
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: BOOKINGS (Screen 8) ================= */}
        {activeTab === 'bookings' && (
          <div className="tab-pane bookings-tab">
            <h2 className="tab-page-title">Bookings</h2>

            {/* Upcoming / Completed Tabs */}
            <div className="line-tabs-row">
              <button
                className={`line-tab ${bookingFilter === 'upcoming' ? 'line-active' : ''}`}
                onClick={() => setBookingFilter('upcoming')}
              >
                Upcoming
              </button>
              <button
                className={`line-tab ${bookingFilter === 'completed' ? 'line-active' : ''}`}
                onClick={() => setBookingFilter('completed')}
              >
                Completed
              </button>
            </div>

            {/* Booking Cards */}
            <div className="booking-items-list">
              {/* Item 1 */}
              <div className="booking-list-card">
                <img src="/images/venue.jpg" alt="Royal Palace Venue" className="booking-thumb" />
                <div className="booking-info">
                  <h4 className="b-title">Royal Palace Venue</h4>
                  <p className="b-loc">Agra</p>
                  <p className="b-date">12 Nov 2026 • Confirmed</p>
                  <button className="btn-view-booking" onClick={() => setShowBookingDetails(true)}>
                    View Details
                  </button>
                </div>
              </div>

              {/* Item 2 */}
              <div className="booking-list-card">
                <img src="/images/caterer.jpg" alt="Zaika Caterers" className="booking-thumb" />
                <div className="booking-info">
                  <h4 className="b-title">Zaika Caterers</h4>
                  <p className="b-loc">Agra</p>
                  <p className="b-date">12 Nov 2026</p>
                  <button className="btn-view-booking" onClick={() => setShowBookingDetails(true)}>
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: VENDORS (Screen 4) ================= */}
        {activeTab === 'vendors' && (
          <div className="tab-pane vendors-tab">
            <div className="vendor-tab-header">
              <h2 className="tab-page-title">Vendors</h2>
              <button className="filter-icon-btn">⚙</button>
            </div>

            {/* Search Input */}
            <div className="vendor-search-input-wrap">
              <input type="text" placeholder="Search vendors..." className="vendor-search-field" />
              <button className="filter-chip-btn">Filter</button>
            </div>

            {/* Horizontal Filter Chips */}
            <div className="horizontal-chips-bar">
              {[
                { id: 'all', label: 'All' },
                { id: 'photographers', label: 'Photographers' },
                { id: 'caterers', label: 'Caterers' },
                { id: 'decorators', label: 'Decorators' },
              ].map((c) => (
                <button
                  key={c.id}
                  className={`vendor-cat-chip ${vendorCategory === c.id ? 'chip-active' : ''}`}
                  onClick={() => setVendorCategory(c.id as any)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Vendor List */}
            <div className="vendors-vertical-list">
              {/* Card 1 */}
              <div className="v-card-row" onClick={() => setShowBookingDetails(true)}>
                <img src="/images/photographer.jpg" alt="Royal Clicks Photography" className="v-row-img" />
                <div className="v-row-info">
                  <div className="v-title-row">
                    <h4 className="v-row-title">Royal Clicks Photography</h4>
                    <span className="heart-icon">♥</span>
                  </div>
                  <div className="v-rating-sub">★ 4.8 (1.2k)</div>
                  <div className="v-price-sub">From ₹15,000</div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="v-card-row" onClick={() => setShowBookingDetails(true)}>
                <img src="/images/caterer.jpg" alt="Zaika Caterers" className="v-row-img" />
                <div className="v-row-info">
                  <div className="v-title-row">
                    <h4 className="v-row-title">Zaika Caterers</h4>
                    <span className="heart-icon">♥</span>
                  </div>
                  <div className="v-rating-sub">★ 4.7 (980)</div>
                  <div className="v-price-sub">From ₹20,000</div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="v-card-row" onClick={() => setShowBookingDetails(true)}>
                <img src="/images/decorator.jpg" alt="Dream Decor" className="v-row-img" />
                <div className="v-row-info">
                  <div className="v-title-row">
                    <h4 className="v-row-title">Dream Decor</h4>
                    <span className="heart-icon">♥</span>
                  </div>
                  <div className="v-rating-sub">★ 4.9 (1.5k)</div>
                  <div className="v-price-sub">From ₹25,000</div>
                </div>
              </div>

              {/* Card 4 */}
              <div className="v-card-row" onClick={() => setShowBookingDetails(true)}>
                <img src="/images/venue.jpg" alt="Royal Palace Venue" className="v-row-img" />
                <div className="v-row-info">
                  <div className="v-title-row">
                    <h4 className="v-row-title">Royal Palace Venue</h4>
                    <span className="heart-icon">♥</span>
                  </div>
                  <div className="v-rating-sub">★ 4.6 (760)</div>
                  <div className="v-price-sub">From ₹50,000</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: PROFILE (Screen 7) ================= */}
        {activeTab === 'profile' && (
          <div className="tab-pane profile-tab">
            <h2 className="tab-page-title">My Profile</h2>

            {/* Profile User Card */}
            <div className="user-profile-header-card">
              <img src="/images/gopal.jpg" alt="Gopal Yadav" className="user-profile-avatar" />
              <div className="user-profile-meta">
                <h3 className="user-name">Gopal Yadav</h3>
                <p className="user-since">Member since 2026</p>
              </div>
            </div>

            {/* Profile Navigation List */}
            <div className="profile-menu-list">
              <div className="profile-menu-item" onClick={() => onOpenLoginModal && onOpenLoginModal()}>
                <span className="menu-icon">👤</span>
                <span className="menu-text">My Details</span>
                <span className="menu-arrow">›</span>
              </div>
              <div className="profile-menu-item" onClick={() => setActiveTab('bookings')}>
                <span className="menu-icon">📅</span>
                <span className="menu-text">My Bookings</span>
                <span className="menu-arrow">›</span>
              </div>
              <div className="profile-menu-item" onClick={() => setActiveTab('matches')}>
                <span className="menu-icon">💖</span>
                <span className="menu-text">My Matches</span>
                <span className="menu-arrow">›</span>
              </div>
              <div className="profile-menu-item" onClick={() => setActiveTab('vendors')}>
                <span className="menu-icon">🏷️</span>
                <span className="menu-text">Saved Vendors</span>
                <span className="menu-arrow">›</span>
              </div>
              <div className="profile-menu-item" onClick={() => alert('Settings opened')}>
                <span className="menu-icon">⚙️</span>
                <span className="menu-text">Settings</span>
                <span className="menu-arrow">›</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= BOTTOM NAVIGATION BAR (5 Tabs) ================= */}
      <nav className="bottom-nav-bar">
        <button
          className={`nav-btn ${activeTab === 'home' ? 'nav-active' : ''}`}
          onClick={() => {
            setActiveTab('home');
            setShowBookingDetails(false);
            setShowSagunChat(false);
          }}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'matches' ? 'nav-active' : ''}`}
          onClick={() => {
            setActiveTab('matches');
            setShowBookingDetails(false);
            setShowSagunChat(false);
          }}
        >
          <span className="nav-icon">💖</span>
          <span className="nav-label">Matches</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'bookings' ? 'nav-active' : ''}`}
          onClick={() => {
            setActiveTab('bookings');
            setShowBookingDetails(false);
            setShowSagunChat(false);
          }}
        >
          <span className="nav-icon">📅</span>
          <span className="nav-label">Bookings</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'vendors' ? 'nav-active' : ''}`}
          onClick={() => {
            setActiveTab('vendors');
            setShowBookingDetails(false);
            setShowSagunChat(false);
          }}
        >
          <span className="nav-icon">👥</span>
          <span className="nav-label">Vendors</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'profile' ? 'nav-active' : ''}`}
          onClick={() => {
            setActiveTab('profile');
            setShowBookingDetails(false);
            setShowSagunChat(false);
          }}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profile</span>
        </button>
      </nav>

      {/* ================= SUB-SCREEN: BOOKING DETAILS (Screen 5) ================= */}
      {showBookingDetails && (
        <div className="sub-screen-overlay">
          <div className="sub-screen-header">
            <button className="back-btn" onClick={() => setShowBookingDetails(false)}>
              ← Booking Details
            </button>
          </div>

          <div className="sub-screen-body">
            <img src="/images/venue.jpg" alt="Royal Palace Venue" className="detail-hero-img" />

            <div className="detail-content-pad">
              <h2 className="detail-title">Royal Palace Venue</h2>
              <div className="detail-rating-row">
                <span className="star">★</span> 4.6 (760) • <span className="loc">Agra • Heritage Resort</span>
              </div>

              {/* Amenities */}
              <div className="amenities-row">
                <div className="amenity-pill">🏰 Banquet Hall</div>
                <div className="amenity-pill">🌳 Outdoor Lawn</div>
                <div className="amenity-pill">🚗 Parking</div>
                <div className="amenity-pill">🍽️ Catering</div>
              </div>

              {/* Package Details */}
              <div className="package-card">
                <div className="pkg-header">
                  <span className="pkg-title">Package Details</span>
                  <span className="pkg-arrow">›</span>
                </div>
                <div className="pkg-row">
                  <div>
                    <div className="pkg-name">Premium Package</div>
                    <div className="pkg-sub">(for 200 guests)</div>
                  </div>
                  <div className="pkg-price">₹1,50,000</div>
                </div>
              </div>

              <button
                className="btn-book-now"
                onClick={() => alert('Booking request sent for Royal Palace Venue!')}
              >
                Book Now
              </button>

              <button className="btn-more-packages" onClick={() => alert('Viewing packages...')}>
                More Packages →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-SCREEN: SAGUN AI CHAT (Screen 6) ================= */}
      {showSagunChat && (
        <div className="sub-screen-overlay">
          <div className="sagun-chat-header">
            <button className="back-btn" onClick={() => setShowSagunChat(false)}>
              ←
            </button>
            <div className="sagun-header-profile">
              <img src="/images/sagun.jpg" alt="Sagun" className="sagun-chat-avatar" />
              <div>
                <div className="sagun-name">Sagun <span className="online-tag">• Online</span></div>
                <div className="sagun-sub">Your AI Wedding Assistant</div>
              </div>
            </div>
          </div>

          <div className="sagun-chat-messages">
            {chatMessages.map((m, idx) => (
              <div key={idx} className={`chat-bubble-row ${m.sender === 'user' ? 'user-row' : 'sagun-row'}`}>
                <div className={`chat-bubble-box ${m.sender === 'user' ? 'user-bubble' : 'sagun-bubble'}`}>
                  {m.text}
                </div>
              </div>
            ))}

            {/* Recommended Venue Card from Sagun */}
            <div className="chat-venue-rec-card" onClick={() => setShowBookingDetails(true)}>
              <img src="/images/venue.jpg" alt="Royal Palace Venue" className="rec-img" />
              <div className="rec-info">
                <h4 className="rec-title">Royal Palace Venue</h4>
                <p className="rec-loc">Agra • 1.2 km</p>
                <p className="rec-price">₹1,50,000 (200 guests)</p>
                <button className="rec-btn">View Details</button>
              </div>
            </div>
          </div>

          <form className="sagun-chat-input-bar" onSubmit={handleSendChat}>
            <button type="button" className="mic-icon-btn" onClick={() => alert('Voice listening in Hindi...')}>
              🎤
            </button>
            <input
              type="text"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="chat-text-input"
            />
            <button type="submit" className="chat-send-btn">
              ➤
            </button>
          </form>
        </div>
      )}

      {/* ================= SUB-SCREEN: NOTIFICATIONS (Screen 10) ================= */}
      {showNotifications && (
        <div className="sub-screen-overlay">
          <div className="sub-screen-header">
            <button className="back-btn" onClick={() => setShowNotifications(false)}>
              ← Notifications
            </button>
          </div>

          <div className="notifications-list">
            <div className="notif-item" onClick={() => { setActiveTab('matches'); setShowNotifications(false); }}>
              <div className="notif-avatar pink-bg">💖</div>
              <div className="notif-content">
                <div className="notif-title">New match found</div>
                <div className="notif-desc">Priya Sharma liked your profile</div>
              </div>
              <div className="notif-time">2m</div>
            </div>

            <div className="notif-item" onClick={() => { setActiveTab('bookings'); setShowNotifications(false); }}>
              <div className="notif-avatar green-bg">📅</div>
              <div className="notif-content">
                <div className="notif-title">Booking confirmed</div>
                <div className="notif-desc">Royal Palace Venue</div>
              </div>
              <div className="notif-time">1h</div>
            </div>

            <div className="notif-item" onClick={() => { setActiveTab('vendors'); setShowNotifications(false); }}>
              <div className="notif-avatar teal-bg">💬</div>
              <div className="notif-content">
                <div className="notif-title">Vendor message</div>
                <div className="notif-desc">Zaika Caterers sent a message</div>
              </div>
              <div className="notif-time">3h</div>
            </div>

            <div className="notif-item">
              <div className="notif-avatar rose-bg">⏰</div>
              <div className="notif-content">
                <div className="notif-title">Reminder</div>
                <div className="notif-desc">Your wedding date is coming soon!</div>
              </div>
              <div className="notif-time">1d</div>
            </div>

            <div className="notif-item">
              <div className="notif-avatar gold-bg">🏷️</div>
              <div className="notif-content">
                <div className="notif-title">New offer</div>
                <div className="notif-desc">Get 15% off on decor services</div>
              </div>
              <div className="notif-time">2d</div>
            </div>
          </div>
        </div>
      )}

      {/* ================= WELCOME / ONBOARDING SPLASH MODAL (Screen 1) ================= */}
      {showWelcomeSplash && (
        <div className="splash-overlay" onClick={() => setShowWelcomeSplash(false)}>
          <div className="splash-card" onClick={(e) => e.stopPropagation()}>
            <div className="splash-logo">
              <svg width="60" height="42" viewBox="0 0 54 40" fill="none">
                <path d="M4 10L11 32L17 14L22 30L26 12" stroke="url(#mobGrad)" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z" fill="url(#mobHeart)" />
                <path d="M28 12L32 30L37 14L43 32L50 10" stroke="url(#mobGrad)" strokeWidth="4.5" strokeLinecap="round" />
              </svg>
            </div>

            <h1 className="splash-brand brand-name-text">WedWithMe</h1>
            <p className="splash-sub brand-tagline-text">From Match to Marriage</p>

            <div className="splash-couple-img-wrap">
              <img src="/images/hero.jpg" alt="Wedding Couple" className="splash-couple" />
            </div>

            <button
              className="btn-splash-start"
              onClick={() => setShowWelcomeSplash(false)}
            >
              Get Started
            </button>

            <div className="splash-login-row">
              Already have an account?{' '}
              <span
                className="gold-link"
                onClick={() => {
                  setShowWelcomeSplash(false);
                  if (onOpenLoginModal) onOpenLoginModal();
                }}
              >
                Login
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================= REELS MODAL (Screen 9) ================= */}
      {showReelsModal && (
        <div className="sub-screen-overlay" onClick={() => setShowReelsModal(false)}>
          <div className="reels-fullscreen-view" onClick={(e) => e.stopPropagation()}>
            <button className="reels-close-btn" onClick={() => setShowReelsModal(false)}>✕</button>
            <img src="/images/decorator.jpg" alt="Reels Video" className="reels-video-img" />
            <div className="reels-hud">
              <h3>Dream Weddings</h3>
              <p>Real Moments & Celebrations</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mobile-app-root {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: #03140e;
          color: #ffffff;
          position: relative;
          width: 100%;
          overflow-x: hidden;
        }

        /* Top App Header */
        .app-header {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background-color: #051a12;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          height: 60px;
        }

        .header-left, .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.06);
          position: relative;
        }

        .city-selector-wrap {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          padding: 5px 10px;
          border-radius: 9999px;
          cursor: pointer;
          position: relative;
        }

        .arrow-down {
          font-size: 8px;
          color: #e5c158;
        }

        .city-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          background: #06281c;
          border: 1px solid rgba(229, 193, 88, 0.3);
          border-radius: 12px;
          padding: 6px;
          min-width: 140px;
          z-index: 100;
          box-shadow: 0 10px 24px rgba(0,0,0,0.4);
        }

        .city-opt {
          padding: 8px 12px;
          font-size: 13px;
          border-radius: 8px;
          color: #d1ded8;
        }

        .city-opt.active {
          background: #e5c158;
          color: #051a12;
          font-weight: bold;
        }

        .notif-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #e6005c;
        }

        /* Scroll Body */
        .mobile-scroll-container {
          flex: 1;
          padding-bottom: 76px;
          overflow-y: auto;
        }

        .tab-pane {
          padding: 16px;
        }

        /* Tab 1: Home Screen */
        .mob-hero-card {
          background: linear-gradient(135deg, #07261a 0%, #03140e 100%);
          border: 1px solid rgba(229, 193, 88, 0.3);
          border-radius: 20px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }

        .mob-hero-title {
          font-family: var(--font-serif);
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.25;
          max-width: 180px;
        }

        .mob-hero-img-wrap {
          width: 74px;
          height: 74px;
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid #e5c158;
        }

        .mob-couple-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mob-search-bar {
          background: #ffffff;
          border-radius: 9999px;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }

        .search-placeholder {
          font-size: 13px;
          color: #74887e;
        }

        /* 4 Categories */
        .mob-category-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .cat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .cat-icon-circle {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cat-green { background: #e8f5ec; color: #107c41; }
        .cat-peach { background: #fff0e6; color: #ea580c; }
        .cat-teal { background: #e6f6f5; color: #0d9488; }
        .cat-gray { background: #f0f4f1; color: #4b6357; }

        .cat-label {
          font-size: 11.5px;
          font-weight: 600;
          color: #c9d8d0;
        }

        /* Featured Vendors */
        .section-block {
          margin-bottom: 24px;
        }

        .block-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .block-title {
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
        }

        .view-all-btn {
          font-size: 12.5px;
          font-weight: 600;
          color: #e5c158;
        }

        .horizontal-vendors-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 8px;
          scrollbar-width: none;
        }

        .compact-vendor-card {
          min-width: 120px;
          background: #ffffff;
          border-radius: 14px;
          padding: 8px;
          color: #122119;
          display: flex;
          flex-direction: column;
        }

        .thumb-wrap {
          height: 80px;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .vendor-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .v-name {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .v-rating {
          font-size: 11px;
          color: #d81b60;
          font-weight: 700;
        }

        .star { color: #e53935; }

        /* Sagun Card */
        .mob-sagun-card {
          background: linear-gradient(135deg, #063121 0%, #031a12 100%);
          border: 1px solid #e5c158;
          border-radius: 18px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          cursor: pointer;
        }

        .sagun-mini-avatar {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #e5c158;
          flex-shrink: 0;
        }

        .sagun-mini-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sagun-text {
          flex: 1;
        }

        .sagun-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #e5c158;
        }

        .sagun-speech {
          font-size: 12px;
          color: #d1ded8;
        }

        .btn-chat-sagun {
          background: #e5c158;
          color: #03140e;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 9999px;
        }

        /* Reels Card */
        .reels-banner-card {
          position: relative;
          height: 140px;
          border-radius: 18px;
          overflow: hidden;
          cursor: pointer;
        }

        .reels-bg-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .reels-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 100%);
        }

        .reels-play-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.3);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .reels-caption {
          position: absolute;
          bottom: 12px;
          left: 14px;
        }

        .reels-caption h4 {
          font-size: 15px;
          font-weight: 700;
        }

        .reels-caption p {
          font-size: 11px;
          color: #e2ede7;
        }

        /* Tab 2: Matches */
        .sub-tabs-pills {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .pill-tab {
          padding: 6px 16px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.08);
          color: #c9d8d0;
          font-size: 13px;
          font-weight: 600;
        }

        .pill-active {
          background: linear-gradient(135deg, #f72585 0%, #e6005c 100%);
          color: #ffffff;
        }

        .match-card-container {
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          color: #122119;
          box-shadow: 0 12px 32px rgba(0,0,0,0.3);
        }

        .match-photo-wrapper {
          position: relative;
          height: 320px;
        }

        .match-portrait {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .match-score-badge {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: #10b981;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .match-info-card {
          padding: 16px 18px 20px;
        }

        .profile-name-text {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .profile-meta-text {
          font-size: 13px;
          color: #64756c;
          margin-bottom: 12px;
        }

        .profile-tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 20px;
        }

        .prof-tag {
          font-size: 11.5px;
          background: #f0f5f2;
          color: #24382e;
          padding: 4px 10px;
          border-radius: 8px;
        }

        .match-actions-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 28px;
        }

        .match-action-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }

        .btn-pass {
          background: #122119;
          color: #ffffff;
        }

        .btn-like {
          background: linear-gradient(135deg, #f72585 0%, #e6005c 100%);
          color: #ffffff;
        }

        /* Tab 3: Bookings */
        .tab-page-title {
          font-family: var(--font-serif);
          font-size: 24px;
          margin-bottom: 14px;
        }

        .line-tabs-row {
          display: flex;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 16px;
        }

        .line-tab {
          padding: 8px 18px;
          font-size: 14px;
          font-weight: 600;
          color: #8da397;
          border-bottom: 2px solid transparent;
        }

        .line-active {
          color: #e6005c;
          border-bottom-color: #e6005c;
        }

        .booking-items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .booking-list-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 12px;
          display: flex;
          gap: 12px;
          color: #122119;
        }

        .booking-thumb {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          object-fit: cover;
        }

        .booking-info {
          flex: 1;
        }

        .b-title {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .b-loc {
          font-size: 12px;
          color: #64756c;
        }

        .b-date {
          font-size: 11.5px;
          color: #107c41;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .btn-view-booking {
          background: linear-gradient(135deg, #f72585 0%, #e6005c 100%);
          color: #ffffff;
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 14px;
          border-radius: 9999px;
        }

        /* Tab 4: Vendors */
        .vendor-tab-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .filter-icon-btn {
          color: #ffffff;
          font-size: 16px;
        }

        .vendor-search-input-wrap {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .vendor-search-field {
          flex: 1;
          background: #ffffff;
          border-radius: 9999px;
          padding: 8px 16px;
          font-size: 13px;
          color: #122119;
        }

        .filter-chip-btn {
          background: rgba(255,255,255,0.1);
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 12px;
        }

        .horizontal-chips-bar {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          margin-bottom: 16px;
        }

        .vendor-cat-chip {
          padding: 6px 14px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.08);
          color: #c9ded3;
          font-size: 12px;
          white-space: nowrap;
        }

        .chip-active {
          background: #e5c158;
          color: #03140e;
          font-weight: 700;
        }

        .vendors-vertical-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .v-card-row {
          background: #ffffff;
          border-radius: 16px;
          padding: 10px;
          display: flex;
          gap: 12px;
          color: #122119;
          cursor: pointer;
        }

        .v-row-img {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          object-fit: cover;
        }

        .v-row-info {
          flex: 1;
        }

        .v-title-row {
          display: flex;
          justify-content: space-between;
        }

        .v-row-title {
          font-size: 14px;
          font-weight: 700;
        }

        .heart-icon {
          color: #e6005c;
          font-size: 14px;
        }

        .v-rating-sub {
          font-size: 12px;
          color: #d81b60;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .v-price-sub {
          font-size: 13px;
          font-weight: 700;
          color: #122119;
        }

        /* Tab 5: Profile */
        .user-profile-header-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          color: #122119;
          margin-bottom: 20px;
        }

        .user-profile-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e5c158;
        }

        .user-name {
          font-size: 18px;
          font-weight: 700;
        }

        .user-since {
          font-size: 12px;
          color: #72847a;
        }

        .profile-menu-list {
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          color: #122119;
        }

        .profile-menu-item {
          display: flex;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid #edf2ee;
          cursor: pointer;
        }

        .menu-icon {
          font-size: 18px;
          margin-right: 14px;
        }

        .menu-text {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
        }

        .menu-arrow {
          font-size: 18px;
          color: #a0b2a8;
        }

        /* Bottom Nav */
        .bottom-nav-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: #041810;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: space-around;
          z-index: 1000;
        }

        .nav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          color: #7b9185;
          font-size: 11px;
          padding: 4px;
        }

        .nav-icon {
          font-size: 18px;
        }

        .nav-active {
          color: #e5c158;
          font-weight: 700;
        }

        .nav-active .nav-icon {
          transform: scale(1.1);
        }

        /* Sub-screens (Booking details, Chat, etc.) */
        .sub-screen-overlay {
          position: fixed;
          inset: 0;
          background: #03140e;
          z-index: 2000;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .sub-screen-header {
          padding: 14px 16px;
          background: #062419;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .back-btn {
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
        }

        .detail-hero-img {
          width: 100%;
          height: 220px;
          object-fit: cover;
        }

        .detail-content-pad {
          padding: 18px 16px 40px;
          background: #ffffff;
          color: #122119;
          flex: 1;
        }

        .detail-title {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .detail-rating-row {
          font-size: 13px;
          color: #556b60;
          margin-bottom: 16px;
        }

        .amenities-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }

        .amenity-pill {
          background: #f0f6f3;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 12px;
          color: #1f362a;
          font-weight: 600;
        }

        .package-card {
          border: 1px solid #dce8e1;
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 20px;
        }

        .pkg-header {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 700;
          color: #72887d;
          margin-bottom: 8px;
        }

        .pkg-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pkg-name {
          font-size: 15px;
          font-weight: 700;
        }

        .pkg-sub {
          font-size: 12px;
          color: #72887d;
        }

        .pkg-price {
          font-size: 18px;
          font-weight: 700;
          color: #122119;
        }

        .btn-book-now {
          width: 100%;
          background: linear-gradient(135deg, #f72585 0%, #e6005c 100%);
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          padding: 14px;
          border-radius: 9999px;
          margin-bottom: 12px;
        }

        .btn-more-packages {
          width: 100%;
          font-size: 13px;
          font-weight: 700;
          color: #122119;
          text-align: center;
        }

        /* Sagun Chat Screen */
        .sagun-chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #06281c;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .sagun-header-profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sagun-chat-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1.5px solid #e5c158;
          object-fit: cover;
        }

        .sagun-name {
          font-size: 14px;
          font-weight: 700;
        }

        .online-tag {
          color: #10b981;
          font-size: 11px;
        }

        .sagun-sub {
          font-size: 11px;
          color: #9cb2a6;
        }

        .sagun-chat-messages {
          flex: 1;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }

        .chat-bubble-row {
          display: flex;
        }

        .user-row { justify-content: flex-end; }
        .sagun-row { justify-content: flex-start; }

        .chat-bubble-box {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 13.5px;
          line-height: 1.45;
        }

        .user-bubble {
          background: #064e3b;
          color: #ffffff;
          border-top-right-radius: 4px;
        }

        .sagun-bubble {
          background: #ffffff;
          color: #122119;
          border-top-left-radius: 4px;
        }

        .chat-venue-rec-card {
          background: #ffffff;
          border-radius: 14px;
          padding: 10px;
          color: #122119;
          display: flex;
          gap: 10px;
          width: fit-content;
          max-width: 90%;
        }

        .rec-img {
          width: 70px;
          height: 70px;
          border-radius: 10px;
          object-fit: cover;
        }

        .rec-title { font-size: 13px; font-weight: 700; }
        .rec-loc { font-size: 11px; color: #64756c; }
        .rec-price { font-size: 12px; font-weight: 700; color: #064e3b; }
        .rec-btn {
          background: #e6005c;
          color: #ffffff;
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 9999px;
          margin-top: 4px;
        }

        .sagun-chat-input-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #051c14;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .mic-icon-btn {
          color: #e5c158;
          font-size: 16px;
        }

        .chat-text-input {
          flex: 1;
          background: rgba(255,255,255,0.08);
          border-radius: 9999px;
          padding: 8px 14px;
          font-size: 13px;
          color: #ffffff;
        }

        .chat-send-btn {
          background: #e6005c;
          color: #ffffff;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Notifications list */
        .notifications-list {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .notif-item {
          background: #ffffff;
          border-radius: 16px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #122119;
          cursor: pointer;
        }

        .notif-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .pink-bg { background: #fce7f3; }
        .green-bg { background: #dcfce7; }
        .teal-bg { background: #ccfbf1; }
        .rose-bg { background: #ffe4e6; }
        .gold-bg { background: #fef3c7; }

        .notif-content { flex: 1; }
        .notif-title { font-size: 13.5px; font-weight: 700; }
        .notif-desc { font-size: 11.5px; color: #64756c; }
        .notif-time { font-size: 11px; color: #94a39b; }

        /* Splash */
        .splash-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2,16,10,0.92);
          backdrop-filter: blur(8px);
          z-index: 3000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .splash-card {
          background: #052419;
          border: 1px solid #e5c158;
          border-radius: 28px;
          padding: 32px 24px;
          text-align: center;
          width: 100%;
          max-width: 360px;
        }

        .splash-logo { margin-bottom: 12px; }
        .splash-brand {
          font-family: var(--font-serif);
          font-size: 26px;
          color: #ffffff;
          margin-bottom: 4px;
        }
        .splash-sub { font-size: 12px; color: #b4c7bd; margin-bottom: 20px; }
        .splash-couple-img-wrap {
          height: 180px;
          border-radius: 18px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .splash-couple { width: 100%; height: 100%; object-fit: cover; }
        .btn-splash-start {
          width: 100%;
          background: linear-gradient(135deg, #f5d475 0%, #e5c158 100%);
          color: #03140e;
          font-size: 15px;
          font-weight: 700;
          padding: 13px;
          border-radius: 9999px;
          margin-bottom: 14px;
        }
        .splash-login-row { font-size: 12px; color: #b4c7bd; }
        .gold-link { color: #e5c158; font-weight: 700; cursor: pointer; }

        /* Reels modal */
        .reels-fullscreen-view {
          position: relative;
          width: 100%;
          height: 100%;
          background: #000000;
        }
        .reels-video-img { width: 100%; height: 100%; object-fit: cover; }
        .reels-close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          color: #ffffff;
          font-size: 20px;
          background: rgba(0,0,0,0.5);
          width: 36px;
          height: 36px;
          border-radius: 50%;
        }
        .reels-hud {
          position: absolute;
          bottom: 40px;
          left: 20px;
          color: #ffffff;
        }
      `}</style>
    </div>
  );
}
