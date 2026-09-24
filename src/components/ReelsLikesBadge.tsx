'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ReelsLikesBadge({ href = '/reels' }: { href?: string }) {
  const [stats, setStats] = useState({ posted: 0, likes_received: 0, likes_given: 0 });
  useEffect(() => {
    fetch('/api/reels/stats', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => d.data && setStats(d.data))
      .catch(() => {});
  }, []);
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        margin: '12px 0 16px',
        color: '#fff8e8',
      }}
    >
      <Link
        href={href}
        style={{
          background: 'rgba(255,42,115,0.16)',
          border: '1px solid rgba(255,42,115,0.4)',
          borderRadius: 12,
          padding: '10px 14px',
          color: '#fff',
          textDecoration: 'none',
          minWidth: 92,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.posted}</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>reels posted</div>
      </Link>
      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          padding: '10px 14px',
          minWidth: 92,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.likes_received}</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>likes on posts</div>
      </div>
      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          padding: '10px 14px',
          minWidth: 92,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.likes_given}</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>likes given</div>
      </div>
    </div>
  );
}
