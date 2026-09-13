import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query<any[]>(
      `SELECT id, slug, name, description, is_active, display_order 
       FROM categories 
       WHERE is_active = TRUE 
       ORDER BY display_order ASC, name ASC`
    );

    if (rows && rows.length > 0) {
      return NextResponse.json({ success: true, data: rows });
    }

    // Fallback default categories if database is newly initialized
    const fallbackCategories = [
      { id: 'cat_photographers', slug: 'photographers', name: 'Photographers', description: 'Capture Your Special Moments', display_order: 1 },
      { id: 'cat_caterers', slug: 'caterers', name: 'Caterers', description: 'Delicious Food for Every Moment', display_order: 2 },
      { id: 'cat_decorators', slug: 'decorators', name: 'Decorators', description: 'Turn Dreams into Reality', display_order: 3 },
      { id: 'cat_venues', slug: 'venues', name: 'Venues', description: 'Stunning Spaces for Your Big Day', display_order: 4 },
      { id: 'cat_makeup', slug: 'makeup', name: 'Bridal Makeup', description: 'Flawless Beauty for Your Big Day', display_order: 5 },
      { id: 'cat_mehendi', slug: 'mehendi', name: 'Mehendi Artists', description: 'Intricate & Traditional Henna Designs', display_order: 6 },
      { id: 'cat_dj', slug: 'dj-music', name: 'DJ & Music', description: 'Energetic Sound & Entertainment', display_order: 7 },
    ];

    return NextResponse.json({ success: true, data: fallbackCategories });
  } catch (error: any) {
    console.error('API /api/categories GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
