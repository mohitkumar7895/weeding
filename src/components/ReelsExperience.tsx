'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import './reels.css';

type Reel = {
  id: string;
  video_url: string;
  thumbnail_url?: string;
  title: string;
  description?: string;
  author_name?: string;
  poster_role?: string;
  author_user_id?: string;
  vendor_id?: string;
  profile_id?: string;
  author_posts?: number;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  liked_by_me?: boolean | number;
  saved_by_me?: boolean | number;
  saves_count?: number;
};

function guestHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  try {
    let id = localStorage.getItem('wwm_guest_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('wwm_guest_id', id);
    }
    headers['x-wwm-guest-id'] = id;
  } catch {
    /* private mode */
  }
  return headers;
}

function playableSrc(url?: string) {
  const u = String(url || '').trim();
  if (!u || u.startsWith('data:')) return '';
  if (u.startsWith('/') || u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:')) return u;
  return '';
}

function fmt(n?: number) {
  const v = Number(n || 0);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(v);
}

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`ig-ico ${filled ? 'is-liked' : ''}`}>
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={filled ? '#ff2d55' : 'none'}
        stroke={filled ? '#ff2d55' : '#fff'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconComment() {
  return (
    <svg viewBox="0 0 24 24" className="ig-ico">
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShare() {
  return (
    <svg viewBox="0 0 24 24" className="ig-ico">
      <path d="M22 2 11 13" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function IconMute({ muted }: { muted: boolean }) {
  return muted ? (
    <svg viewBox="0 0 24 24" className="ig-ico">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="23" y1="9" x2="17" y2="15" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="17" y1="9" x2="23" y2="15" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="ig-ico">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconSave({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="ig-ico">
      <path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
        fill={filled ? '#fff' : 'none'}
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCameraPlus() {
  return (
    <svg viewBox="0 0 24 24" className="ig-plus-ico">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="18.5" cy="7.2" r="3.4" fill="#ff2d55" stroke="#fff" strokeWidth="1.4" />
      <path d="M18.5 5.7v3M17 7.2h3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function ReelsExperience({
  showComposer = true,
}: {
  showComposer?: boolean;
  title?: string;
}) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [commentReel, setCommentReel] = useState<Reel | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [caption, setCaption] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [authorFilter, setAuthorFilter] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const showToast = (line: string) => {
    setToast(line);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  };

  const requireSession = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      return Boolean(data.authenticated && data.user?.id);
    } catch {
      return false;
    }
  };

  const load = async (author?: string) => {
    setLoading(true);
    try {
      const who = author ?? authorFilter;
      const qs = who ? `&user=${encodeURIComponent(who)}` : '';
      const res = await fetch(`/api/reels?bundle=1${qs}`, {
        credentials: 'include',
        headers: guestHeaders(),
      });
      const data = await res.json();
      setReels((data.data || data.reels || []).filter((r: Reel) => playableSrc(r.video_url)));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Could not load reels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const who = new URLSearchParams(window.location.search).get('user') || '';
    setAuthorFilter(who);
    load(who);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            if (!video.currentSrc && !video.src) return;
            video.muted = muted;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.65 }
    );
    videoRefs.current.forEach((v) => v && observer.observe(v));
    return () => observer.disconnect();
  }, [reels, muted, activeIndex]);

  const pickVideo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Choose an MP4, WebM, or MOV video file.');
      return;
    }
    if (file.size > 60 * 1024 * 1024) {
      setError('Video must be 60 MB or smaller.');
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setError('');
  };

  const postReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      setError('Upload a video from your camera or gallery.');
      return;
    }
    setPosting(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', videoFile);
      form.append('title', caption);
      form.append('caption', caption);
      form.append('description', caption);
      const res = await fetch('/api/reels', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (res.status === 401) {
        router.push('/login?next=/reels');
        throw new Error(data.message || 'Sign in to post a reel');
      }
      if (res.status === 413) {
        throw new Error('Video too large for upload. Use a smaller clip.');
      }
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not post');
      setComposeOpen(false);
      setCaption('');
      setVideoFile(null);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview('');
      showToast('Video post ho gayi');
      const posted = data.reel || data.data;
      if (posted?.id) {
        setReels((prev) => [{ ...posted, saved_by_me: 1, saves_count: posted.saves_count || 1 }, ...prev.filter((r) => r.id !== posted.id)]);
        setActiveIndex(0);
      } else {
        await load();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (reel: Reel) => {
    const wasLiked = Boolean(reel.liked_by_me);
    const nextLiked = !wasLiked;
    const nextCount = Math.max(0, Number(reel.likes_count || 0) + (nextLiked ? 1 : -1));
    setReels((prev) =>
      prev.map((r) => (r.id === reel.id ? { ...r, liked_by_me: nextLiked, likes_count: nextCount } : r))
    );
    try {
      const res = await fetch(`/api/reels/${encodeURIComponent(reel.id)}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: guestHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setReels((prev) =>
          prev.map((r) =>
            r.id === reel.id ? { ...r, liked_by_me: data.liked, likes_count: Number(data.likes_count || 0) } : r
          )
        );
      } else {
        setReels((prev) =>
          prev.map((r) =>
            r.id === reel.id ? { ...r, liked_by_me: wasLiked, likes_count: reel.likes_count } : r
          )
        );
        if (res.status === 401) setError('Sign in to like reels.');
        else setError(data.message || 'Could not save like.');
      }
    } catch {
      setReels((prev) =>
        prev.map((r) => (r.id === reel.id ? { ...r, liked_by_me: wasLiked, likes_count: reel.likes_count } : r))
      );
      setError('Could not save like.');
    }
  };

  const toggleSave = async (reel: Reel) => {
    const res = await fetch(`/api/reels/${reel.id}/save`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setReels((prev) =>
        prev.map((r) =>
          r.id === reel.id ? { ...r, saved_by_me: data.saved, saves_count: data.saves_count } : r
        )
      );
    } else if (res.status === 401) {
      setError('Sign in to save reels.');
    }
  };

  const openComments = async (reel: Reel) => {
    setCommentReel(reel);
    const res = await fetch(`/api/reels/${reel.id}/comments`, { credentials: 'include' });
    const data = await res.json();
    setComments(data.data || []);
  };

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentReel || !commentText.trim()) return;
    const res = await fetch(`/api/reels/${commentReel.id}/comments`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: commentText }),
    });
    const data = await res.json();
    if (data.success) {
      setComments((prev) => [data.comment, ...prev]);
      setCommentText('');
      setReels((prev) =>
        prev.map((r) =>
          r.id === commentReel.id ? { ...r, comments_count: Number(r.comments_count || 0) + 1 } : r
        )
      );
    } else {
      setError(data.message || 'Sign in to comment.');
    }
  };

  const shareReel = async (reel: Reel) => {
    const url = `${window.location.origin}/reels?id=${reel.id}`;
    try {
      if (navigator.share) await navigator.share({ title: reel.title, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      await navigator.clipboard.writeText(url);
    }
    const res = await fetch(`/api/reels/${reel.id}/share`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setReels((prev) => prev.map((r) => (r.id === reel.id ? { ...r, shares_count: data.shares_count } : r)));
    }
  };

  const openAuthor = (reel: Reel) => {
    const pid = String(reel.profile_id || reel.author_user_id || reel.vendor_id || '').trim();
    if (!pid) return;
    router.push(`/reels?user=${encodeURIComponent(pid)}`);
    setAuthorFilter(pid);
    load(pid);
  };

  const openComposer = async () => {
    const ok = await requireSession();
    if (!ok) {
      showToast('Sign in to post a reel');
      router.push('/login?next=/reels');
      return;
    }
    setComposeOpen(true);
  };
  const plus = showComposer ? (
    <button type="button" className="ig-plus" aria-label="Add reel" onClick={openComposer}>
      <IconCameraPlus />
    </button>
  ) : null;

  return (
    <div className="ig-reels">
      {toast && (
        <div className="ig-toast" role="status">
          {toast}
        </div>
      )}
      {authorFilter && (
        <div className="ig-author-bar">
          <button type="button" onClick={() => { setAuthorFilter(''); router.push('/reels'); load(''); }}>
            ← All reels
          </button>
          <span>This profile’s reels</span>
        </div>
      )}

      {error && <div className="ig-banner">{error}</div>}

      {loading ? (
        <div className="ig-empty ig-empty-stage">
          {plus}
          <p>Loading reels…</p>
        </div>
      ) : reels.length === 0 ? (
        <div className="ig-empty ig-empty-stage">
          {plus}
          <p>Tap + to post a reel</p>
        </div>
      ) : (
        <div
          className="ig-feed"
          ref={feedRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const h = el.clientHeight || 1;
            const next = Math.round(el.scrollTop / h);
            if (next !== activeIndex) setActiveIndex(next);
          }}
        >
          {reels.map((reel, index) => {
            const nearby = Math.abs(index - activeIndex) <= 1;
            const liked = Boolean(reel.liked_by_me);
            const saved = Boolean(reel.saved_by_me);
            const src = playableSrc(reel.video_url);
            return (
              <article key={reel.id} className="ig-slide">
                {nearby && src ? (
                  <video
                    ref={(el) => {
                      videoRefs.current[index] = el;
                    }}
                    src={src}
                    poster={playableSrc(reel.thumbnail_url) || undefined}
                    loop
                    playsInline
                    muted={muted}
                    preload={index === activeIndex ? 'metadata' : 'none'}
                    onError={(e) => {
                      const v = e.currentTarget;
                      v.removeAttribute('src');
                      v.load();
                    }}
                    onDoubleClick={() => toggleLike(reel)}
                    onClick={(e) => {
                      const v = e.currentTarget;
                      if (!v.currentSrc) return;
                      if (v.paused) v.play().catch(() => {});
                      else v.pause();
                    }}
                  />
                ) : (
                  <div className="ig-slide-placeholder" />
                )}
                {showComposer && (
                  <button type="button" className="ig-plus" aria-label="Add reel" onClick={openComposer}>
                    <IconCameraPlus />
                  </button>
                )}
                <div className="ig-actions">
                  <button type="button" onClick={() => toggleLike(reel)} aria-label="Like">
                    <IconHeart filled={liked} />
                    <small>{fmt(reel.likes_count)}</small>
                  </button>
                  <button type="button" onClick={() => openComments(reel)} aria-label="Comment">
                    <IconComment />
                    <small>{fmt(reel.comments_count)}</small>
                  </button>
                  <button type="button" onClick={() => shareReel(reel)} aria-label="Share">
                    <IconShare />
                    <small>{fmt(reel.shares_count)}</small>
                  </button>
                  <button type="button" onClick={() => toggleSave(reel)} aria-label="Save">
                    <IconSave filled={saved} />
                    <small>{fmt(reel.saves_count)}</small>
                  </button>
                  <button type="button" onClick={() => setMuted((m) => !m)} aria-label="Audio">
                    <IconMute muted={muted} />
                  </button>
                </div>
                <div className="ig-meta">
                  <button
                    type="button"
                    className="ig-profile"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAuthor(reel);
                    }}
                  >
                    <span className="ig-avatar">{(reel.author_name || 'M').slice(0, 1).toUpperCase()}</span>
                    <span className="ig-profile-text">
                      <strong>@{reel.author_name || 'member'}</strong>
                    </span>
                  </button>
                  <p>{reel.title || reel.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {composeOpen && (
        <div className="ig-modal" onClick={() => setComposeOpen(false)}>
          <form className="ig-sheet" onClick={(e) => e.stopPropagation()} onSubmit={postReel}>
            <h3>New reel</h3>
            <p>Pick a video from camera or gallery. MP4 / WebM / MOV, up to 60 MB.</p>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              required
              onChange={(e) => pickVideo(e.target.files?.[0])}
            />
            {videoPreview && (
              <video src={videoPreview} controls playsInline className="ig-preview" />
            )}
            <textarea
              required
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption…"
              rows={3}
            />
            <div className="ig-sheet-actions">
              <button type="button" onClick={() => setComposeOpen(false)}>Cancel</button>
              <button type="submit" disabled={posting}>{posting ? 'Saving…' : 'Post & save'}</button>
            </div>
          </form>
        </div>
      )}

      {commentReel && (
        <div className="ig-modal" onClick={() => setCommentReel(null)}>
          <div className="ig-sheet" onClick={(e) => e.stopPropagation()}>
            <h3>Comments</h3>
            <div className="ig-comments">
              {comments.length === 0 && <p>No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="ig-comment">
                  <b>{c.author_name || 'Member'}</b>
                  <span>{c.body}</span>
                </div>
              ))}
            </div>
            <form onSubmit={sendComment} className="ig-comment-form">
              <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment…" />
              <button type="submit">Post</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
