'use client';
import React, { useState } from 'react';

export default function AIVendorRecommendations() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [requirements, setRequirements] = useState('');

  const fetchRecommendations = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, city, requirements })
      });
      const data = await res.json();
      
      if (data.success) {
        setRecommendations(data.recommendations);
      } else {
        setError(data.message || 'Failed to fetch recommendations');
      }
    } catch (err: any) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#0a251b', padding: '24px', borderRadius: '12px', border: '1px solid rgba(229,193,88,0.3)', marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, color: '#e5c158', fontSize: '22px' }}>✨ Sagun AI Recommendations</h2>
      </div>
      
      <div style={{ padding: '12px 16px', background: 'rgba(255,107,157,0.1)', borderLeft: '4px solid #ff6b9d', marginBottom: '24px', borderRadius: '4px' }}>
        <p style={{ margin: 0, color: '#ff6b9d', fontSize: '13px' }}>
          <strong>Disclaimer:</strong> Recommendations are based on your inputs and currently available platform data. Suitability is not guaranteed. Always verify vendor details directly.
        </p>
      </div>

      <form onSubmit={fetchRecommendations} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', color: '#a0aec0', fontSize: '14px', marginBottom: '8px' }}>Category</label>
          <input 
            type="text" 
            placeholder="e.g. Photography" 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: '100%', padding: '12px', background: '#031710', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} 
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', color: '#a0aec0', fontSize: '14px', marginBottom: '8px' }}>City</label>
          <input 
            type="text" 
            placeholder="e.g. Mumbai" 
            value={city} 
            onChange={(e) => setCity(e.target.value)}
            style={{ width: '100%', padding: '12px', background: '#031710', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} 
          />
        </div>
        <div style={{ flex: '2 1 300px' }}>
          <label style={{ display: 'block', color: '#a0aec0', fontSize: '14px', marginBottom: '8px' }}>Specific Requirements</label>
          <input 
            type="text" 
            placeholder="e.g. Candid style, under ₹50,000" 
            value={requirements} 
            onChange={(e) => setRequirements(e.target.value)}
            style={{ width: '100%', padding: '12px', background: '#031710', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} 
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '12px 24px', background: '#e5c158', color: '#031710', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Analyzing...' : 'Ask Sagun'}
          </button>
        </div>
      </form>

      {error && <div style={{ color: '#fc8181', marginBottom: '16px' }}>{error}</div>}

      {recommendations.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {recommendations.map(vendor => (
            <div key={vendor.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>{vendor.business_name || 'Unnamed Business'}</h3>
                <span style={{ background: '#e5c158', color: '#031710', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                  ★ {vendor.rating.toFixed(1)}
                </span>
              </div>
              <p style={{ margin: '0 0 16px 0', color: '#a0aec0', fontSize: '14px' }}>{vendor.category} • {vendor.city}</p>
              
              {vendor.ai_reasoning ? (
                <div style={{ marginTop: 'auto', padding: '12px', background: 'rgba(229,193,88,0.1)', borderRadius: '8px', borderLeft: '3px solid #e5c158' }}>
                  <p style={{ margin: 0, color: '#e5c158', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Sagun's Note:</p>
                  <p style={{ margin: 0, color: '#cbd5e0', fontSize: '13px', lineHeight: '1.4' }}>{vendor.ai_reasoning}</p>
                </div>
              ) : (
                <div style={{ marginTop: 'auto', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                   <p style={{ margin: 0, color: '#a0aec0', fontSize: '12px' }}>Top matching vendor based on database ranking.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {!loading && recommendations.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
          Tell Sagun what you're looking for above to get started.
        </div>
      )}
    </div>
  );
}
