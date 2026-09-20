import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { id } = await params;

    const [paymentRows]: any = await query(`
      SELECT 
        pt.*,
        b.status as booking_status, b.event_date, b.total_amount,
        c.id as customer_id, cu.name as customer_name, cu.email as customer_email,
        v.id as vendor_id, v.business_name as vendor_name
      FROM payment_transactions pt
      JOIN bookings b ON pt.booking_id = b.id
      JOIN customer_profiles c ON b.customer_id = c.id
      JOIN users cu ON c.user_id = cu.id
      JOIN vendors v ON b.vendor_id = v.id
      WHERE pt.id = ?
    `, [id]);

    if (!paymentRows) {
      return NextResponse.json({ success: false, message: 'Payment not found' }, { status: 404 });
    }

    const payment = paymentRows;
    
    // Mask sensitive payment details for non-finance roles
    let safePaymentDetails = null;
    if (payment.payment_details) {
      if (typeof payment.payment_details === 'string') {
         try { safePaymentDetails = JSON.parse(payment.payment_details); } catch(e) {}
      } else {
         safePaymentDetails = payment.payment_details;
      }
    }

    if (auth.user!.role === 'SUPPORT' || auth.user!.role === 'ADMIN') {
       if (safePaymentDetails) {
         // redact potentially sensitive provider data
         if (safePaymentDetails.signature) safePaymentDetails.signature = 'REDACTED';
         if (safePaymentDetails.raw_response) safePaymentDetails.raw_response = 'REDACTED';
       }
    }

    payment.payment_details = safePaymentDetails;

    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    console.error('API /api/admin/finance/payments/[id] GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
