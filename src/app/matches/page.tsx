'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import SagunModal from '@/components/SagunModal';
import { useAppContext } from '@/context';

interface MatchProfile {
  id: string;
  name: string;
  age: number;
  height: string;
  education: string;
  profession: string;
  company?: string;
  city: string;
  religion: string;
  community: string;
  mother_tongue: string;
  diet: string;
  manglik: string;
  bio: string;
  photo_url: string;
  compatibility_score: number;
  gunas_matched: number;
  total_gunas: number;
  is_verified: boolean;
  family_type?: string;
  annual_income?: string;
}

export default function MatchesPage() {
  const { user } = useAppContext();
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReligion, setSelectedReligion] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedAgeRange, setSelectedAgeRange] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);
  const [interestedIds, setInterestedIds] = useState<string[]>([]);

  // Profile Detail Modal
  const [selectedProfile, setSelectedProfile] = useState<MatchProfile | null>(null);

  // Sagun AI & Auth Modals
  const [sagunModalOpen, setSagunModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const religions = ['ALL', 'Hindu', 'Sikh', 'Jain', 'Muslim', 'Christian', 'Buddhist'];
  const cities = ['ALL', 'Delhi NCR', 'Mumbai', 'Jaipur', 'Bengaluru', 'Pune', 'Chandigarh', 'Lucknow'];

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/matrimonial/matches');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setMatches(data.data);
      } else {
        // Fallback curated sample verified profiles
        setMatches([
          {
            id: 'm-1',
            name: 'Ananya Sharma',
            age: 26,
            height: "5' 5\"",
            education: 'MBA in Finance (XLRI Jamshedpur)',
            profession: 'Investment Banking Associate',
            company: 'Morgan Stanley',
            city: 'Mumbai',
            religion: 'Hindu',
            community: 'Brahmin',
            mother_tongue: 'Hindi',
            diet: 'Vegetarian',
            manglik: 'Non-Manglik',
            bio: 'Warm, ambitious, and deeply rooted in Indian family values. Love weekend hiking, Hindustani classical vocals, and culinary experiments.',
            photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80',
            compatibility_score: 92,
            gunas_matched: 32,
            total_gunas: 36,
            is_verified: true,
            family_type: 'Nuclear, Upper Middle Class',
            annual_income: '₹28 - 32 Lakhs'
          },
          {
            id: 'm-2',
            name: 'Rohan Verma',
            age: 29,
            height: "5' 11\"",
            education: 'B.Tech in Computer Science (IIT Delhi)',
            profession: 'Senior Software Architect',
            company: 'Google',
            city: 'Delhi NCR',
            religion: 'Hindu',
            community: 'Khatri',
            mother_tongue: 'Punjabi',
            diet: 'Eggetarian',
            manglik: 'Anshik Manglik',
            bio: 'Passionate about building impactful technology, fitness, and world cinema. Looking for an intellectually curious partner who values mutual respect.',
            photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80',
            compatibility_score: 88,
            gunas_matched: 30,
            total_gunas: 36,
            is_verified: true,
            family_type: 'Joint, Well Settled',
            annual_income: '₹45 - 55 Lakhs'
          },
          {
            id: 'm-3',
            name: 'Meera Chordia',
            age: 27,
            height: "5' 4\"",
            education: 'MD in Dermatology (AIIMS)',
            profession: 'Consultant Dermatologist',
            company: 'Fortis Healthcare',
            city: 'Jaipur',
            religion: 'Jain',
            community: 'Oswal',
            mother_tongue: 'Rajasthani',
            diet: 'Strict Jain',
            manglik: 'Non-Manglik',
            bio: 'Doctor by profession and artist by passion. Enjoy classical kathak, organic gardening, and spending quiet evenings with family and books.',
            photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=80',
            compatibility_score: 95,
            gunas_matched: 34,
            total_gunas: 36,
            is_verified: true,
            family_type: 'Traditional, Highly Respected',
            annual_income: '₹35 - 40 Lakhs'
          },
          {
            id: 'm-4',
            name: 'Harpreet Singh Bindra',
            age: 28,
            height: "6' 0\"",
            education: 'Masters in Data Science (Columbia Univ)',
            profession: 'AI Research Scientist',
            company: 'Microsoft AI',
            city: 'Bengaluru',
            religion: 'Sikh',
            community: 'Khatri',
            mother_tongue: 'Punjabi',
            diet: 'Vegetarian',
            manglik: 'Non-Manglik',
            bio: 'Tech enthusiast, marathon runner, and avid traveler. Believer in equality, spiritual grounding, and having a joyful, laughter-filled home.',
            photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80',
            compatibility_score: 86,
            gunas_matched: 29,
            total_gunas: 36,
            is_verified: true,
            family_type: 'Nuclear, Modern Outlook',
            annual_income: '₹50 - 60 Lakhs'
          }
        ]);
      }
    } catch (err) {
      console.error('Error fetching matrimonial matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInterest = (id: string) => {
    if (!user) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }
    if (interestedIds.includes(id)) {
      setInterestedIds(interestedIds.filter(i => i !== id));
    } else {
      setInterestedIds([...interestedIds, id]);
    }
  };

  const handleToggleShortlist = (id: string) => {
    if (shortlistedIds.includes(id)) {
      setShortlistedIds(shortlistedIds.filter(i => i !== id));
    } else {
      setShortlistedIds([...shortlistedIds, id]);
    }
  };

  // Filter profiles
  const filteredMatches = matches.filter(m => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = !query || 
      m.name.toLowerCase().includes(query) || 
      m.profession.toLowerCase().includes(query) || 
      m.education.toLowerCase().includes(query) || 
      m.city.toLowerCase().includes(query) ||
      m.community.toLowerCase().includes(query);

    const matchesReligion = selectedReligion === 'ALL' || m.religion.toLowerCase() === selectedReligion.toLowerCase();
    const matchesCity = selectedCity === 'ALL' || m.city.toLowerCase() === selectedCity.toLowerCase();
    
    let matchesAge = true;
    if (selectedAgeRange === '21-25') matchesAge = m.age >= 21 && m.age <= 25;
    if (selectedAgeRange === '26-30') matchesAge = m.age >= 26 && m.age <= 30;
    if (selectedAgeRange === '31-35') matchesAge = m.age >= 31 && m.age <= 35;

    return matchesQuery && matchesReligion && matchesCity && matchesAge;
  });

  return (
    <div className="matches-page-root">
      <Navbar
        onOpenLogin={() => { setAuthMode('login'); setAuthModalOpen(true); }}
        onOpenRegister={() => { setAuthMode('register'); setAuthModalOpen(true); }}
      />

      <main className="matches-main-content">
        {/* Hero Section */}
        <section className="matches-hero-section">
          <div className="container-custom">
            <div className="hero-text-center">
              <span className="hero-badge">AI & Kundali Verified Matrimony</span>
              <h1 className="hero-title">Discover Compatible Life Partners</h1>
              <p className="hero-subtitle">
                100% Aadhaar & Government ID verified profiles. Deep astrological matching (Ashtakoota 36 Gunas) combined with 
                modern personality compatibility and shared family values.
              </p>

              {/* AI Banner Callout */}
              <div className="sagun-ai-callout-card" onClick={() => setSagunModalOpen(true)}>
                <div className="ai-sparkle-icon">✨</div>
                <div className="ai-callout-info">
                  <strong>Looking for specific preferences? Talk to Sagun AI</strong>
                  <p>Tell Sagun your dream partner criteria in natural language (e.g. "Find an architect in Bangalore with vegetarian lifestyle")</p>
                </div>
                <button className="btn-ask-sagun">Ask Sagun AI →</button>
              </div>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="matches-filter-bar">
          <div className="container-custom">
            <div className="filter-bar-inner">
              <div className="filter-input-search">
                <span className="icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by name, education, profession, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-dropdown-group">
                <span className="label">Religion:</span>
                <select value={selectedReligion} onChange={(e) => setSelectedReligion(e.target.value)}>
                  {religions.map(r => <option key={r} value={r}>{r === 'ALL' ? 'All Religions' : r}</option>)}
                </select>
              </div>

              <div className="filter-dropdown-group">
                <span className="label">City:</span>
                <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                  {cities.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Cities' : c}</option>)}
                </select>
              </div>

              <div className="filter-dropdown-group">
                <span className="label">Age:</span>
                <select value={selectedAgeRange} onChange={(e) => setSelectedAgeRange(e.target.value)}>
                  <option value="ALL">All Ages</option>
                  <option value="21-25">21 to 25 yrs</option>
                  <option value="26-30">26 to 30 yrs</option>
                  <option value="31-35">31 to 35 yrs</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Matches Grid */}
        <section className="matches-grid-section">
          <div className="container-custom">
            <div className="results-header">
              <h2>Compatible Profiles ({filteredMatches.length})</h2>
              <span className="sort-hint">Ranked by astrological & lifestyle compatibility score</span>
            </div>

            {loading ? (
              <div className="loading-state-box">
                <div className="spinner"></div>
                <p>Calculating Kundali compatibility and AI matching...</p>
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="empty-state-card">
                <span className="empty-icon">💍</span>
                <h3>No Matches Found with Current Criteria</h3>
                <p>Try widening your religion or age range filters to view more eligible partners.</p>
                <button
                  className="btn-reset-filters"
                  onClick={() => { setSearchQuery(''); setSelectedReligion('ALL'); setSelectedCity('ALL'); setSelectedAgeRange('ALL'); }}
                >
                  Show All Verified Profiles
                </button>
              </div>
            ) : (
              <div className="matches-cards-grid">
                {filteredMatches.map((profile) => {
                  const isInterested = interestedIds.includes(profile.id);
                  const isShortlisted = shortlistedIds.includes(profile.id);

                  return (
                    <div key={profile.id} className="match-card-item">
                      <div className="match-card-photo-wrapper">
                        <img
                          src={profile.photo_url}
                          alt={profile.name}
                          className="match-profile-img"
                        />
                        <div className="photo-overlay-gradient"></div>

                        {/* Top Compatibility Tag */}
                        <div className="kundali-score-badge">
                          <span className="badge-flame">🔥</span>
                          <span>{profile.compatibility_score}% Match • {profile.gunas_matched}/{profile.total_gunas} Gunas</span>
                        </div>

                        {/* Shortlist heart button */}
                        <button
                          className={`btn-heart-shortlist ${isShortlisted ? 'shortlisted' : ''}`}
                          onClick={() => handleToggleShortlist(profile.id)}
                          title="Shortlist profile"
                        >
                          {isShortlisted ? '❤️' : '🤍'}
                        </button>

                        <div className="photo-bottom-info">
                          <div className="name-age-row">
                            <h3 className="profile-name">{profile.name}, {profile.age}</h3>
                            {profile.is_verified && <span className="verified-tick" title="Government ID Verified">✓ Verified</span>}
                          </div>
                          <div className="profile-headline">{profile.profession} • {profile.city}</div>
                        </div>
                      </div>

                      <div className="match-card-details">
                        <div className="detail-tags-cloud">
                          <span className="info-tag">📐 {profile.height}</span>
                          <span className="info-tag">🕉️ {profile.religion} ({profile.community})</span>
                          <span className="info-tag">🗣️ {profile.mother_tongue}</span>
                          <span className="info-tag">🥗 {profile.diet}</span>
                          <span className="info-tag">✨ {profile.manglik}</span>
                        </div>

                        <div className="education-row">
                          <span className="icon">🎓</span>
                          <span className="text">{profile.education}</span>
                        </div>

                        <p className="bio-summary">
                          "{profile.bio}"
                        </p>

                        <div className="match-card-actions">
                          <button
                            className="btn-view-profile"
                            onClick={() => setSelectedProfile(profile)}
                          >
                            View Full Profile
                          </button>

                          <button
                            className={`btn-send-interest ${isInterested ? 'interested' : ''}`}
                            onClick={() => handleSendInterest(profile.id)}
                          >
                            {isInterested ? '✓ Interest Sent' : 'Send Interest 💌'}
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

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <div className="profile-modal-backdrop" onClick={() => setSelectedProfile(null)}>
          <div className="profile-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-banner">
              <button className="btn-close-modal" onClick={() => setSelectedProfile(null)}>✕</button>
              <div className="modal-hero-row">
                <img src={selectedProfile.photo_url} alt={selectedProfile.name} className="modal-avatar" />
                <div className="modal-hero-text">
                  <div className="title-row">
                    <h2>{selectedProfile.name}, {selectedProfile.age}</h2>
                    <span className="verified-badge-pill">✓ Govt ID Verified</span>
                  </div>
                  <p className="subtitle">{selectedProfile.profession} at {selectedProfile.company || 'Reputed Firm'}</p>
                  <p className="loc">📍 {selectedProfile.city} • 📐 {selectedProfile.height}</p>
                </div>
              </div>
            </div>

            <div className="modal-body-scroll">
              {/* Compatibility score ribbon */}
              <div className="compatibility-ribbon-card">
                <div className="score-circle">
                  <span>{selectedProfile.compatibility_score}%</span>
                </div>
                <div className="score-details">
                  <h4>Astrological Compatibility: {selectedProfile.gunas_matched} of {selectedProfile.total_gunas} Gunas</h4>
                  <p>High compatibility in Varna, Vashya, Tara, Yoni, and Nadi matching. Excellent lifestyle and marital harmony indicated.</p>
                </div>
              </div>

              {/* Bio */}
              <div className="section-block">
                <h3 className="section-title">About {selectedProfile.name}</h3>
                <p className="section-text">{selectedProfile.bio}</p>
              </div>

              {/* Career & Education */}
              <div className="section-block">
                <h3 className="section-title">Education & Career</h3>
                <div className="info-grid-2">
                  <div><strong>Education:</strong> {selectedProfile.education}</div>
                  <div><strong>Profession:</strong> {selectedProfile.profession}</div>
                  <div><strong>Company:</strong> {selectedProfile.company || 'Corporate'}</div>
                  <div><strong>Annual Income:</strong> {selectedProfile.annual_income || 'Confidential'}</div>
                </div>
              </div>

              {/* Astrological & Cultural */}
              <div className="section-block">
                <h3 className="section-title">Astrological & Cultural Details</h3>
                <div className="info-grid-2">
                  <div><strong>Religion / Community:</strong> {selectedProfile.religion} - {selectedProfile.community}</div>
                  <div><strong>Mother Tongue:</strong> {selectedProfile.mother_tongue}</div>
                  <div><strong>Dietary Habits:</strong> {selectedProfile.diet}</div>
                  <div><strong>Manglik Status:</strong> {selectedProfile.manglik}</div>
                </div>
              </div>

              {/* Family Details */}
              <div className="section-block">
                <h3 className="section-title">Family Background</h3>
                <p className="section-text">
                  Family Structure: {selectedProfile.family_type || 'Nuclear, well-reputed family'}. Both traditional values and modern outlook.
                </p>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button className="btn-modal-chat" onClick={() => setSagunModalOpen(true)}>
                Ask Sagun AI About Compatibility
              </button>
              <button
                className={`btn-modal-interest ${interestedIds.includes(selectedProfile.id) ? 'active' : ''}`}
                onClick={() => handleSendInterest(selectedProfile.id)}
              >
                {interestedIds.includes(selectedProfile.id) ? '✓ Interest Sent' : 'Send Direct Interest 💌'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sagun AI Modal */}
      <SagunModal isOpen={sagunModalOpen} onClose={() => setSagunModalOpen(false)} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />

      <Footer />

      <style jsx>{`
        .matches-page-root {
          min-height: 100vh;
          background: #fcf9f5;
          display: flex;
          flex-direction: column;
        }

        .matches-hero-section {
          background-color: #031710;
          background-image: radial-gradient(circle at 50% 50%, rgba(6, 42, 28, 0.7) 0%, rgba(3, 23, 16, 0.98) 100%);
          border-bottom: 1px solid rgba(229, 193, 88, 0.2);
          color: #ffffff;
          padding: 60px 0 45px;
          text-align: center;
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
          margin: 0 auto 30px;
          line-height: 1.6;
        }

        .sagun-ai-callout-card {
          background: rgba(3, 23, 16, 0.75);
          border: 1px solid rgba(229, 193, 88, 0.3);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 16px 24px;
          max-width: 780px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .sagun-ai-callout-card:hover {
          background: rgba(6, 42, 28, 0.9);
          border-color: #e5c158;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(229, 193, 88, 0.2);
        }

        .ai-sparkle-icon {
          font-size: 28px;
        }

        .ai-callout-info {
          flex: 1;
        }

        .ai-callout-info strong {
          display: block;
          font-size: 15px;
          color: #ffffff;
          margin-bottom: 2px;
        }

        .ai-callout-info p {
          font-size: 13px;
          color: #9cb1a6;
          margin: 0;
        }

        .btn-ask-sagun {
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(230, 0, 92, 0.38);
        }

        .matches-filter-bar {
          background: #ffffff;
          border-bottom: 1px solid #ebe5df;
          padding: 14px 0;
        }

        .filter-bar-inner {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .filter-input-search {
          flex: 2;
          min-width: 250px;
          display: flex;
          align-items: center;
          background: #f6f3ee;
          border-radius: 10px;
          padding: 8px 14px;
          gap: 8px;
        }

        .filter-input-search input {
          width: 100%;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
        }

        .filter-dropdown-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-dropdown-group .label {
          font-size: 13px;
          color: #666;
          font-weight: 600;
        }

        .filter-dropdown-group select {
          border: 1px solid #ddd;
          background: #fff;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .matches-grid-section {
          padding: 40px 0 80px;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 24px;
        }

        .results-header h2 {
          font-size: 24px;
          font-weight: 800;
          color: #1b0a1f;
        }

        .sort-hint {
          font-size: 13px;
          color: #777;
        }

        .matches-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 26px;
        }

        .match-card-item {
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #ede7df;
          box-shadow: 0 6px 18px rgba(0,0,0,0.04);
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
        }

        .match-card-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 30px rgba(0,0,0,0.08);
        }

        .match-card-photo-wrapper {
          height: 280px;
          position: relative;
          background: #2b0b23;
        }

        .match-profile-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-overlay-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60%;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%);
        }

        .kundali-score-badge {
          position: absolute;
          top: 14px;
          left: 14px;
          background: #031710;
          color: #e5c158;
          border: 1px solid rgba(229, 193, 88, 0.4);
          font-size: 12px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 50px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-heart-shortlist {
          position: absolute;
          top: 14px;
          right: 14px;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          border: none;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .photo-bottom-info {
          position: absolute;
          bottom: 14px;
          left: 16px;
          right: 16px;
          color: #fff;
        }

        .name-age-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .profile-name {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          color: #fff;
        }

        .verified-tick {
          background: #2e7d32;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 50px;
        }

        .profile-headline {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          margin-top: 2px;
        }

        .match-card-details {
          padding: 18px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .detail-tags-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }

        .info-tag {
          background: #f5f2ed;
          color: #4a403a;
          font-size: 12px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 6px;
        }

        .education-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #555;
          margin-bottom: 12px;
        }

        .bio-summary {
          font-size: 13px;
          color: #666;
          font-style: italic;
          line-height: 1.45;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }

        .match-card-actions {
          display: flex;
          gap: 10px;
          padding-top: 12px;
          border-top: 1px solid #f0eee9;
        }

        .btn-view-profile {
          flex: 1;
          background: #f0f0f0;
          color: #333;
          border: none;
          padding: 9px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-send-interest {
          flex: 1.3;
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          border: none;
          padding: 9px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(230, 0, 92, 0.35);
        }

        .btn-send-interest.interested {
          background: #2e7d32;
          color: #ffffff;
        }

        /* Profile Detail Modal */
        .profile-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .profile-modal-panel {
          background: #ffffff;
          border-radius: 20px;
          max-width: 680px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 60px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
        }

        .modal-header-banner {
          background: linear-gradient(135deg, #2b0b23 0%, #511240 100%);
          color: #fff;
          padding: 24px;
          position: relative;
        }

        .btn-close-modal {
          position: absolute;
          top: 16px; right: 16px;
          background: rgba(255,255,255,0.2);
          border: none;
          color: #fff;
          width: 32px; height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
        }

        .modal-hero-row {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .modal-avatar {
          width: 90px; height: 90px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #ff4d79;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .title-row h2 {
          font-size: 22px;
          margin: 0;
          font-weight: 800;
        }

        .verified-badge-pill {
          background: #2e7d32;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 50px;
        }

        .modal-hero-text .subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.9);
          margin: 4px 0;
        }

        .modal-hero-text .loc {
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          margin: 0;
        }

        .modal-body-scroll {
          padding: 24px;
          flex: 1;
        }

        .compatibility-ribbon-card {
          background: #fff8f9;
          border: 1px solid #ffd0dc;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .score-circle {
          width: 54px; height: 54px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff4d79 0%, #e6004c 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
          flex-shrink: 0;
        }

        .score-details h4 {
          font-size: 15px;
          font-weight: 700;
          color: #1b0a1f;
          margin: 0 0 4px;
        }

        .score-details p {
          font-size: 12px;
          color: #666;
          margin: 0;
          line-height: 1.4;
        }

        .section-block {
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 15px;
          font-weight: 700;
          color: #1b0a1f;
          margin-bottom: 8px;
          border-bottom: 1px solid #f0eee9;
          padding-bottom: 4px;
        }

        .section-text {
          font-size: 14px;
          color: #555;
          line-height: 1.6;
        }

        .info-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          font-size: 13px;
          color: #444;
        }

        .modal-footer-actions {
          padding: 16px 24px;
          border-top: 1px solid #eee;
          background: #faf8f5;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-modal-chat {
          background: #1b0a1f;
          color: #fff;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-modal-interest {
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #fff;
          border: none;
          padding: 10px 22px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(230, 0, 92, 0.35);
        }

        .btn-modal-interest.active {
          background: #2e7d32;
        }

        @media (max-width: 768px) {
          .sagun-ai-callout-card {
            flex-direction: column;
            text-align: center;
          }
          .filter-bar-inner {
            flex-direction: column;
            align-items: stretch;
          }
          .modal-hero-row {
            flex-direction: column;
            text-align: center;
          }
          .info-grid-2 {
            grid-template-columns: 1fr;
          }
          .modal-footer-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
