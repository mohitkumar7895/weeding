'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function ReelsFeed() {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For pausing videos not currently in view
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    fetchReels();
  }, []);

  useEffect(() => {
    // Intersection Observer to handle auto-play/pause based on scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          // Play when mostly in view
          video.play().catch(e => console.log('Auto-play prevented by browser', e));
        } else {
          // Pause when scrolled away
          video.pause();
        }
      });
    }, {
      threshold: 0.6 // 60% of the video must be visible
    });

    videoRefs.current.forEach(v => {
      if (v) observer.observe(v);
    });

    return () => {
      videoRefs.current.forEach(v => {
        if (v) observer.unobserve(v);
      });
    };
  }, [reels]);

  const fetchReels = async () => {
    try {
      const res = await fetch('/api/public/reels');
      const data = await res.json();
      if (data.success) {
        setReels(data.reels);
      } else {
        setError('Failed to load reels.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
        Loading Reels...
      </div>
    );
  }

  if (error || reels.length === 0) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <p style={{ color: '#fc8181' }}>{error || 'No vendor reels available right now.'}</p>
        <button 
          onClick={fetchReels}
          style={{ padding: '10px 20px', background: '#e5c158', color: '#031710', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '16px' }}
        >
          Refresh Feed
        </button>
      </div>
    );
  }

  return (
    <div 
      style={{
        height: 'calc(100vh - 80px)', // Assuming a navbar exists
        width: '100%',
        maxWidth: '500px', // Mobile-first constraint even on desktop
        margin: '0 auto',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        background: '#000'
      }}
    >
      {reels.map((reel, index) => (
        <div 
          key={reel.id} 
          style={{
            position: 'relative',
            height: '100%', // Take up full height of the scrolling container
            width: '100%',
            scrollSnapAlign: 'start', // Snap point
            background: '#111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {/* Video Player */}
          <video
            ref={el => { videoRefs.current[index] = el; }}
            src={reel.video_url}
            poster={reel.thumbnail_url || undefined}
            loop
            muted // Muted required for mobile auto-play policies
            playsInline
            controls={false}
            onClick={(e) => {
              const v = e.target as HTMLVideoElement;
              if (v.paused) v.play(); else v.pause();
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              cursor: 'pointer'
            }}
          />

          {/* Overlay Content */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '24px 16px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none' // Let clicks pass through to pause/play video, except on links
          }}>
            <h2 style={{ color: '#fff', fontSize: '18px', margin: '0 0 8px 0', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {reel.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: '#e5c158', fontSize: '15px', fontWeight: 'bold' }}>{reel.business_name}</span>
              <span style={{ color: '#cbd5e0', fontSize: '13px' }}>• {reel.category}</span>
            </div>
            
            {reel.description && (
              <p style={{ color: '#e2e8f0', fontSize: '14px', margin: '0 0 16px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {reel.description}
              </p>
            )}

            <a 
              href={`/vendor/${reel.vendor_id}`} 
              style={{
                display: 'inline-block',
                pointerEvents: 'auto', // Re-enable clicks here
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: '24px',
                fontSize: '14px',
                border: '1px solid rgba(255,255,255,0.3)',
                fontWeight: '500'
              }}
            >
              View Vendor Profile ↗
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
