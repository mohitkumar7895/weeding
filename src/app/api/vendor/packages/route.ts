import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
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

    const packages = await query<any[]>(
      `SELECT * FROM vendor_packages WHERE vendor_id = ? ORDER BY price ASC`,
      [vendors[0].id]
    );

    // Fetch items for each package
    for (const pkg of packages) {
      pkg.items = await query<any[]>(
        `SELECT * FROM vendor_package_items WHERE package_id = ? ORDER BY created_at ASC`,
        [pkg.id]
      );
    }

    return NextResponse.json({ success: true, data: packages });
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
    const { name, description, guest_capacity = 200, price, included_items = [], add_ons = [] } = body;

    if (!name || !price) {
      return NextResponse.json({ success: false, message: 'Name and price are required' }, { status: 400 });
    }

    const pkgId = randomUUID();

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO vendor_packages (
          id, vendor_id, name, description, guest_capacity, price, included_items_json, moderation_status, is_published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', TRUE)`,
        [
          pkgId,
          vendorId,
          name,
          description || '',
          parseInt(guest_capacity, 10),
          parseFloat(price),
          JSON.stringify(included_items),
        ]
      );

      // Insert optional add-on items
      for (const item of add_ons) {
        await conn.execute(
          `INSERT INTO vendor_package_items (id, package_id, title, description, is_optional, add_on_price)
           VALUES (?, ?, ?, ?, TRUE, ?)`,
          [randomUUID(), pkgId, item.title, item.description || '', parseFloat(item.add_on_price || 0)]
        );
      }
    });

    await logAudit(user.id, 'CREATE_PACKAGE', 'vendor_packages', pkgId, { name, price });

    return NextResponse.json({
      success: true,
      message: 'Package created and submitted for admin review.',
      data: { id: pkgId, moderation_status: 'PENDING_REVIEW' }
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
    const { id, name, description, guest_capacity, price, included_items, is_published } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Package ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await query<any[]>(`SELECT * FROM vendor_packages WHERE id = ? AND vendor_id = ?`, [id, vendorId]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Package not found or unauthorized' }, { status: 404 });
    }

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE vendor_packages SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          guest_capacity = COALESCE(?, guest_capacity),
          price = COALESCE(?, price),
          included_items_json = COALESCE(?, included_items_json),
          is_published = COALESCE(?, is_published),
          moderation_status = 'PENDING_REVIEW'
        WHERE id = ?`,
        [
          name || null,
          description !== undefined ? description : null,
          guest_capacity !== undefined ? parseInt(guest_capacity, 10) : null,
          price !== undefined ? parseFloat(price) : null,
          included_items !== undefined ? JSON.stringify(included_items) : null,
          is_published !== undefined ? (is_published ? 1 : 0) : null,
          id,
        ]
      );
    });

    await logAudit(user.id, 'UPDATE_PACKAGE', 'vendor_packages', id, { name, price });

    return NextResponse.json({
      success: true,
      message: 'Package updated and submitted for review',
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
      return NextResponse.json({ success: false, message: 'Package ID required' }, { status: 400 });
    }

    await query(`DELETE FROM vendor_packages WHERE id = ? AND vendor_id = ?`, [id, vendors[0].id]);
    await logAudit(user.id, 'DELETE_PACKAGE', 'vendor_packages', id);

    return NextResponse.json({ success: true, message: 'Package removed successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

