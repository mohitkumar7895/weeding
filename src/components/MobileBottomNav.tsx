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
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#ff2a73' : 'none'} stroke={active ? '#ff2a73' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" fill="#031710" />
        </svg>
      ),
      isActive: pathname === '/',
    },
    {
      label: 'Matches',
      href: '/matches',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#ff2a73' : 'none'} stroke={active ? '#ff2a73' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
      isActive: pathname.startsWith('/matches'),
    },
    {
      label: 'Bookings',
      href: '/bookings',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#ff2a73' : 'none'} stroke={active ? '#ff2a73' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#ff2a73' : 'none'} stroke={active ? '#ff2a73' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#ff2a73' : 'none'} stroke={active ? '#ff2a73' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        >
          <div className="icon-wrapper">
            {item.icon(item.isActive)}
            {item.isActive && <span className="active-dot" />}
          </div>
          <span className="tab-label">{item.label}</span>
        </Link>
      ))}

      <style jsx>{`
        .mobile-bottom-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 66px;
          background: #031710;
          background-image: linear-gradient(180deg, rgba(6, 42, 28, 0.95) 0%, rgba(3, 23, 16, 0.99) 100%);
          border-top: 1px solid rgba(229, 193, 88, 0.22);
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0 8px calc(env(safe-area-inset-bottom, 0px) + 2px);
          z-index: 9999;
          box-shadow: 0 -4px 25px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .mobile-bar-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          color: #9cb1a6;
          font-size: 11px;
          font-weight: 500;
          flex: 1;
          height: 100%;
          gap: 3px;
          transition: all 0.2s ease;
          position: relative;
        }

        .mobile-bar-tab.active-tab {
          color: #ff2a73;
          font-weight: 700;
        }

        .icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .mobile-bar-tab.active-tab .icon-wrapper {
          transform: translateY(-2px);
          filter: drop-shadow(0 2px 6px rgba(230, 0, 92, 0.45));
        }

        .tab-label {
          letter-spacing: 0.1px;
          line-height: 1;
        }

        .active-dot {
          position: absolute;
          bottom: -4px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #ff2a73;
          box-shadow: 0 0 6px #ff2a73;
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
