import { query } from '@/lib/db';

const SITE_KEYWORDS = [
  'wedwithme', 'wedding', 'shaadi', 'shadi', 'vivah', 'vendor', 'venue', 'photographer',
  'cater', 'decor', 'makeup', 'mehendi', 'mehndi', 'dj', 'pandit', 'mandap', 'bridal',
  'groom', 'bride', 'match', 'rishta', 'kundali', 'horoscope', 'booking', 'escrow',
  'package', 'silver', 'gold', 'premium', 'reel', 'dashboard', 'login', 'otp', 'invoice',
  'payout', 'guest', 'invitation', 'budget', 'lakh', 'price', 'rate', 'book', 'pay',
  'razorpay', 'vendor', 'customer', 'finance', 'support', 'profile', 'shortlist',
  'interest', 'chat', 'sagun', 'matrimon', 'banquet', 'hall', 'photographer',
];

const OFFTOPIC_KEYWORDS = [
  'cricket', 'football', 'ipl', 'bitcoin', 'crypto', 'stock trading', 'homework',
  'python code', 'javascript code', 'write a poem', 'joke', 'politics', 'election',
  'movie download', 'hack', 'password of', 'recipe pasta', 'weather in london',
  'who is the pm', 'capital of', 'solve this math',
];

export function isWedWithMeTopic(message: string): boolean {
  const t = message.toLowerCase();
  const on = SITE_KEYWORDS.some((k) => t.includes(k));
  const off = OFFTOPIC_KEYWORDS.some((k) => t.includes(k));
  if (on) return true;
  if (off) return false;
  return true;
}

export function offTopicReply(message: string): string {
  const hindi = /[\u0900-\u097F]/.test(message);
  if (hindi) {
    return 'Main Sagun hoon, sirf WedWithMe website ke liye. Vendors, matches, bookings, reels, packages aur escrow ke baare mein poochho. Bahar ki baatein (news, coding, sports) yahan nahi batati.';
  }
  return 'I am Sagun, only for WedWithMe. Ask about vendors, matches, bookings, reels, packages or escrow on this site. I cannot answer unrelated topics.';
}

async function safeQuery<T = any[]>(sql: string, params: any[] = []): Promise<T> {
  try {
    const rows = await query<T>(sql, params);
    return (Array.isArray(rows) ? rows : []) as T;
  } catch {
    return [] as T;
  }
}

export async function loadWedWithMeKnowledge(userId?: string | null): Promise<string> {
  const [vendors, cats, packages, reels] = await Promise.all([
    safeQuery<any[]>(
      `SELECT v.business_name, v.city, v.starting_price, c.name AS category
       FROM vendors v
       LEFT JOIN categories c ON c.id = v.category_id
       WHERE IFNULL(v.verification_status,'') != 'SUSPENDED'
       ORDER BY v.rating DESC
       LIMIT 15`
    ),
    safeQuery<any[]>(`SELECT name FROM categories LIMIT 20`),
    safeQuery<any[]>(
      `SELECT name AS title, price FROM vendor_packages WHERE IFNULL(is_published,1) = 1 LIMIT 12`
    ),
    safeQuery<any[]>(
      `SELECT title FROM vendor_reels
       WHERE (status = 'APPROVED' OR is_approved = TRUE OR status IS NULL)
         AND video_url NOT LIKE 'data:%'
       ORDER BY created_at DESC LIMIT 8`
    ),
  ]);

  const lines: string[] = [
    'SITE: WedWithMe — matrimonial matching + wedding vendors. Pages: /vendors /matches /reels /bookings /login.',
    'PAY: booking pay uses Razorpay; advance/escrow is 25% of booking total. Packages: SILVER / GOLD / PREMIUM.',
    'ROLES on this site: CUSTOMER, VENDOR, ADMIN, FINANCE, SUPPORT. Login is email OTP, not phone OTP.',
    'Do not invent vendors, prices, or profiles. If a name is not in LIVE DATA, say it is not on WedWithMe.',
  ];

  if (cats.length) {
    lines.push('CATEGORIES: ' + cats.map((c) => c.name).filter(Boolean).join(', '));
  }
  if (vendors.length) {
    lines.push(
      'LIVE VENDORS:\n' +
        vendors
          .map(
            (v) =>
              `- ${v.business_name} | ${v.category || 'Vendor'} | ${v.city || 'India'} | from ₹${Number(v.starting_price || 0)}`
          )
          .join('\n')
    );
  } else {
    lines.push('LIVE VENDORS: none listed right now. Tell user to open /vendors.');
  }
  if (packages.length) {
    lines.push(
      'LIVE PACKAGES:\n' +
        packages.map((p) => `- ${p.title} ₹${Number(p.price || 0)}`).join('\n')
    );
  }
  if (reels.length) {
    lines.push('LIVE REELS titles: ' + reels.map((r) => r.title).filter(Boolean).join('; '));
  }

  if (userId) {
    const bookings = await safeQuery<any[]>(
      `SELECT b.status, b.total_amount, v.business_name
       FROM bookings b
       LEFT JOIN vendors v ON v.id = b.vendor_id
       WHERE b.customer_id IN (SELECT id FROM customer_profiles WHERE user_id = ?)
          OR b.customer_id = ?
       ORDER BY b.created_at DESC LIMIT 5`,
      [userId, userId]
    );
    if (bookings.length) {
      lines.push(
        'THIS USER BOOKINGS:\n' +
          bookings
            .map((b) => `- ${b.business_name || 'Vendor'} status ${b.status} amount ₹${Number(b.total_amount || 0)}`)
            .join('\n')
      );
    }
  }

  return lines.join('\n');
}

export function getSagunSystemPrompt(liveData?: string): string {
  return `You are Sagun, WedWithMe's on-site assistant. You ONLY help with this website's saved data.
Allowed: vendors, packages, prices on this site, matches/matrimony on this site, bookings, escrow 25%, reels, login/OTP, dashboard tabs.
Forbidden: general knowledge, news, sports, coding, politics, other apps, invented vendors.
If the question is not about WedWithMe data below, reply that you only answer WedWithMe questions and suggest /vendors, /matches, /reels or /bookings.
Never expose emails, phones, passwords, OTP, or payment secrets.
Reply in the user's language (Hindi or English). Keep it short. Use only LIVE DATA names and prices.

${liveData ? `LIVE DATA FROM DATABASE:\n${liveData}` : 'LIVE DATA unavailable; tell user to browse /vendors and /matches.'}`;
}
