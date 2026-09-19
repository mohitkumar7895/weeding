import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const body = await req.json();
    const { name, slug, description, icon_svg, display_order, is_active } = body;

    const existing = await query<any[]>(`SELECT id FROM categories WHERE id = ?`, [id]);
    if (!existing.length) return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 });

    await query(
      `UPDATE categories SET 
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        description = COALESCE(?, description),
        icon_svg = COALESCE(?, icon_svg),
        display_order = COALESCE(?, display_order),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name || null, slug || null, description || null, icon_svg || null, 
        display_order !== undefined ? display_order : null, 
        is_active !== undefined ? (is_active ? 1 : 0) : null, 
        id
      ]
    );

    await logAudit(auth.user!.id, 'UPDATE_CATEGORY', 'categories', id, { name, is_active });

    return NextResponse.json({ success: true, message: 'Category updated' });
  } catch (error: any) {
    console.error('API /api/admin/marketplace/categories/[id] PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
