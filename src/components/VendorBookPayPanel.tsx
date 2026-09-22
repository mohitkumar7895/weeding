'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { displayPackages, GUEST_OPTIONS } from '@/lib/vendorPackages';

type DayStatus = { date: string; available: boolean; status: string };

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    const src = 'https://checkout.razorpay.com/v1/checkout.js';
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function VendorBookPayPanel({
  vendor,
  selectedPackageId,
  onNeedLogin,
}: {
  vendor: any;
  selectedPackageId?: string | null;
  onNeedLogin: () => void;
}) {
  const [month, setMonth] = useState(currentMonth);
  const [days, setDays] = useState<DayStatus[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [guestCount, setGuestCount] = useState('150');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pendingPay, setPendingPay] = useState<{
    bookingId: string;
    bookingNumber: string;
    amount: number;
    date: string;
  } | null>(null);
  const payLock = useRef(false);

  const packages = useMemo(
    () => displayPackages(vendor.packages, vendor.starting_price),
    [vendor.packages, vendor.starting_price]
  );

  useEffect(() => {
    if (selectedPackageId) {
      const match = packages.find((p) => p.id === selectedPackageId || p.package_tier === selectedPackageId);
      if (match) setSelectedKey(match.id || match.package_tier);
    } else if (!selectedKey && packages[0]) {
      setSelectedKey(packages[0].id || packages[0].package_tier);
    }
  }, [selectedPackageId, packages]);

  const selectedPkg = packages.find((p) => (p.id || p.package_tier) === selectedKey) || packages[0];
  const amount = Number(selectedPkg?.price || vendor.starting_price || 0);
  const advance = Math.round(amount * 0.25);

  useEffect(() => {
    let cancelled = false;
    setLoadingDays(true);
    fetch(`/api/vendors/${vendor.id}/availability?month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDays(data.success ? data.data?.dates || [] : []);
      })
      .catch(() => {
        if (!cancelled) setDays([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDays(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vendor.id, month]);

  const today = new Date().toISOString().slice(0, 10);
  const monthTitle = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  }, [month]);

  const openCheckout = async (bookingId: string, payAmount: number, dateLabel: string) => {
    if (payLock.current) return;
    payLock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider: 'razorpay' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'err', text: data.message || 'Could not start payment.' });
        return;
      }
      const keyId = data.data?.key_id;
      if (!keyId || keyId === 'rzp_mock') {
        setMessage({
          type: 'err',
          text: 'Razorpay is not configured. Payment cannot start until keys are set on the server.',
        });
        return;
      }
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setMessage({ type: 'err', text: 'Failed to load Razorpay checkout.' });
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: keyId,
        amount: Math.round(Number(data.data.amount) * 100),
        currency: data.data.currency || 'INR',
        name: 'WedWithMe',
        description: `Advance for ${vendor.business_name} · ${dateLabel}`,
        order_id: data.data.order_id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                booking_id: bookingId,
                payment_transaction_id: data.data.payment_transaction_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setPendingPay(null);
              setMessage({
                type: 'ok',
                text: `Payment confirmed for ${vendor.business_name}. ₹${Number(payAmount).toLocaleString('en-IN')} is in escrow and ${dateLabel} is locked.`,
              });
            } else {
              setMessage({ type: 'err', text: verifyData.message || 'Payment verification failed.' });
            }
          } catch (err: any) {
            setMessage({ type: 'err', text: err.message });
          }
        },
        theme: { color: '#e6005c' },
      });
      rzp.on('payment.failed', function (response: any) {
        setMessage({ type: 'err', text: response.error?.description || 'Payment failed' });
      });
      rzp.open();
    } catch (err: any) {
      setMessage({ type: 'err', text: err.message });
    } finally {
      payLock.current = false;
      setBusy(false);
    }
  };

  const handleBookAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!eventDate) {
      setMessage({ type: 'err', text: 'Select an available date from the calendar.' });
      return;
    }

    const me = await fetch('/api/auth/me', { credentials: 'include' }).then((r) => r.json()).catch(() => null);
    if (!me?.authenticated) {
      onNeedLogin();
      setMessage({ type: 'err', text: 'Log in as a customer, then book this vendor.' });
      return;
    }

    setBusy(true);
    try {
      let lockToken: string | undefined;
      const lockRes = await fetch('/api/vendor/availability/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vendor_id: vendor.id, event_date: eventDate }),
      });
      const lockData = await lockRes.json();
      if (lockRes.ok && lockData.success) {
        lockToken = lockData.data?.lock_token;
      } else if (lockRes.status === 409) {
        setMessage({ type: 'err', text: lockData.message || 'This date is no longer available.' });
        return;
      }

      const bookRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vendor_id: vendor.id,
          package_id: selectedPkg?.id || null,
          package_tier: selectedPkg?.id ? undefined : selectedPkg?.package_tier,
          event_date: eventDate,
          guest_count: Number(guestCount) || 150,
          notes: notes || `Booking for ${vendor.business_name} · ${selectedPkg?.name || 'package'}`,
          lock_token: lockToken,
        }),
      });
      const bookData = await bookRes.json();
      if (bookRes.status === 401) {
        onNeedLogin();
        setMessage({ type: 'err', text: 'Log in as a customer, then book this vendor.' });
        return;
      }
      if (!bookRes.ok || !bookData.success) {
        setMessage({ type: 'err', text: bookData.message || 'Could not place booking.' });
        return;
      }

      const created = {
        bookingId: bookData.data.id,
        bookingNumber: bookData.data.booking_number,
        amount: Number(bookData.data.total_amount || amount),
        date: eventDate,
      };
      setPendingPay(created);
      await openCheckout(created.bookingId, created.amount, created.date);
    } catch (err: any) {
      setMessage({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="vendor-book-panel" className="vd-book">
      <h3>Check availability & pay</h3>
      <p className="vd-book-copy">
        Dates and payment are for <strong>{vendor.business_name}</strong>. Escrow holds the amount until the event is delivered.
      </p>

      <div className="vd-month">
        <button type="button" className="vd-nav" onClick={() => setMonth((m) => shiftMonth(m, -1))}>‹</button>
        <strong>{monthTitle}</strong>
        <button type="button" className="vd-nav" onClick={() => setMonth((m) => shiftMonth(m, 1))}>›</button>
      </div>

      <div className="vd-week">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>

      {loadingDays ? (
        <p className="vd-legend">Loading dates…</p>
      ) : (
        <div className="vd-cal">
          {Array.from({ length: days[0] ? new Date(`${days[0].date}T00:00:00`).getDay() : 0 }).map((_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {days.map((d) => {
            const past = d.date < today;
            const disabled = past || !d.available;
            const selected = eventDate === d.date;
            return (
              <button
                key={d.date}
                type="button"
                disabled={disabled}
                onClick={() => setEventDate(d.date)}
                title={disabled ? 'Not available' : d.date}
                className={`vd-day ${selected ? 'is-pick' : disabled ? 'is-off' : 'is-open'}`}
              >
                {d.date.slice(8)}
              </button>
            );
          })}
        </div>
      )}
      <div className="vd-legend">Green = available · Grey = booked or blocked · Pink = selected</div>

      <form onSubmit={handleBookAndPay}>
        <label className="vd-label">Package details</label>
        <div className="vd-pkg-list">
          {packages.map((pkg) => {
            const key = pkg.id || pkg.package_tier;
            const active = selectedKey === key;
            return (
              <button
                key={key}
                type="button"
                className={`vd-pkg-choice${active ? ' is-active' : ''}`}
                onClick={() => setSelectedKey(key)}
              >
                <span>
                  <b>{pkg.name}</b>
                  <small>{pkg.description}</small>
                </span>
                <strong>₹{pkg.price.toLocaleString('en-IN')}</strong>
              </button>
            );
          })}
        </div>

        <label className="vd-label">Event date</label>
        <input className="vd-field" value={eventDate} readOnly placeholder="Tap a green date" />

        <label className="vd-label">Expected guests</label>
        <select className="vd-field" value={guestCount} onChange={(e) => setGuestCount(e.target.value)}>
          {GUEST_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <label className="vd-label">Special requirements / notes</label>
        <textarea className="vd-field" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="e.g. Traditional theme, Jain food, drone coverage..." />

        <div className="vd-paybox">
          <small>Pay to {vendor.business_name} · 25% escrow advance</small>
          <b>₹{advance.toLocaleString('en-IN')} / ₹{amount.toLocaleString('en-IN')} total</b>
          <p>{eventDate || 'Pick a date'} · {selectedPkg?.name}</p>
        </div>

        {message && <div className={`vd-alert ${message.type}`}>{message.text}</div>}

        <button className="btn-search-primary" type="submit" disabled={busy} style={{ width: '100%', padding: '14px', fontSize: 16 }}>
          {busy ? 'Processing…' : 'Confirm & pay advance →'}
        </button>
      </form>

      {pendingPay && (
        <button type="button" className="vd-retry" disabled={busy} onClick={() => openCheckout(pendingPay.bookingId, pendingPay.amount, pendingPay.date)}>
          Retry payment for #{pendingPay.bookingNumber}
        </button>
      )}
    </div>
  );
}
