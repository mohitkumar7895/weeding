import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { auditLog } from '@/lib/security';
import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function getDbConnection() {
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });
}

function generateReceiptNumber() {
  const prefix = 'RCPT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${rand}`;
}

export async function GET() {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (!authResult.ok) return authResult.response!;
    const db = await getDbConnection();
    const [rows] = await db.execute(`SELECT * FROM receipts ORDER BY created_at DESC LIMIT 200`);
    await db.end();
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!authResult.ok) return authResult.response!;

    const actorId = 'system_admin'; 
    const body = await request.json();
    const { payment_id, invoice_id } = body;

    if (!payment_id) {
      return NextResponse.json({ success: false, error: 'payment_id is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Verify payment exists and is SUCCESS
    const [payments]: any = await db.execute('SELECT * FROM payment_transactions WHERE id = ? AND status = "SUCCESS"', [payment_id]);
    
    if (!payments.length) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Successful payment not found' }, { status: 404 });
    }

    const payment = payments[0];

    // Check if receipt already exists for this payment (Unique constraint will also catch this, but good to check early)
    const [existing]: any = await db.execute('SELECT id FROM receipts WHERE payment_id = ?', [payment_id]);
    if (existing.length) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Receipt already generated for this payment' }, { status: 409 });
    }

    const receiptId = crypto.randomUUID();
    const receiptRef = generateReceiptNumber();

    await db.execute(`
      INSERT INTO receipts (
        id, receipt_reference, payment_id, booking_id, invoice_id, amount, payment_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ISSUED')
    `, [
      receiptId, receiptRef, payment_id, payment.booking_id, invoice_id || null, payment.amount, payment.created_at
    ]);

    await auditLog(db, {
      actorId,
      actorRole: 'ADMIN',
      action: 'GENERATE_RECEIPT',
      entityId: receiptId,
      entityType: 'receipts',
      details: { payment_id, receiptRef, amount: payment.amount },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.end();

    return NextResponse.json({ success: true, receipt: { id: receiptId, receipt_reference: receiptRef } });
  } catch (error: any) {
    console.error('Error generating receipt:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: 'Receipt already exists for this payment' }, { status: 409 });
    }
    return NextResponse.json(
      { success: false, error: 'Failed to generate receipt' },
      { status: 500 }
    );
  }
}
