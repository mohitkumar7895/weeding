import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionUser();
    if (!session || (session.role !== 'CUSTOMER' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to update saved search.' },
        { status: 401 }
      );
    }

    // Verify ownership
    const existing = await query<any[]>(
      `SELECT id, name FROM saved_searches WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, session.id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Saved search not found or unauthorized.' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, criteria } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name && typeof name === 'string' && name.trim()) {
      updates.push('name = ?');
      values.push(name.trim().slice(0, 100));
    }

    if (criteria && typeof criteria === 'object') {
      updates.push('criteria_json = ?');
      values.push(JSON.stringify(criteria));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid fields provided for update.' },
        { status: 400 }
      );
    }

    values.push(id, session.id);
    await query(
      `UPDATE saved_searches SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND user_id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: 'Saved search updated successfully!',
    });
  } catch (error: any) {
    console.error('[Saved Search PUT Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update saved search.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionUser();
    if (!session || (session.role !== 'CUSTOMER' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to delete saved search.' },
        { status: 401 }
      );
    }

    const res = await query<any>(
      `DELETE FROM saved_searches WHERE id = ? AND user_id = ?`,
      [id, session.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Saved search deleted successfully.',
    });
  } catch (error: any) {
    console.error('[Saved Search DELETE Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete saved search.' },
      { status: 500 }
    );
  }
}
