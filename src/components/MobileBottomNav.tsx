'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context';

export default function MobileBottomNav() {
  const pathname = usePathname() || '/';
  const { user } = useAppContext();

  const profileHref = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
    ? '/admin'
    : user?.role === 'VENDOR'
    ? '/vendor'
    : '/dashboard';

  const navItems = [
    {
      label: 'Home',
      href: '/',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff2a73' : '#c5d8cf'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      isActive: pathname === '/',
    },
    {
      label: 'Matches',
      href: '/matches',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#ff2a73' : 'none'} stroke={active ? '#ff2a73' : '#c5d8cf'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
      isActive: pathname.startsWith('/matches'),
    },
    {
      label: 'Bookings',
      href: '/bookings',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#ff2a73' : 'none'} stroke={active ? '#ff2a73' : '#c5d8cf'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      isActive: pathname.startsWith('/bookings'),
    },
    {
      label: 'Vendors',
      href: '/vendors',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#ff2a73' : 'none'} stroke={active ? '#ff2a73' : '#c5d8cf'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
      isActive: pathname.startsWith('/vendors'),
    },
    {
      label: 'Profile',
      href: profileHref,
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#ff2a73' : 'none'} stroke={active ? '#ff2a73' : '#c5d8cf'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      isActive: pathname.startsWith('/dashboard') || pathname.startsWith('/vendor') || pathname.startsWith('/admin'),
    },
  ];

  return (
    <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`mobile-bar-tab ${item.isActive ? 'active-tab' : ''}`}
          style={{ color: item.isActive ? '#ff2a73' : '#c5d8cf' }}
        >
          <div className="icon-wrapper">
            {item.icon(item.isActive)}
            {item.isActive && <span className="active-dot" />}
          </div>
          <span
            className="tab-label"
            style={{ color: item.isActive ? '#ff2a73' : '#c5d8cf', fontWeight: item.isActive ? 700 : 500 }}
          >
            {item.label}
          </span>
        </Link>
      ))}

      <style jsx global>{`
        .mobile-bottom-bar {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 64px !important;
          background: #02140d !important;
          background-image: linear-gradient(180deg, rgba(6, 42, 28, 0.98) 0%, rgba(2, 20, 13, 1) 100%) !important;
          border-top: 1px solid rgba(229, 193, 88, 0.35) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-around !important;
          padding: 0 4px calc(env(safe-area-inset-bottom, 0px) + 2px) !important;
          z-index: 9999 !important;
          box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.7) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
        }

        .mobile-bar-tab {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          text-decoration: none !important;
          color: #c5d8cf !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          flex: 1 !important;
          height: 100% !important;
          gap: 3px !important;
          transition: all 0.2s ease !important;
          position: relative !important;
        }

        .mobile-bar-tab:hover {
          color: #ffffff !important;
        }

        .mobile-bar-tab.active-tab {
          color: #ff2a73 !important;
          font-weight: 700 !important;
        }

        .icon-wrapper {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }

        .mobile-bar-tab.active-tab .icon-wrapper {
          transform: translateY(-2px) !important;
          filter: drop-shadow(0 2px 8px rgba(255, 42, 115, 0.65)) !important;
        }

        .tab-label {
          letter-spacing: 0.2px !important;
          line-height: 1 !important;
          font-size: 11px !important;
          color: #c5d8cf !important;
        }

        .mobile-bar-tab.active-tab .tab-label {
          color: #ff2a73 !important;
          font-weight: 700 !important;
        }

        .active-dot {
          position: absolute !important;
          bottom: -4px !important;
          width: 4px !important;
          height: 4px !important;
          border-radius: 50% !important;
          background: #ff2a73 !important;
          box-shadow: 0 0 8px #ff2a73 !important;
        }

        /* Hidden on tablet and desktop */
        @media (min-width: 769px) {
          .mobile-bottom-bar {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
