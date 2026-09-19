import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (!auth.ok) return auth.response!;

    const settings = await query<any[]>(`SELECT \`key\`, value, category FROM system_settings WHERE category = 'MARKETPLACE'`);
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('API /api/admin/marketplace/configuration GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const body = await req.json();
    const { settings } = body; // Array of { key, value }

    if (!Array.isArray(settings)) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    await transaction(async (conn) => {
      for (const setting of settings) {
        const { key, value } = setting;
        
        // Validate ranking values to be 0-100
        if (key.startsWith('RANKING_WEIGHT_')) {
          const numValue = parseInt(value, 10);
          if (isNaN(numValue) || numValue < 0 || numValue > 100) {
            throw new Error(\`Invalid weight for \${key}. Must be 0-100.\`);
          }
        }

        const existing = await conn.execute(`SELECT id FROM system_settings WHERE \`key\` = ?`, [key]);
        const rows = existing[0] as any[];

        if (rows.length > 0) {
          await conn.execute(`UPDATE system_settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE \`key\` = ?`, [String(value), auth.user!.id, key]);
        } else {
          await conn.execute(`INSERT INTO system_settings (id, \`key\`, value, category, updated_by) VALUES (?, ?, ?, ?, ?)`, [uuidv4(), key, String(value), 'MARKETPLACE', auth.user!.id]);
        }
      }
    });

    await logAudit(auth.user!.id, 'UPDATE_MARKETPLACE_CONFIG', 'system_settings', 'ALL', { updated_keys: settings.map(s => s.key) });

    return NextResponse.json({ success: true, message: 'Marketplace configuration updated successfully' });
  } catch (error: any) {
    console.error('API /api/admin/marketplace/configuration PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
