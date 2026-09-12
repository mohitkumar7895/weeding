import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== 'CUSTOMER' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to view saved searches.' },
        { status: 401 }
      );
    }

    const rows = await query<any[]>(
      `SELECT id, user_id, name, criteria_json, created_at, updated_at
       FROM saved_searches
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [session.id]
    );

    const savedSearches = rows.map((r) => {
      let criteria = {};
      try {
        criteria = typeof r.criteria_json === 'string' ? JSON.parse(r.criteria_json) : r.criteria_json || {};
      } catch {
        criteria = {};
      }
      return {
        id: r.id,
        user_id: r.user_id,
        name: r.name,
        criteria,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: savedSearches,
      count: savedSearches.length,
    });
  } catch (error: any) {
    console.error('[Saved Searches GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch saved searches.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== 'CUSTOMER' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to save search configuration.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, criteria } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid name for your saved search.' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim().slice(0, 100);
    const criteriaObj = criteria && typeof criteria === 'object' ? criteria : {};
    const criteriaJson = JSON.stringify(criteriaObj);
    const searchId = `search_${randomUUID()}`;

    await query(
      `INSERT INTO saved_searches (id, user_id, name, criteria_json)
       VALUES (?, ?, ?, ?)`,
      [searchId, session.id, trimmedName, criteriaJson]
    );

    return NextResponse.json({
      success: true,
      message: `Search "${trimmedName}" saved successfully!`,
      data: {
        id: searchId,
        user_id: session.id,
        name: trimmedName,
        criteria: criteriaObj,
      },
    });
  } catch (error: any) {
    console.error('[Saved Searches POST Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create saved search.' },
      { status: 500 }
    );
  }
}
