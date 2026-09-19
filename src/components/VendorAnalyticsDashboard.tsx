'use client';
import React, { useState, useEffect } from 'react';

export default function VendorAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'30' | '90' | 'ALL'>('30');

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParam = timeframe === 'ALL' ? '' : `?days=${timeframe}`;
      const res = await fetch(`/api/vendor/analytics${queryParam}`);
      const data = await res.json();

      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.message || 'Failed to load analytics');
      }
    } catch (err) {
      setError('Connection error while fetching analytics.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div style={{ background: '#0a251b', padding: '24px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.3)', width: '100%', maxWidth: '1000px' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#e5c158', fontSize: '24px' }}>Business Performance</h2>
          <p style={{ margin: '4px 0 0 0', color: '#a0aec0', fontSize: '14px' }}>Track your bookings, leads, and earnings securely.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
          {(['30', '90', 'ALL'] as const).map(period => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              style={{
                padding: '8px 16px',
                background: timeframe === period ? '#e5c158' : 'transparent',
                color: timeframe === period ? '#031710' : '#a0aec0',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: timeframe === period ? 'bold' : 'normal',
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              {period === 'ALL' ? 'All Time' : `Last ${period} Days`}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: '12px', background: 'rgba(252,129,129,0.1)', color: '#fc8181', borderRadius: '8px', marginBottom: '24px' }}>{error}</div>}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#a0aec0' }}>Loading your analytics...</div>
      ) : analytics ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          
          {/* Total Revenue KPI */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#a0aec0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Completed Revenue</span>
            <span style={{ color: '#48bb78', fontSize: '32px', fontWeight: 'bold', margin: '8px 0' }}>
              {formatCurrency(analytics.totalRevenue)}
            </span>
            <span style={{ color: '#cbd5e0', fontSize: '12px' }}>Net earnings from finalized bookings</span>
          </div>

          {/* Active Leads KPI */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#a0aec0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Leads</span>
            <span style={{ color: '#e5c158', fontSize: '32px', fontWeight: 'bold', margin: '8px 0' }}>
              {analytics.pendingLeads}
            </span>
            <span style={{ color: '#cbd5e0', fontSize: '12px' }}>Customers awaiting payment/confirmation</span>
          </div>

          {/* Completed Bookings KPI */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#a0aec0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Completed Bookings</span>
            <span style={{ color: '#fff', fontSize: '32px', fontWeight: 'bold', margin: '8px 0' }}>
              {analytics.completedBookings}
            </span>
            <span style={{ color: '#cbd5e0', fontSize: '12px' }}>Out of {analytics.totalLeads} total historical leads</span>
          </div>

          {/* Cancellation Rate KPI */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#a0aec0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Cancellation Rate</span>
            <span style={{ color: Number(analytics.cancellationRate) > 15 ? '#fc8181' : '#fff', fontSize: '32px', fontWeight: 'bold', margin: '8px 0' }}>
              {analytics.cancellationRate}%
            </span>
            <span style={{ color: '#cbd5e0', fontSize: '12px' }}>Bookings cancelled by either party</span>
          </div>

        </div>
      ) : (
        <div style={{ padding: '60px', textAlign: 'center', color: '#a0aec0' }}>No data available for this timeframe.</div>
      )}
    </div>
  );
}
