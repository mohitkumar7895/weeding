'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context';

interface NavbarProps {
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

export default function Navbar({ onOpenLogin, onOpenRegister }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeLink, setActiveLink] = useState('Home');
  const { user, setUser } = useAppContext();

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Vendors', href: '#vendors' },
    { name: 'Matches', href: '#matches' },
    { name: 'Bookings', href: '#bookings' },
    { name: 'About Us', href: '#about' },
  ];

  return (
    <header className="navbar-wrapper">
      <div className="container-custom navbar-container">
        {/* Brand Logo */}
        <Link href="/" className="brand-logo" aria-label="WedWithMe Home">
          <div className="logo-icon-svg">
            <svg width="46" height="34" viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="wwmGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff4d79" />
                  <stop offset="50%" stopColor="#ff7a3d" />
                  <stop offset="100%" stopColor="#ff0055" />
                </linearGradient>
                <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffc107" />
                  <stop offset="100%" stopColor="#ff4081" />
                </linearGradient>
              </defs>
              {/* Left W */}
              <path
                d="M4 10L11 32L17 14L22 30L26 12"
                stroke="url(#wwmGradient)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Central Heart */}
              <path
                d="M27 10C24 6 20 8 20 12C20 17 27 22 27 22C27 22 34 17 34 12C34 8 30 6 27 10Z"
                fill="url(#heartGrad)"
              />
              {/* Right W */}
              <path
                d="M28 12L32 30L37 14L43 32L50 10"
                stroke="url(#wwmGradient)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="desktop-nav" aria-label="Primary Navigation">
          {navLinks.map((item) => (
            <a
              key={item.name}
              href={item.href}
              onClick={() => setActiveLink(item.name)}
              className={`nav-item ${activeLink === item.name ? 'nav-item-active' : ''}`}
            >
              {item.name}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="navbar-actions">
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
              <div className="user-avatar-circle">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="user-display-name">{user.name}</span>
              <button
                className="btn-logout"
                title="Sign out"
                onClick={() => setUser(null)}
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
              <a
                key={item.name}
                href={item.href}
                onClick={() => {
                  setActiveLink(item.name);
                  setMobileMenuOpen(false);
                }}
                className={`mobile-nav-item ${activeLink === item.name ? 'active' : ''}`}
              >
                {item.name}
              </a>
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
          background-color: #061a12;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          width: 100%;
        }

        .navbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 70px;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .logo-icon-svg {
          display: flex;
          align-items: center;
          transition: transform 0.25s ease;
        }

        .brand-logo:hover .logo-icon-svg {
          transform: scale(1.05);
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 34px;
        }

        .nav-item {
          color: #d1ded8;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.2px;
          transition: color 0.2s ease;
          position: relative;
          padding: 4px 0;
        }

        .nav-item:hover {
          color: #ffffff;
        }

        .nav-item-active {
          color: #ffffff;
          font-weight: 600;
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 14px;
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
        }

        .icon-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
        }

        .btn-login {
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 600;
          padding: 7px 22px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.04);
          transition: all 0.2s ease;
        }

        .btn-login:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.6);
        }

        .btn-register {
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 600;
          padding: 7px 24px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #f72585 0%, #e6005c 100%);
          box-shadow: 0 4px 14px rgba(230, 0, 92, 0.35);
          transition: all 0.2s ease;
        }

        .btn-register:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(230, 0, 92, 0.5);
          filter: brightness(1.05);
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
          background: #e5c158;
          color: #061a12;
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
          color: #ff4d79;
          font-size: 11.5px;
          font-weight: 600;
          margin-left: 4px;
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
          }
          .mobile-toggle {
            display: flex;
          }
          .mobile-drawer {
            display: block;
            background: #041b13;
            border-bottom: 1px solid rgba(255, 255, 255, 0.12);
            padding: 20px 24px;
          }
          .mobile-nav-links {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .mobile-nav-item {
            color: #d1ded8;
            font-size: 16px;
            font-weight: 500;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .mobile-nav-item.active {
            color: #e5c158;
            font-weight: 600;
          }
          .mobile-auth-actions {
            display: flex;
            gap: 12px;
            margin-top: 12px;
          }
          .full-w {
            flex: 1;
            text-align: center;
          }
          .mobile-user-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          }
        }
      `}</style>
    </header>
  );
}
