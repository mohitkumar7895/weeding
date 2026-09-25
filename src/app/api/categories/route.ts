import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { VENDOR_CATEGORIES } from '@/lib/vendorCategories';

async function ensureVendorCategories() {
  for (const c of VENDOR_CATEGORIES) {
    try {
      await query(
        `INSERT INTO categories (id, slug, name, description, is_active, display_order)
         VALUES (?, ?, ?, ?, TRUE, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           description = VALUES(description),
           slug = VALUES(slug),
           display_order = VALUES(display_order),
           is_active = TRUE`,
        [c.id, c.slug, c.name, c.description, c.display_order]
      );
    } catch {
      try {
        await query(
          `UPDATE categories SET name = ?, description = ?, slug = ?, display_order = ?, is_active = TRUE WHERE id = ?`,
          [c.name, c.description, c.slug, c.display_order, c.id]
        );
      } catch {
        /* ignore */
      }
    }
  }
}

export async function GET() {
  try {
    await ensureVendorCategories();
    const rows = await query<any[]>(
      `SELECT id, slug, name, description, is_active, display_order
       FROM categories
       WHERE is_active = TRUE
       ORDER BY display_order ASC, name ASC`
    );

    const data = (rows || []).map((row) => {
      const extra = VENDOR_CATEGORIES.find((c) => c.id === row.id || c.slug === row.slug);
      return {
        ...row,
        image: extra?.image || null,
      };
    });

    if (data.length > 0) {
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({
      success: true,
      data: VENDOR_CATEGORIES.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        display_order: c.display_order,
        image: c.image,
        is_active: true,
      })),
    });
  } catch (error: any) {
    console.error('API /api/categories GET Error:', error);
    return NextResponse.json({
      success: true,
      data: VENDOR_CATEGORIES.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        display_order: c.display_order,
        image: c.image,
        is_active: true,
      })),
    });
  }
}
