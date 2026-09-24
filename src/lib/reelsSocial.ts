import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

let appliedGen = 0;
const SCHEMA_GEN = 4;
let reelsEnsuring: Promise<void> | null = null;

export async function ensureReelsSocialTables() {
  if (appliedGen === SCHEMA_GEN) return;
  if (reelsEnsuring) return reelsEnsuring;
  reelsEnsuring = runReelsEnsure().finally(() => {
    reelsEnsuring = null;
  });
  return reelsEnsuring;
}

async function runReelsEnsure() {
  await query(`
    CREATE TABLE IF NOT EXISTS vendor_reels (
      id VARCHAR(36) PRIMARY KEY,
      vendor_id VARCHAR(36) NULL,
      author_user_id VARCHAR(36) NULL,
      author_role VARCHAR(32) NULL,
      video_url MEDIUMTEXT NOT NULL,
      thumbnail_url TEXT NULL,
      title VARCHAR(191) NOT NULL,
      description TEXT,
      views_count INT DEFAULT 0,
      likes_count INT DEFAULT 0,
      comments_count INT DEFAULT 0,
      shares_count INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'APPROVED',
      is_approved BOOLEAN DEFAULT TRUE,
      display_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  try {
    const fks = asRows(
      await query<any[]>(
        `SELECT CONSTRAINT_NAME AS name
         FROM information_schema.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'vendor_reels'
           AND CONSTRAINT_TYPE = 'FOREIGN KEY'`
      )
    );
    for (const fk of fks) {
      if (!fk?.name) continue;
      try {
        await query(`ALTER TABLE vendor_reels DROP FOREIGN KEY \`${String(fk.name).replace(/`/g, '')}\``);
      } catch {
        /* already dropped */
      }
    }
  } catch {
    /* information_schema may be restricted */
  }

  const alters = [
    `ALTER TABLE vendor_reels MODIFY COLUMN vendor_id VARCHAR(36) NULL`,
    `ALTER TABLE vendor_reels MODIFY COLUMN video_url MEDIUMTEXT NOT NULL`,
    `ALTER TABLE vendor_reels MODIFY COLUMN thumbnail_url TEXT NULL`,
    `ALTER TABLE vendor_reels ADD COLUMN author_user_id VARCHAR(36) NULL`,
    `ALTER TABLE vendor_reels ADD COLUMN author_role VARCHAR(32) NULL`,
    `ALTER TABLE vendor_reels ADD COLUMN comments_count INT DEFAULT 0`,
    `ALTER TABLE vendor_reels ADD COLUMN shares_count INT DEFAULT 0`,
    `ALTER TABLE vendor_reels ADD COLUMN saves_count INT DEFAULT 0`,
  ];
  for (const sql of alters) {
    try {
      await query(sql);
    } catch {
      /* already applied */
    }
  }

  await query(`
    CREATE TABLE IF NOT EXISTS reel_likes (
      reel_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (reel_id, user_id),
      INDEX idx_reel_likes_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS reel_comments (
      id VARCHAR(36) PRIMARY KEY,
      reel_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      body VARCHAR(500) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_reel_comments_reel (reel_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS reel_shares (
      id VARCHAR(36) PRIMARY KEY,
      reel_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_reel_shares_reel (reel_id)
    )     ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS reel_saves (
      reel_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (reel_id, user_id),
      INDEX idx_reel_saves_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS reel_files (
      reel_id VARCHAR(64) PRIMARY KEY,
      mime_type VARCHAR(80) NOT NULL,
      file_name VARCHAR(191) NOT NULL,
      data LONGBLOB NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  try {
    await query(`ALTER TABLE reel_likes MODIFY COLUMN reel_id VARCHAR(64) NOT NULL`);
    await query(`ALTER TABLE reel_likes MODIFY COLUMN user_id VARCHAR(64) NOT NULL`);
  } catch {
    /* already compatible */
  }
  appliedGen = SCHEMA_GEN;
}

export async function saveReelBinary(reelId: string, buffer: Buffer, mimeType: string, fileName: string) {
  await query(
    `INSERT INTO reel_files (reel_id, mime_type, file_name, data)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type), file_name = VALUES(file_name), data = VALUES(data)`,
    [reelId, mimeType || 'video/mp4', String(fileName || 'reel.mp4').slice(0, 180), buffer]
  );
  return `/api/reels/${encodeURIComponent(reelId)}/file`;
}

export async function insertVendorReel(row: {
  id: string;
  vendorId: string | null;
  userId: string;
  role: string;
  videoUrl: string;
  title: string;
  description: string;
}) {
  try {
    await query(
      `INSERT INTO vendor_reels (
         id, vendor_id, author_user_id, author_role, video_url, thumbnail_url, title, description,
         status, is_approved, likes_count, comments_count, shares_count, views_count
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', TRUE, 0, 0, 0, 0)`,
      [
        row.id,
        row.vendorId,
        row.userId,
        row.role,
        row.videoUrl,
        '',
        row.title.slice(0, 180),
        row.description,
      ]
    );
    return;
  } catch (err: any) {
    console.warn('[reels] modern insert failed:', err?.message);
  }
  await query(
    `INSERT INTO vendor_reels (id, vendor_id, video_url, thumbnail_url, title, description, is_approved)
     VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
    [row.id, row.vendorId || row.userId, row.videoUrl, '', row.title.slice(0, 180), row.description]
  );
}

function asRows(result: any): any[] {
  if (Array.isArray(result)) return result;
  return [];
}

export async function vendorIdForUser(userId: string): Promise<string | null> {
  const rows = asRows(await query<any[]>(`SELECT id FROM vendors WHERE user_id = ? LIMIT 1`, [userId]));
  return rows[0]?.id || null;
}

export async function reelActorId(req: NextRequest): Promise<{ actorId: string; setGuest?: string }> {
  const user = await getSessionUser(req);
  if (user?.id) return { actorId: String(user.id) };
  const headerId = (req.headers.get('x-wwm-guest-id') || '').trim();
  const cookieId = (req.cookies.get('wwm_guest_id')?.value || '').trim();
  const existing = headerId || cookieId;
  if (existing.length >= 8) return { actorId: existing.slice(0, 64) };
  const id = randomUUID();
  return { actorId: id, setGuest: id };
}

export function applyGuestCookie(res: NextResponse, setGuest?: string) {
  if (!setGuest) return res;
  res.cookies.set('wwm_guest_id', setGuest, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
