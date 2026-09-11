import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });

    const services = await query<any[]>(
      `SELECT * FROM vendor_services WHERE vendor_id = ? ORDER BY created_at DESC`,
      [vendors[0].id]
    );

    return NextResponse.json({ success: true, data: services });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    const vendorId = vendors[0].id;

    const body = await req.json();
    const { title, description, starting_price } = body;

    if (!title || !starting_price) {
      return NextResponse.json({ success: false, message: 'Title and starting price are required' }, { status: 400 });
    }

    const id = randomUUID();
    await query(
      `INSERT INTO vendor_services (id, vendor_id, title, description, starting_price, is_active, moderation_status)
       VALUES (?, ?, ?, ?, ?, TRUE, 'PENDING_REVIEW')`,
      [id, vendorId, title, description || '', parseFloat(starting_price)]
    );

    await logAudit(user.id, 'CREATE_SERVICE', 'vendor_services', id, { title, starting_price });

    return NextResponse.json({
      success: true,
      message: 'Service submitted for approval',
      data: { id, moderation_status: 'PENDING_REVIEW' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    const vendorId = vendors[0].id;

    const body = await req.json();
    const { id, title, description, starting_price, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Service ID is required' }, { status: 400 });
    }

    const existing = await query<any[]>(`SELECT * FROM vendor_services WHERE id = ? AND vendor_id = ?`, [id, vendorId]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Service not found or unauthorized' }, { status: 404 });
    }

    await query(
      `UPDATE vendor_services SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        starting_price = COALESCE(?, starting_price),
        is_active = COALESCE(?, is_active),
        moderation_status = 'PENDING_REVIEW'
      WHERE id = ?`,
      [
        title || null,
        description !== undefined ? description : null,
        starting_price !== undefined ? parseFloat(starting_price) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    await logAudit(user.id, 'UPDATE_SERVICE', 'vendor_services', id, { title, starting_price });

    return NextResponse.json({
      success: true,
      message: 'Service updated successfully and submitted for review',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Service ID required' }, { status: 400 });
    }

    await query(`DELETE FROM vendor_services WHERE id = ? AND vendor_id = ?`, [id, vendors[0].id]);
    await logAudit(user.id, 'DELETE_SERVICE', 'vendor_services', id);

    return NextResponse.json({ success: true, message: 'Service deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

