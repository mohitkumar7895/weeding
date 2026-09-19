import { query, transaction } from '@/lib/db';
import { randomUUID } from 'crypto';

export interface LockResult {
  success: boolean;
  code?: 'AVAILABLE' | 'BLOCKED' | 'BOOKED' | 'LOCKED' | 'ERROR';
  message: string;
  lock_token?: string;
  expires_at?: string;
  vendor_id?: string;
  event_date?: string;
  service_id?: string;
}

export interface AvailabilityCheckResult {
  available: boolean;
  status: 'AVAILABLE' | 'BLOCKED' | 'BOOKED' | 'LOCKED';
  reason?: string;
  booking_number?: string;
  expires_at?: string;
}

/**
 * Atomic double-booking prevention and booking lock foundation.
 * Uses MySQL transactions and row-level locks (FOR UPDATE) to prevent
 * concurrent reservations of the same vendor/service on a given date.
 */
export async function acquireBookingLock(params: {
  vendorId: string;
  eventDate: string;
  serviceId?: string;
  userId: string;
  ttlMinutes?: number;
}): Promise<LockResult> {
  const { vendorId, eventDate, serviceId = 'ALL', userId, ttlMinutes = 15 } = params;

  if (!vendorId || !eventDate || !userId) {
    return {
      success: false,
      code: 'ERROR',
      message: 'vendorId, eventDate, and userId are required to acquire a booking lock',
    };
  }

  // Enforce valid date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return {
      success: false,
      code: 'ERROR',
      message: 'Invalid date format. Required: YYYY-MM-DD',
    };
  }

  try {
    return await transaction(async (conn) => {
      // 1. Expire outdated locks for this vendor and date
      await conn.execute(
        `UPDATE vendor_booking_locks 
         SET status = 'EXPIRED' 
         WHERE vendor_id = ? AND event_date = ? AND status = 'LOCKED' AND expires_at <= NOW()`,
        [vendorId, eventDate]
      );

      // 2. Check vendor manual blocks / availability (with row lock)
      const [manualBlocks]: any = await conn.execute(
        `SELECT id, status, reason, notes, is_booked 
         FROM vendor_availability 
         WHERE vendor_id = ? AND date = ? 
           AND (service_id = ? OR service_id = 'ALL' OR ? = 'ALL')
           AND (status IN ('BLOCKED', 'CONFIRMED', 'BOOKING_LOCKED') OR is_booked = 1)
         FOR UPDATE`,
        [vendorId, eventDate, serviceId, serviceId]
      );

      if (manualBlocks && manualBlocks.length > 0) {
        const block = manualBlocks[0];
        return {
          success: false,
          code: 'BLOCKED',
          message: `Vendor is unavailable on ${eventDate}${block.reason ? ` (${block.reason})` : ''}.`,
        };
      }

      // 3. Check active confirmed / in-progress bookings in `bookings` (with row lock)
      const [activeBookings]: any = await conn.execute(
        `SELECT id, booking_number, status 
         FROM bookings 
         WHERE vendor_id = ? AND event_date = ? 
           AND (service_id = ? OR service_id IS NULL OR ? = 'ALL')
           AND status IN ('CONFIRMED', 'IN_PROGRESS', 'ACCEPTED', 'PAYMENT_PENDING')
         FOR UPDATE`,
        [vendorId, eventDate, serviceId, serviceId]
      );

      if (activeBookings && activeBookings.length > 0) {
        return {
          success: false,
          code: 'BOOKED',
          message: `Date ${eventDate} is already committed to confirmed booking ${activeBookings[0].booking_number}. Double-booking is strictly prohibited.`,
        };
      }

      // 4. Check active reservation locks held by other users
      const [existingLocks]: any = await conn.execute(
        `SELECT id, lock_token, locked_by_user_id, expires_at 
         FROM vendor_booking_locks 
         WHERE vendor_id = ? AND event_date = ? 
           AND (service_id = ? OR service_id = 'ALL' OR ? = 'ALL')
           AND status = 'LOCKED' 
           AND expires_at > NOW()
         FOR UPDATE`,
        [vendorId, eventDate, serviceId, serviceId]
      );

      if (existingLocks && existingLocks.length > 0) {
        const lock = existingLocks[0];
        if (lock.locked_by_user_id === userId) {
          // Re-use / extend lock for same user
          const newExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
          await conn.execute(
            `UPDATE vendor_booking_locks SET expires_at = ? WHERE id = ?`,
            [newExpiresAt, lock.id]
          );
          return {
            success: true,
            code: 'LOCKED',
            message: 'Booking lock renewed successfully',
            lock_token: lock.lock_token,
            expires_at: newExpiresAt.toISOString(),
            vendor_id: vendorId,
            event_date: eventDate,
            service_id: serviceId,
          };
        } else {
          return {
            success: false,
            code: 'LOCKED',
            message: `This date slot is currently locked by another customer during checkout. Please choose another date or try again later.`,
          };
        }
      }

      // 5. Acquire new reservation lock
      const lockToken = randomUUID();
      const lockId = randomUUID();
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      await conn.execute(
        `INSERT INTO vendor_booking_locks (
          id, vendor_id, service_id, lock_token, event_date, status, locked_by_user_id, expires_at
        ) VALUES (?, ?, ?, ?, ?, 'LOCKED', ?, ?)`,
        [lockId, vendorId, serviceId, lockToken, eventDate, userId, expiresAt]
      );

      return {
        success: true,
        code: 'AVAILABLE',
        message: 'Booking lock acquired successfully',
        lock_token: lockToken,
        expires_at: expiresAt.toISOString(),
        vendor_id: vendorId,
        event_date: eventDate,
        service_id: serviceId,
      };
    });
  } catch (error: any) {
    console.error('acquireBookingLock error:', error);
    return {
      success: false,
      code: 'ERROR',
      message: error.message || 'Failed to acquire booking lock',
    };
  }
}

/**
 * Release a previously acquired booking lock.
 */
export async function releaseBookingLock(params: {
  lockToken: string;
  userId?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    let sql = `UPDATE vendor_booking_locks SET status = 'RELEASED' WHERE lock_token = ? AND status = 'LOCKED'`;
    const sqlParams: any[] = [params.lockToken];

    if (params.userId) {
      sql += ` AND locked_by_user_id = ?`;
      sqlParams.push(params.userId);
    }

    await query(sql, sqlParams);
    return { success: true, message: 'Booking lock released successfully' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Confirm a booking lock and link to created booking.
 */
export async function confirmBookingLock(params: {
  lockToken: string;
  bookingId: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    await query(
      `UPDATE vendor_booking_locks 
       SET status = 'CONFIRMED', booking_id = ? 
       WHERE lock_token = ?`,
      [params.bookingId, params.lockToken]
    );
    return { success: true, message: 'Booking lock confirmed' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Check if a date is available for a vendor / service.
 */
export async function checkDateAvailability(params: {
  vendorId: string;
  eventDate: string;
  serviceId?: string;
}): Promise<AvailabilityCheckResult> {
  const { vendorId, eventDate, serviceId = 'ALL' } = params;

  try {
    // 1. Check manual vendor blocks
    const manualBlocks = await query<any[]>(
      `SELECT id, status, reason, is_booked 
       FROM vendor_availability 
       WHERE vendor_id = ? AND date = ? 
         AND (service_id = ? OR service_id = 'ALL' OR ? = 'ALL')
         AND (status IN ('BLOCKED', 'CONFIRMED', 'BOOKING_LOCKED') OR is_booked = 1)
       LIMIT 1`,
      [vendorId, eventDate, serviceId, serviceId]
    );

    if (manualBlocks && manualBlocks.length > 0) {
      return {
        available: false,
        status: 'BLOCKED',
        reason: manualBlocks[0].reason || 'Date blocked by vendor',
      };
    }

    // 2. Check confirmed bookings
    const activeBookings = await query<any[]>(
      `SELECT id, booking_number, status 
       FROM bookings 
       WHERE vendor_id = ? AND event_date = ? 
         AND (service_id = ? OR service_id IS NULL OR ? = 'ALL')
         AND status IN ('CONFIRMED', 'IN_PROGRESS', 'ACCEPTED', 'PAYMENT_PENDING')
       LIMIT 1`,
      [vendorId, eventDate, serviceId, serviceId]
    );

    if (activeBookings && activeBookings.length > 0) {
      return {
        available: false,
        status: 'BOOKED',
        booking_number: activeBookings[0].booking_number,
        reason: 'Committed to existing wedding booking',
      };
    }

    // 3. Check active locks
    const activeLocks = await query<any[]>(
      `SELECT id, expires_at 
       FROM vendor_booking_locks 
       WHERE vendor_id = ? AND event_date = ? 
         AND (service_id = ? OR service_id = 'ALL' OR ? = 'ALL')
         AND status = 'LOCKED' 
         AND expires_at > NOW()
       LIMIT 1`,
      [vendorId, eventDate, serviceId, serviceId]
    );

    if (activeLocks && activeLocks.length > 0) {
      return {
        available: false,
        status: 'LOCKED',
        expires_at: activeLocks[0].expires_at,
        reason: 'Temporarily reserved during checkout',
      };
    }

    return {
      available: true,
      status: 'AVAILABLE',
    };
  } catch (error: any) {
    console.error('checkDateAvailability error:', error);
    return {
      available: false,
      status: 'BLOCKED',
      reason: 'Could not verify availability',
    };
  }
}
