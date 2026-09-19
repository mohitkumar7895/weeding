import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { acquireBookingLock, releaseBookingLock } from '@/services/bookingLockService';

/**
 * POST /api/vendor/availability/lock
 * Acquire a booking reservation lock on a vendor/date slot.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to acquire booking lock' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { vendor_id, event_date, service_id = 'ALL', ttl_minutes = 15 } = body;

    if (!vendor_id || !event_date) {
      return NextResponse.json(
        { success: false, message: 'vendor_id and event_date are required' },
        { status: 400 }
      );
    }

    const lockResult = await acquireBookingLock({
      vendorId: vendor_id,
      eventDate: event_date,
      serviceId: service_id,
      userId: user.id,
      ttlMinutes: parseInt(String(ttl_minutes), 10) || 15,
    });

    if (!lockResult.success) {
      const statusCode = lockResult.code === 'ERROR' ? 400 : 409;
      return NextResponse.json(
        {
          success: false,
          code: lockResult.code,
          message: lockResult.message,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: lockResult.message,
        data: {
          lock_token: lockResult.lock_token,
          expires_at: lockResult.expires_at,
          vendor_id: lockResult.vendor_id,
          event_date: lockResult.event_date,
          service_id: lockResult.service_id,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('API /api/vendor/availability/lock POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/vendor/availability/lock
 * Release an active booking lock.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const { searchParams } = new URL(req.url);
    const lockToken = searchParams.get('lock_token');

    let token = lockToken;
    if (!token) {
      try {
        const body = await req.json();
        token = body.lock_token;
      } catch {}
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'lock_token is required' },
        { status: 400 }
      );
    }

    const result = await releaseBookingLock({
      lockToken: token,
      userId: user?.id,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/vendor/availability/lock DELETE error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
