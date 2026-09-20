import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';
import { uuidv4 } from '@/lib/uuid';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (!auth.ok) return auth.response!;

    const categories = await query<any[]>(`SELECT * FROM categories ORDER BY display_order ASC, name ASC`);
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    console.error('API /api/admin/marketplace/categories GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const body = await req.json();
    const { name, slug, description, icon_svg, display_order, is_active } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, message: 'Name and slug are required' }, { status: 400 });
    }

    const id = uuidv4();
    await query(
      `INSERT INTO categories (id, name, slug, description, icon_svg, display_order, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, slug, description || null, icon_svg || null, display_order || 0, is_active !== false ? 1 : 0]
    );

    await logAudit(auth.user!.id, 'CREATE_CATEGORY', 'categories', id, { name, slug });

    return NextResponse.json({ success: true, data: { id, name, slug }, message: 'Category created' });
  } catch (error: any) {
    console.error('API /api/admin/marketplace/categories POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
