import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { safeSelect } from '@/lib/ensureOpsTables';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (!auth.ok) return auth.response!;

    const configs = await safeSelect<any[]>(
      `SELECT config_key, config_value, description, updated_at
       FROM system_configuration
       WHERE category = 'SECURITY'`
    );

    const configMap: Record<string, any> = {};
    configs.forEach((curr) => {
      let value = curr.config_value;
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch {
          /* keep string */
        }
      }
      configMap[curr.config_key] = {
        value,
        description: curr.description,
        updated_at: curr.updated_at,
      };
    });

    return NextResponse.json({ success: true, config: configMap });
  } catch {
    return NextResponse.json({ success: true, config: {} });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN']);
    if (!auth.ok) return auth.response!;

    const body = await request.json();
    const { key, value } = body;
    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'Key and value are required' }, { status: 400 });
    }

    if (key === 'RATE_LIMIT_GLOBAL') {
      if (typeof value.windowMs !== 'number' || value.windowMs <= 0) {
        return NextResponse.json({ success: false, error: 'windowMs must be a positive number' }, { status: 400 });
      }
      if (typeof value.maxRequests !== 'number' || value.maxRequests <= 0) {
        return NextResponse.json({ success: false, error: 'maxRequests must be a positive number' }, { status: 400 });
      }
    } else if (key === 'CORS_ALLOWED_ORIGINS') {
      if (!Array.isArray(value.origins)) {
        return NextResponse.json({ success: false, error: 'origins must be an array of strings' }, { status: 400 });
      }
    }

    const rows = await safeSelect<any[]>(
      'SELECT config_value FROM system_configuration WHERE config_key = ?',
      [key]
    );
    if (!rows.length) {
      return NextResponse.json({ success: false, error: 'Configuration key not found' }, { status: 404 });
    }

    await query('UPDATE system_configuration SET config_value = ?, updated_by = ? WHERE config_key = ?', [
      JSON.stringify(value),
      auth.user?.id || null,
      key,
    ]);

    return NextResponse.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to update configuration' }, { status: 500 });
  }
}
