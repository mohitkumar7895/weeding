'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import { useAppContext } from '@/context';

interface Booking {
  id: string;
  booking_number: string;
  vendor_id: string;
  vendor_name?: string;
  category_name?: string;
  vendor_city?: string;
  event_date: string;
  guest_count: number;
  total_amount: number;
  status: 'REQUESTED' | 'ACCEPTED' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  notes?: string;
  package_name?: string;
  service_name?: string;
  created_at: string;
  refund_status?: string;
}

export default function BookingsPage() {
  const { user } = useAppContext();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatusTab, setSelectedStatusTab] = useState('ALL');
  const [statusActionLoading, setStatusActionLoading] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Review Modal state
  const [reviewModalBooking, setReviewModalBooking] = useState<Booking | null>(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Dispute Modal state
  const [disputeModalBooking, setDisputeModalBooking] = useState<Booking | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeAmount, setDisputeAmount] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // Payment Modal state
  const [paymentModalConfig, setPaymentModalConfig] = useState<{
    isOpen: boolean;
    order_id: string;
    payment_transaction_id: string;
    booking_id: string;
    amount: number;
    provider: string;
  } | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Auth Modal
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const statusTabs = [
    { id: 'ALL', label: 'All Bookings' },
    { id: 'REQUESTED', label: 'Inquiries' },
    { id: 'CONFIRMED', label: 'Confirmed (Escrow Paid)' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  useEffect(() => {
    if (user) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBookings(data.data);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayEscrow = async (booking: Booking) => {
    setStatusActionLoading(booking.id);
    setNotificationMsg(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'mock_provider',
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentModalConfig({
          isOpen: true,
          order_id: data.data.order_id,
          payment_transaction_id: data.data.payment_transaction_id,
          booking_id: booking.id,
          amount: data.data.amount,
          provider: data.data.provider
        });
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Payment initiation failed.' });
      }
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message });
    } finally {
      setStatusActionLoading(null);
    }
  };

  const handleVerifyPayment = async (success: boolean | 'UNKNOWN') => {
    if (!paymentModalConfig) return;
    setPaymentSubmitting(true);
    setNotificationMsg(null);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_transaction_id: paymentModalConfig.payment_transaction_id,
          order_id: paymentModalConfig.order_id,
          booking_id: paymentModalConfig.booking_id,
          success,
          simulated_error: success === true ? undefined : (success === 'UNKNOWN' ? undefined : 'User cancelled payment or bank rejected it.')
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.data?.status === 'PAYMENT_PENDING') {
           setNotificationMsg({
             type: 'success',
             text: `⏳ Payment is checking/processing. Please check back later. (This allows us to test the webhook reconciliation later).`
           });
        } else {
           setNotificationMsg({
            type: 'success',
            text: `🎉 Payment confirmed! ₹${Number(paymentModalConfig.amount).toLocaleString('en-IN')} held securely in platform escrow. The vendor date is now locked.`
          });
        }
      } else {
         setNotificationMsg({ type: 'error', text: data.message || data.error || 'Payment failed.' });
      }
      setPaymentModalConfig(null);
      fetchBookings();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message });
      setPaymentModalConfig(null);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (!confirm(`Are you sure you want to cancel booking #${booking.booking_number}? The date will be released and refund will be processed per cancellation policy.`)) {
      return;
    }
    setStatusActionLoading(booking.id);
    setNotificationMsg(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer requested cancellation from bookings portal' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotificationMsg({
          type: 'success',
          text: `Booking #${booking.booking_number} has been cancelled. Refund of ₹${data.data?.refund_amount || 0} initiated to your original payment method.`
        });
        fetchBookings();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Cancellation failed.' });
      }
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message });
    } finally {
      setStatusActionLoading(null);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalBooking) return;
    setReviewSubmitting(true);
    setNotificationMsg(null);

    try {
      const res = await fetch('/api/vendors/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: reviewModalBooking.vendor_id,
          booking_id: reviewModalBooking.id,
          rating: ratingVal,
          comment: reviewComment
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotificationMsg({ type: 'success', text: '⭐ Thank you! Your verified review has been published and vendor rating recalculated.' });
        setReviewModalBooking(null);
        setReviewComment('');
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Failed to submit review.' });
      }
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeModalBooking) return;
    setDisputeSubmitting(true);
    setNotificationMsg(null);

    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: disputeModalBooking.id,
          dispute_type: 'SERVICE_QUALITY',
          description: disputeReason,
          claim_amount: disputeAmount ? Number(disputeAmount) : disputeModalBooking.total_amount
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotificationMsg({
          type: 'success',
          text: `⚖️ Dispute filed successfully. Our Admin Arbitration bench will review evidence within 24 hours. Escrow payout is frozen.`
        });
        setDisputeModalBooking(null);
        setDisputeReason('');
        setDisputeAmount('');
        fetchBookings();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Failed to file dispute.' });
      }
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message });
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const getStepProgress = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 1;
      case 'ACCEPTED': return 2;
      case 'CONFIRMED': return 3;
      case 'IN_PROGRESS': return 4;
      case 'COMPLETED': return 5;
      default: return 0;
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (selectedStatusTab === 'ALL') return true;
    return b.status === selectedStatusTab;
  });

  return (
    <div className="bookings-page-root">
      <Navbar
        onOpenLogin={() => { setAuthMode('login'); setAuthModalOpen(true); }}
        onOpenRegister={() => { setAuthMode('register'); setAuthModalOpen(true); }}
      />

      <main className="bookings-main-content">
        {/* Hero Banner */}
        <section className="bookings-hero-section">
          <div className="container-custom">
            <div className="hero-text-center">
              <span className="hero-badge">100% Escrow Protected Celebrations</span>
              <h1 className="hero-title">My Wedding Bookings & Milestones</h1>
              <p className="hero-subtitle">
                Track vendor confirmations, schedule payments into secure platform escrow, and review completed services.
                Your advance is safely held until execution day.
              </p>
            </div>
          </div>
        </section>

        <section className="bookings-content-section">
          <div className="container-custom">
            {/* Notification alert */}
            {notificationMsg && (
              <div className={`notification-banner ${notificationMsg.type}`}>
                <span>{notificationMsg.type === 'success' ? '✅' : '⚠️'}</span>
                <p>{notificationMsg.text}</p>
                <button className="btn-dismiss" onClick={() => setNotificationMsg(null)}>✕</button>
              </div>
            )}

            {!user ? (
              <div className="auth-required-card">
                <span className="icon-lock">🔐</span>
                <h2>Login Required to View Bookings</h2>
                <p>Please log in to your WedWithMe account to access your booking history, escrow receipts, and vendor communications.</p>
                <button
                  className="btn-login-cta"
                  onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                >
                  Log In to Account
                </button>
              </div>
            ) : (
              <>
                {/* Status Tabs Bar */}
                <div className="status-tabs-row">
                  {statusTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedStatusTab(tab.id)}
                      className={`status-tab-btn ${selectedStatusTab === tab.id ? 'active' : ''}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Bookings Listing */}
                {loading ? (
                  <div className="loading-state-box">
                    <div className="spinner"></div>
                    <p>Loading your booking milestones...</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="empty-bookings-card">
                    <span className="empty-icon">📅</span>
                    <h3>No Bookings Found in this Category</h3>
                    <p>You haven't placed any bookings matching this status. Explore our verified marketplace to book decorators, venues, and photographers!</p>
                    <a href="/vendors" className="btn-explore-vendors">Browse Wedding Vendors →</a>
                  </div>
                ) : (
                  <div className="bookings-list-stack">
                    {filteredBookings.map((b) => {
                      const currentStep = getStepProgress(b.status);
                      const isCancelled = b.status === 'CANCELLED';
                      const isDisputed = b.status === 'DISPUTED';

                      return (
                        <div key={b.id} className="booking-card-item">
                          <div className="booking-card-header">
                            <div>
                              <div className="booking-num-row">
                                <span className="booking-tag">#{b.booking_number}</span>
                                <span className={`status-pill ${b.status.toLowerCase()}`}>
                                  {b.status.replace('_', ' ')}
                                </span>
                              </div>
                              <h3 className="vendor-title">{b.vendor_name || 'Wedding Professional'}</h3>
                              <p className="vendor-sub">{b.category_name || 'Vendor'} • {b.vendor_city || 'India'}</p>
                            </div>

                            <div className="booking-price-badge">
                              <span className="lbl">Total Package</span>
                              <span className="amt">₹{Number(b.total_amount).toLocaleString('en-IN')}</span>
                              <span className="escrow-indicator">🛡️ Escrow Guarded</span>
                            </div>
                          </div>

                          {/* 5-Step Lifecycle Stepper */}
                          {!isCancelled && !isDisputed && (
                            <div className="lifecycle-stepper-box">
                              <div className="stepper-track">
                                {[
                                  { num: 1, name: 'Inquiry Placed' },
                                  { num: 2, name: 'Vendor Accepted' },
                                  { num: 3, name: 'Escrow Confirmed' },
                                  { num: 4, name: 'In Execution' },
                                  { num: 5, name: 'Completed' },
                                ].map(step => (
                                  <div key={step.num} className={`step-node ${currentStep >= step.num ? 'active' : ''}`}>
                                    <div className="step-circle">
                                      {currentStep > step.num ? '✓' : step.num}
                                    </div>
                                    <span className="step-name">{step.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {isCancelled && (
                            <div className="cancelled-banner">
                              <span style={{ display: 'block', fontWeight: 'bold' }}>⚠️ This booking was cancelled.</span>
                              <span style={{ fontSize: '13px', display: 'block', marginTop: '4px' }}>Date reservation released back to marketplace.</span>
                              {b.refund_status && (
                                <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', fontSize: '12px' }}>
                                  Refund Status: <strong style={{ color: ['COMPLETED', 'PROCESSED'].includes(b.refund_status) ? '#38a169' : '#d69e2e' }}>{b.refund_status}</strong>
                                </div>
                              )}
                            </div>
                          )}

                          {isDisputed && (
                            <div className="disputed-banner">
                              <span>⚖️ Booking is under Admin Arbitration review. Payout funds are frozen safely in escrow.</span>
                            </div>
                          )}

                          {/* Event details row */}
                          <div className="event-details-grid">
                            <div className="info-cell">
                              <span className="cell-lbl">Event Date</span>
                              <strong className="cell-val">📅 {new Date(b.event_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                            </div>
                            <div className="info-cell">
                              <span className="cell-lbl">Package / Service</span>
                              <strong className="cell-val">🎁 {b.package_name || b.service_name || 'Custom Wedding Package'}</strong>
                            </div>
                            <div className="info-cell">
                              <span className="cell-lbl">Guest Count</span>
                              <strong className="cell-val">👥 {b.guest_count} Guests</strong>
                            </div>
                          </div>

                          {/* Card Action Buttons */}
                          <div className="card-actions-row">
                            {/* Pay Escrow Action */}
                            {(b.status === 'ACCEPTED' || b.status === 'PAYMENT_PENDING' || b.status === 'REQUESTED') && (
                              <>
                              <button
                                onClick={() => handlePayEscrow(b)}
                                disabled={statusActionLoading === b.id}
                                style={{
                                  padding: '8px 16px',
                                  background: 'linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: statusActionLoading === b.id ? 'wait' : 'pointer',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  boxShadow: '0 2px 10px rgba(230,0,92,0.4)',
                                  opacity: statusActionLoading === b.id ? 0.7 : 1,
                                }}
                              >
                                {statusActionLoading === b.id ? 'Processing...' : (b.status === 'PAYMENT_PENDING' ? 'Retry Payment / Check Status' : 'Pay Advance & Lock Date')}
                              </button>
                              <button
                                onClick={() => handleCancelBooking(b)}
                                disabled={statusActionLoading === b.id}
                                className="btn-action-cancel"
                              >
                                Cancel Booking
                              </button>
                              </>
                            )}

                            {/* Review Action (Only for COMPLETED) */}
                            {b.status === 'COMPLETED' && (
                              <button
                                className="btn-action-review"
                                onClick={() => setReviewModalBooking(b)}
                              >
                                ⭐ Leave Verified Review
                              </button>
                            )}

                            {/* State Machine Permitted Actions */}
                            {/* Handled by conditional rules below according to role permissions */}
                            
                            {/* Dispute Action (For Confirmed, In Progress, Completed) */}
                            {['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(b.status) && (
                              <button
                                className="btn-action-dispute"
                                onClick={() => setDisputeModalBooking(b)}
                              >
                                ⚖️ File Dispute
                              </button>
                            )}

                            {/* Cancel Action (Customer allowed to cancel REQUESTED, PENDING_VENDOR, ACCEPTED, PAYMENT_PENDING, CONFIRMED) */}
                            {['REQUESTED', 'PENDING_VENDOR', 'ACCEPTED', 'PAYMENT_PENDING', 'CONFIRMED'].includes(b.status) && (
                              <button
                                className="btn-action-cancel"
                                disabled={statusActionLoading === b.id}
                                onClick={() => handleCancelBooking(b)}
                              >
                                Cancel Booking
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {/* Verified Review Modal */}
      {reviewModalBooking && (
        <div className="modal-backdrop" onClick={() => setReviewModalBooking(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Verified Booking Review</h3>
              <button className="btn-close" onClick={() => setReviewModalBooking(null)}>✕</button>
            </div>

            <form onSubmit={handleSubmitReview} className="modal-body">
              <p className="vendor-target">Reviewing: <strong>{reviewModalBooking.vendor_name}</strong> (Booking #{reviewModalBooking.booking_number})</p>

              <div className="form-group">
                <label className="lbl">Rating (1 to 5 Stars)</label>
                <div className="star-rating-row">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingVal(star)}
                      className={`star-select-btn ${ratingVal >= star ? 'gold' : ''}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="rating-text">({ratingVal} / 5 Stars)</span>
                </div>
              </div>

              <div className="form-group">
                <label className="lbl">Your Experience & Feedback</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe vendor professionalism, punctuality, and output quality..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="txt-input"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-back" onClick={() => setReviewModalBooking(null)}>Cancel</button>
                <button type="submit" disabled={reviewSubmitting} className="btn-submit-gold">
                  {reviewSubmitting ? 'Publishing...' : 'Publish Verified Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalBooking && (
        <div className="modal-backdrop" onClick={() => setDisputeModalBooking(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>File Service Dispute</h3>
              <button className="btn-close" onClick={() => setDisputeModalBooking(null)}>✕</button>
            </div>

            <form onSubmit={handleSubmitDispute} className="modal-body">
              <p className="vendor-target">Vendor: <strong>{disputeModalBooking.vendor_name}</strong> (Booking #{disputeModalBooking.booking_number})</p>
              
              <div className="dispute-warning-box">
                🛡️ Filing a dispute will immediately freeze remaining escrow payouts to the vendor. Our arbitration team will mediate.
              </div>

              <div className="form-group">
                <label className="lbl">Claim Refund Amount (₹)</label>
                <input
                  type="number"
                  placeholder={String(disputeModalBooking.total_amount)}
                  value={disputeAmount}
                  onChange={(e) => setDisputeAmount(e.target.value)}
                  className="txt-input"
                />
              </div>

              <div className="form-group">
                <label className="lbl">Detailed Reason for Dispute *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe breach of deliverables, non-appearance, or service deviations..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="txt-input"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-back" onClick={() => setDisputeModalBooking(null)}>Cancel</button>
                <button type="submit" disabled={disputeSubmitting} className="btn-submit-danger">
                  {disputeSubmitting ? 'Filing...' : 'Submit to Arbitration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mock Payment Gateway Modal */}
      {paymentModalConfig?.isOpen && (
        <div className="modal-backdrop" onClick={() => setPaymentModalConfig(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>{paymentModalConfig.provider === 'mock_provider' ? 'Secure Payment Checkout' : paymentModalConfig.provider}</h3>
              <button className="btn-close" onClick={() => setPaymentModalConfig(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</div>
              <p>You are paying an advance for Booking <strong>#{bookings.find(b => b.id === paymentModalConfig.booking_id)?.booking_number}</strong></p>
              <h2 style={{ fontSize: '28px', color: '#ff2a73', margin: '15px 0' }}>
                ₹{Number(paymentModalConfig.amount).toLocaleString('en-IN')}
              </h2>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                Order ID: {paymentModalConfig.order_id}<br/>
                This is a simulated payment gateway. In a real environment, this would be Razorpay/Stripe UI.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <button 
                  disabled={paymentSubmitting}
                  onClick={() => handleVerifyPayment(true)}
                  style={{ padding: '12px', background: '#38a169', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {paymentSubmitting ? 'Verifying...' : 'Simulate Successful Payment'}
                </button>
                <button 
                  disabled={paymentSubmitting}
                  onClick={() => handleVerifyPayment('UNKNOWN')}
                  style={{ padding: '12px', background: '#d69e2e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                   Simulate Unknown/Delayed (Test Webhook)
                </button>
                <button 
                  disabled={paymentSubmitting}
                  onClick={() => handleVerifyPayment(false)}
                  style={{ padding: '12px', background: '#fc8181', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                   Simulate Payment Failure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />

      <Footer />

      <style jsx>{`
        .bookings-page-root {
          min-height: 100vh;
          background: #fdfaf7;
          display: flex;
          flex-direction: column;
        }

        .bookings-hero-section {
          background-color: #031710;
          background-image: radial-gradient(circle at 50% 50%, rgba(6, 42, 28, 0.85) 0%, rgba(3, 23, 16, 0.98) 100%);
          border-bottom: 1px solid rgba(229, 193, 88, 0.2);
          color: #ffffff;
          padding: 56px 0 46px;
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
          margin-bottom: 14px;
        }

        .hero-title {
          font-size: 36px;
          font-weight: 800;
          margin-bottom: 12px;
          color: #ffffff;
        }

        .hero-subtitle {
          font-size: 15px;
          color: #9cb1a6;
          max-width: 680px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .bookings-content-section {
          padding: 40px 0 80px;
        }

        .notification-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .notification-banner.success {
          background: #e8f5e9;
          border: 1px solid #c8e6c9;
          color: #1b5e20;
        }

        .notification-banner.error {
          background: #ffebee;
          border: 1px solid #ffcdd2;
          color: #b71c1c;
        }

        .btn-dismiss {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
        }

        .auth-required-card, .empty-bookings-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 60px 24px;
          text-align: center;
          max-width: 600px;
          margin: 40px auto;
          border: 1px solid #ede5df;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }

        .icon-lock, .empty-icon {
          font-size: 44px;
          margin-bottom: 16px;
          display: block;
        }

        .btn-login-cta, .btn-explore-vendors {
          display: inline-block;
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          border: none;
          padding: 12px 28px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          margin-top: 20px;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(230, 0, 92, 0.38);
          transition: all 0.2s ease;
        }

        .btn-login-cta:hover, .btn-explore-vendors:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(230, 0, 92, 0.55);
        }

        .status-tabs-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          margin-bottom: 24px;
          padding-bottom: 4px;
        }

        .status-tab-btn {
          background: #f0ebe4;
          border: 1px solid transparent;
          padding: 8px 18px;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          color: #4a403a;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .status-tab-btn.active {
          background: #031710;
          color: #e5c158;
          border-color: #e5c158;
          box-shadow: 0 2px 8px rgba(229, 193, 88, 0.25);
        }

        .bookings-list-stack {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .booking-card-item {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #ede7df;
          box-shadow: 0 4px 18px rgba(0,0,0,0.04);
          padding: 24px;
        }

        .booking-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #f2ede8;
          padding-bottom: 16px;
          margin-bottom: 16px;
        }

        .booking-num-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .booking-tag {
          font-size: 13px;
          font-weight: 700;
          color: #b8932f;
          font-family: monospace;
        }

        .status-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 50px;
          text-transform: uppercase;
        }

        .status-pill.confirmed { background: #e8f5e9; color: #2e7d32; }
        .status-pill.requested { background: #fff8e1; color: #f57f17; }
        .status-pill.in_progress { background: #e3f2fd; color: #1565c0; }
        .status-pill.completed { background: #ede7f6; color: #512da8; }
        .status-pill.cancelled { background: #ffebee; color: #c62828; }
        .status-pill.disputed { background: #fbe9e7; color: #d84315; }

        .vendor-title {
          font-size: 20px;
          font-weight: 800;
          color: #1a1a1a;
          margin: 4px 0 2px;
        }

        .vendor-sub {
          font-size: 13px;
          color: #777;
          margin: 0;
        }

        .booking-price-badge {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .booking-price-badge .lbl {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
          font-weight: 600;
        }

        .booking-price-badge .amt {
          font-size: 22px;
          font-weight: 800;
          color: #031710;
        }

        .escrow-indicator {
          font-size: 11px;
          color: #2e7d32;
          font-weight: 600;
          margin-top: 2px;
        }

        .lifecycle-stepper-box {
          background: #faf8f5;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 20px;
        }

        .stepper-track {
          display: flex;
          justify-content: space-between;
          position: relative;
        }

        .step-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          z-index: 1;
        }

        .step-circle {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #e0d8d0;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }

        .step-node.active .step-circle {
          background: #031710;
          color: #e5c158;
          border: 1px solid #e5c158;
        }

        .step-name {
          font-size: 11px;
          color: #777;
          font-weight: 600;
        }

        .step-node.active .step-name {
          color: #031710;
          font-weight: 700;
        }

        .event-details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          background: #fcfbfa;
          border-radius: 10px;
          padding: 14px 18px;
          margin-bottom: 20px;
        }

        .info-cell {
          display: flex;
          flex-direction: column;
        }

        .cell-lbl {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
        }

        .cell-val {
          font-size: 14px;
          color: #333;
          margin-top: 2px;
        }

        .card-actions-row {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-action-primary {
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          border: none;
          padding: 9px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(230, 0, 92, 0.35);
          transition: all 0.2s ease;
        }

        .btn-action-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(230, 0, 92, 0.5);
        }

        .btn-action-review {
          background: #031710;
          color: #e5c158;
          border: 1px solid rgba(229, 193, 88, 0.4);
          padding: 9px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-action-review:hover {
          background: linear-gradient(135deg, #f5d475 0%, #d4a937 100%);
          color: #031710;
          border-color: #e5c158;
        }

        .btn-action-dispute {
          background: #ffebee;
          color: #c62828;
          border: 1px solid #ffcdd2;
          padding: 9px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-action-cancel {
          background: #f5f2ed;
          color: #666;
          border: 1px solid #ddd;
          padding: 9px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .cancelled-banner, .disputed-banner {
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .cancelled-banner { background: #ffebee; color: #c62828; }
        .disputed-banner { background: #fbe9e7; color: #d84315; }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-panel {
          background: #fff;
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }

        .modal-header {
          padding: 18px 24px;
          border-bottom: 1px solid rgba(229, 193, 88, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #031710;
          color: #ffffff;
        }

        .modal-header h3 { margin: 0; font-size: 18px; color: #ffffff; }
        .btn-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #e5c158; }
        .modal-body { padding: 20px 24px; }
        .vendor-target { font-size: 14px; color: #555; margin-bottom: 16px; }

        .star-rating-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
        }

        .star-select-btn {
          background: none;
          border: none;
          font-size: 28px;
          color: #ddd;
          cursor: pointer;
        }

        .star-select-btn.gold { color: #e5c158; }
        .rating-text { font-size: 13px; color: #777; margin-left: 8px; }

        .txt-input {
          width: 100%;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
          margin-top: 6px;
        }

        .dispute-warning-box {
          background: #fff3e0;
          border: 1px solid #ffe0b2;
          color: #e65100;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .btn-back {
          background: #f0f0f0;
          border: none;
          padding: 9px 18px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-submit-gold {
          background: linear-gradient(135deg, #ff2a73 0%, #e6005c 100%);
          color: #ffffff;
          border: none;
          padding: 9px 20px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(230, 0, 92, 0.35);
        }

        .btn-submit-danger {
          background: #d32f2f;
          color: #fff;
          border: none;
          padding: 9px 20px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        .bookings-page-root {
          overflow-x: clip;
          max-width: 100vw;
          width: 100%;
        }

        @media (max-width: 768px) {
          .bookings-hero-section {
            padding: 28px 0 20px !important;
          }
          .hero-title {
            font-size: 24px !important;
            line-height: 1.3 !important;
          }
          .hero-subtitle {
            font-size: 13px !important;
            margin-bottom: 20px !important;
          }
          .filter-tabs-row {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .bookings-list-section {
            padding: 20px 0 60px !important;
          }
          .event-details-grid { grid-template-columns: 1fr; }
          .booking-card-header { flex-direction: column; gap: 12px; }
          .booking-price-badge { align-items: flex-start; text-align: left; }
          .stepper-track { flex-direction: column; gap: 10px; }
          .card-actions-row {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .card-actions-row button {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
