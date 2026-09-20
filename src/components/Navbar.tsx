'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context';

interface NavbarProps {
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

export default function Navbar({ onOpenLogin, onOpenRegister }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname() || '/';
  const { user, setUser } = useAppContext();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Vendors', href: '/vendors' },
    { name: 'Matches', href: '/matches' },
    { name: 'Bookings', href: '/bookings' },
    { name: 'About Us', href: '/about' },
  ];

  const isLinkActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="navbar-wrapper">
      <div className="container-custom navbar-container">
        {/* Brand Logo */}
        <Link href="/" className="brand-logo" aria-label="WedWithMe Home">
          <div className="logo-icon-svg">
            <svg width="56" height="42" viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="wwmPinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff2a73" />
                  <stop offset="100%" stopColor="#e6005c" />
                </linearGradient>
                <linearGradient id="heartPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff528c" />
                  <stop offset="100%" stopColor="#d8004f" />
                </linearGradient>
                <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ff2a73" floodOpacity="0.4" />
                </filter>
              </defs>
              {/* Left W (Vibrant Celebratory Pink) */}
              <path
                d="M4 10L11 32L17 14L22 30L26 12"
                stroke="url(#wwmPinkGradient)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#logoGlow)"
              />
              {/* Central Entwined Heart (Pink) */}
              <path
                d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z"
                fill="url(#heartPinkGrad)"
              />
              {/* Right W (Vibrant Celebratory Pink) */}
              <path
                d="M28 12L32 30L37 14L43 32L50 10"
                stroke="url(#wwmPinkGradient)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#logoGlow)"
              />
            </svg>
          </div>
          <div className="brand-text-block">
            <span className="brand-name-text">WedWithMe</span>
            <span className="brand-tagline-text">From Match to Marriage</span>
          </div>
        </Link>

        {/* Desktop Nav Links (ALL PINK BUTTONS AS USER COMMANDED) */}
        <nav className="desktop-nav" aria-label="Primary Navigation">
          {navLinks.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-item ${isLinkActive(item.href) ? 'nav-item-active' : ''}`}
            >
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="navbar-actions">
          {/* Mobile Location Badge (Matching App Screenshot) */}
          <div className="mobile-location-badge">
            <span>📍 Delhi NCR</span>
          </div>

          {/* Search Trigger */}
          <button
            className="icon-btn search-trigger"
            aria-label="Search"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* If user is logged in, show user badge */}
          {user ? (
            <div className="user-profile-badge">
              <Link
                href={user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? '/admin' : user.role === 'VENDOR' ? '/vendor' : '/dashboard'}
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}
              >
                <div className="user-avatar-circle">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="user-display-name">{user.name}</span>
                <span style={{ fontSize: '10px', background: 'rgba(255,42,115,0.2)', color: '#ff80ab', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  {user.role}
                </span>
              </Link>
              <button
                className="btn-logout"
                title="Sign out"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  setUser(null);
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              {/* Login Button */}
              <button
                className="btn-login"
                onClick={onOpenLogin}
              >
                Login
              </button>

              {/* Register Button */}
              <button
                className="btn-register"
                onClick={onOpenRegister}
              >
                Register
              </button>
            </>
          )}

          {/* Mobile Hamburger Menu Toggle */}
          <button
            className="mobile-toggle"
            aria-label="Toggle mobile menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className={`bar ${mobileMenuOpen ? 'bar-open-1' : ''}`}></span>
            <span className={`bar ${mobileMenuOpen ? 'bar-open-2' : ''}`}></span>
            <span className={`bar ${mobileMenuOpen ? 'bar-open-3' : ''}`}></span>
          </button>
        </div>
      </div>

      {/* Floating Search Bar dropdown */}
      {searchOpen && (
        <div className="search-dropdown-bar">
          <div className="container-custom">
            <div className="search-inner">
              <input
                type="text"
                placeholder="Search vendors, venues, caterers, makeup artists..."
                autoFocus
                className="search-dropdown-input"
              />
              <button className="btn-register search-sub-btn">Search</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <div className="mobile-nav-links">
            {navLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`mobile-nav-item ${isLinkActive(item.href) ? 'active' : ''}`}
              >
                {item.name}
              </Link>
            ))}
            <div className="mobile-auth-actions">
              {user ? (
                <div className="mobile-user-row">
                  <span className="user-display-name">Hi, {user.name}</span>
                  <button className="btn-login" onClick={() => setUser(null)}>
                    Logout
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="btn-login full-w"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenLogin) onOpenLogin();
                    }}
                  >
                    Login
                  </button>
                  <button
                    className="btn-register full-w"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenRegister) onOpenRegister();
                    }}
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .navbar-wrapper {
          position: sticky;
          top: 0;
          z-index: 1000;
          background-color: #031710;
          background-image: radial-gradient(circle at 50% 50%, rgba(6, 42, 28, 0.85) 0%, rgba(3, 23, 16, 0.98) 100%);
          border-bottom: 1px solid rgba(229, 193, 88, 0.22);
          width: 100%;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
        }

        .navbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 76px;
          position: relative;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }

        .brand-text-block {
          display: none;
        }

        .brand-name-text {
          font-size: 21px;
          font-weight: 800;
          color: #e5c158 !important; /* Yellow text strictly as user demanded */
          letter-spacing: -0.3px;
          line-height: 1.1;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .brand-tagline-text {
          font-size: 10px;
          font-weight: 600;
          color: #fae8a4;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .logo-icon-svg {
          display: flex;
          align-items: center;
          transition: transform 0.25s ease;
          filter: drop-shadow(0 2px 8px rgba(230, 0, 92, 0.45));
        }

        .brand-logo:hover .logo-icon-svg {
          transform: scale(1.06);
          filter: drop-shadow(0 3px 12px rgba(230, 0, 92, 0.65));
        }

        /* Desktop Nav: ALL BUTTONS PINK AS REQUESTED */
        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .desktop-nav :global(a),
        .desktop-nav :global(.nav-item) {
          color: #ffffff !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          letter-spacing: 0.1px;
          transition: all 0.2s ease;
          position: relative;
          padding: 6px 14px !important;
          border-radius: 9999px !important;
          text-decoration: none !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }

        .desktop-nav :global(a:hover),
        .desktop-nav :global(.nav-item:hover) {
          color: #e5c158 !important;
          background: rgba(255, 255, 255, 0.08) !important;
          transform: translateY(-1px);
        }

        .desktop-nav :global(.nav-item-active) {
          color: #e5c158 !important;
          font-weight: 700 !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mobile-location-badge {
          display: none;
          font-size: 12px;
          color: #e5c158;
          font-weight: 600;
          background: rgba(229, 193, 88, 0.12);
          border: 1px solid rgba(229, 193, 88, 0.25);
          padding: 3px 8px;
          border-radius: 9999px;
        }

        .icon-btn {
          color: #cfdbd5;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          transition: all 0.2s ease;
          position: relative;
        }

        .icon-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .notification-btn {
          display: none;
          position: relative;
        }

        .bell-badge {
          position: absolute;
          top: 7px;
          right: 7px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #e6005c;
        }

        .btn-login {
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 600;
          padding: 7px 22px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: transparent;
          transition: all 0.2s ease;
        }

        .btn-login:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.5);
          color: #ffffff;
        }

        .btn-register {
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 700;
          padding: 7px 24px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          box-shadow: 0 4px 14px rgba(230, 0, 92, 0.38);
          border: none;
          transition: all 0.2s ease;
        }

        .btn-register:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(230, 0, 92, 0.55);
          filter: brightness(1.08);
        }

        .user-profile-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(229, 193, 88, 0.3);
          border-radius: 9999px;
          padding: 3px 12px 3px 4px;
        }

        .user-avatar-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2a73, #e6005c);
          color: #ffffff;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-display-name {
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
        }

        .btn-logout {
          color: #ff80ab;
          font-size: 11.5px;
          font-weight: 600;
          margin-left: 4px;
          cursor: pointer;
        }

        .mobile-toggle {
          display: none;
          flex-direction: column;
          gap: 5px;
          padding: 6px;
          background: transparent;
        }

        .bar {
          width: 22px;
          height: 2px;
          background-color: #ffffff;
          border-radius: 2px;
          transition: 0.3s ease;
        }

        .bar-open-1 {
          transform: translateY(7px) rotate(45deg);
        }
        .bar-open-2 {
          opacity: 0;
        }
        .bar-open-3 {
          transform: translateY(-7px) rotate(-45deg);
        }

        .search-dropdown-bar {
          background: #041a12;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .search-inner {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 9999px;
          padding: 4px 6px 4px 18px;
        }

        .search-dropdown-input {
          flex: 1;
          color: #ffffff;
          font-size: 14px;
        }

        .search-dropdown-input::placeholder {
          color: #8da398;
        }

        .search-sub-btn {
          padding: 6px 18px;
          font-size: 13px;
        }

        .mobile-drawer {
          display: none;
        }

        @media (max-width: 900px) {
          .desktop-nav {
            display: none;
            position: static;
            transform: none;
          }
          .brand-text-block {
            display: none !important;
          }
          .mobile-location-badge {
            display: none !important;
          }
          .search-trigger {
            display: none !important;
          }
          .notification-btn {
            display: none !important;
          }
          .navbar-container {
            height: 58px;
            padding: 0 14px;
          }
          .navbar-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .navbar-actions .btn-login {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            padding: 5px 12px;
            font-size: 12px;
            font-weight: 600;
            border-radius: 9999px;
            border: 1px solid rgba(255, 255, 255, 0.35);
            color: #ffffff;
            background: rgba(255, 255, 255, 0.05);
          }
          .navbar-actions .btn-register {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            padding: 5px 14px;
            font-size: 12px;
            font-weight: 700;
            border-radius: 9999px;
            background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
            color: #ffffff;
            border: none;
            box-shadow: 0 2px 10px rgba(230, 0, 92, 0.4);
          }
          .mobile-toggle {
            display: flex;
            padding: 6px 4px;
            cursor: pointer;
            margin-left: 2px;
          }
          .mobile-drawer {
            display: block;
            width: 100%;
            background-color: #031710;
            background-image: radial-gradient(circle at 50% 50%, rgba(6, 42, 28, 0.98) 0%, rgba(3, 23, 16, 1) 100%);
            border-top: 1px solid rgba(229, 193, 88, 0.25);
            padding: 18px 20px 24px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
            animation: drawerSlideDown 0.25s ease forwards;
          }
          .mobile-nav-links {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .mobile-nav-links :global(a),
          .mobile-nav-links :global(.mobile-nav-item) {
            color: #ffffff !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            padding: 11px 16px !important;
            border-radius: 12px !important;
            text-decoration: none !important;
            display: block !important;
            text-align: center !important;
            background: rgba(230, 0, 92, 0.18) !important;
            border: 1px solid rgba(255, 42, 115, 0.35) !important;
          }
          .mobile-nav-links :global(.active) {
            color: #ffffff !important;
            background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%) !important;
            border-color: #ff2a73 !important;
            box-shadow: 0 4px 14px rgba(230, 0, 92, 0.45) !important;
            font-weight: 700 !important;
          }
          .mobile-auth-actions {
            display: flex;
            gap: 12px;
            margin-top: 14px;
          }
          .full-w {
            flex: 1;
            text-align: center;
            display: block !important;
          }
          .mobile-user-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          }
        }

        @keyframes drawerSlideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </header>
  );
}
