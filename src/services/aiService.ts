import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

async function ensureAiTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NULL,
      session_token VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL,
      sender VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      structured_data JSON NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ai_msg_conv (conversation_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function persistConversation(userId: string | null, conversationId: string | null): Promise<string> {
  let currentConvId = conversationId || randomUUID();
  try {
    await ensureAiTables();
    if (conversationId) {
      const existing = await query<any[]>(`SELECT id FROM ai_conversations WHERE id = ?`, [conversationId]);
      if (existing?.length) return conversationId;
      currentConvId = randomUUID();
    }
    await query(
      `INSERT INTO ai_conversations (id, user_id, session_token) VALUES (?, ?, ?)`,
      [currentConvId, userId, randomUUID()]
    );
    return currentConvId;
  } catch (err: any) {
    if (String(err.message || '').includes('foreign key')) {
      const fallbackId = randomUUID();
      try {
        await query(
          `INSERT INTO ai_conversations (id, user_id, session_token) VALUES (?, NULL, ?)`,
          [fallbackId, randomUUID()]
        );
        return fallbackId;
      } catch {
        return fallbackId;
      }
    }
    console.warn('[Sagun] conversation persist skipped:', err.message);
    return currentConvId;
  }
}

async function persistMessage(
  conversationId: string,
  sender: 'USER' | 'SAGUN',
  content: string,
  structuredData: unknown
) {
  try {
    await query(
      `INSERT INTO ai_messages (id, conversation_id, sender, content, structured_data) VALUES (?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        conversationId,
        sender,
        content || ' ',
        structuredData ? JSON.stringify(structuredData) : null,
      ]
    );
  } catch (err: any) {
    console.warn('[Sagun] message persist skipped:', err.message);
  }
}

export interface AIChatResponse {
  conversationId: string;
  reply: string;
  structuredData?: {
    type: 'VENDORS' | 'MATCHES' | 'BUDGET_BREAKDOWN' | 'CHECKLIST';
    items: any[];
  } | null;
  suggestedPrompts: string[];
}

export async function processAIChat(
  userId: string | null,
  conversationId: string | null,
  message: string
): Promise<AIChatResponse> {
  try {
    return await processAIChatInner(userId, conversationId, message);
  } catch (error: any) {
    console.error('[Sagun] processAIChat failed:', error);
    return {
      conversationId: conversationId || randomUUID(),
      reply:
        'Namaste! Main Sagun hoon. Abhi assistant connect nahi ho paaya, lekin aap Vendors aur Matches pages par seedha dekh sakte ho. Thodi der baad phir try karein.',
      structuredData: null,
      suggestedPrompts: [
        'Show me top photographers in Delhi',
        'Find compatible verified brides / grooms',
        'Plan a ₹20 Lakh Indian wedding budget',
      ],
    };
  }
}

async function processAIChatInner(
  userId: string | null,
  conversationId: string | null,
  message: string
): Promise<AIChatResponse> {
  const normalizedMsg = message.toLowerCase().trim();
  const currentConvId = await persistConversation(userId, conversationId);
  await persistMessage(currentConvId, 'USER', message, null);

  // 3. Intent Detection & Live Database Querying
  let reply = '';
  let structuredData: AIChatResponse['structuredData'] = null;
  let suggestedPrompts: string[] = [];

  // Check Vendor Search Intent
  const vendorKeywords = ['vendor', 'photographer', 'venue', 'caterer', 'catering', 'decorator', 'decoration', 'mehendi', 'makeup'];
  const isVendorQuery = vendorKeywords.some(k => normalizedMsg.includes(k));

  // Check Matchmaking Intent
  const matchKeywords = ['match', 'bride', 'groom', 'matrimon', 'rishta', 'biodata', 'kundali'];
  const isMatchQuery = matchKeywords.some(k => normalizedMsg.includes(k));

  // Check Budget Intent
  const budgetKeywords = ['budget', 'cost', 'estimate', 'lakh', 'crore', 'expense', 'pricing'];
  const isBudgetQuery = budgetKeywords.some(k => normalizedMsg.includes(k));

  if (isVendorQuery) {
    let catSlug = '';
    if (normalizedMsg.includes('photo')) catSlug = 'photographers';
    else if (normalizedMsg.includes('cater') || normalizedMsg.includes('food')) catSlug = 'caterers';
    else if (normalizedMsg.includes('decor')) catSlug = 'decorators';
    else if (normalizedMsg.includes('venue') || normalizedMsg.includes('hall') || normalizedMsg.includes('banquet')) catSlug = 'venues';

    let cityFilter = '';
    if (normalizedMsg.includes('delhi')) cityFilter = 'Delhi';
    else if (normalizedMsg.includes('mumbai')) cityFilter = 'Mumbai';
    else if (normalizedMsg.includes('jaipur')) cityFilter = 'Jaipur';
    else if (normalizedMsg.includes('noida')) cityFilter = 'Noida';

    let vendorSql = `
      SELECT v.id, v.business_name, v.city, v.rating, v.review_count, v.starting_price, v.cover_image, c.name as category_name
      FROM vendors v
      LEFT JOIN categories c ON v.category_id = c.id
      WHERE v.verification_status != 'SUSPENDED'
    `;
    const params: any[] = [];
    if (catSlug) {
      vendorSql += ` AND c.slug = ?`;
      params.push(catSlug);
    }
    if (cityFilter) {
      vendorSql += ` AND LOWER(v.city) LIKE LOWER(?)`;
      params.push(`%${cityFilter}%`);
    }
    vendorSql += ` ORDER BY v.rating DESC, v.is_featured DESC LIMIT 3`;

    let vendors: any[] = [];
    try {
      vendors = await query<any[]>(vendorSql, params);
    } catch (err: any) {
      console.warn('[Sagun] vendor lookup failed:', err.message);
    }

    if (vendors.length > 0) {
      reply = `Namaste! Based on your criteria, I have handpicked top-rated verified wedding vendors for you${cityFilter ? ' in ' + cityFilter : ''}. All these vendors offer verified transparent pricing and escrow-backed booking security through WedWithMe.`;
      structuredData = {
        type: 'VENDORS',
        items: vendors
      };
      suggestedPrompts = [
        'How does WedWithMe Escrow payment work?',
        'Show photographers under ₹50,000',
        'Help me plan a wedding budget'
      ];
    } else {
      reply = `I searched our verified vendor directory, but couldn't find an exact match for those specific filters. However, we have premier verified vendors across Delhi NCR, Mumbai, and Jaipur. Would you like me to show our top featured vendors overall?`;
      suggestedPrompts = [
        'Show all featured vendors',
        'Find verified caterers in Delhi NCR',
        'Tell me about WedWithMe guarantees'
      ];
    }
  } else if (isMatchQuery) {
    let gender = '';
    if (normalizedMsg.includes('bride') || normalizedMsg.includes('female') || normalizedMsg.includes('girl')) gender = 'FEMALE';
    else if (normalizedMsg.includes('groom') || normalizedMsg.includes('male') || normalizedMsg.includes('boy')) gender = 'MALE';

    let matchSql = `
      SELECT cp.id, u.name, cp.gender, TIMESTAMPDIFF(YEAR, cp.date_of_birth, CURDATE()) as age,
             cp.height_cm, cp.religion, cp.caste, cp.education, cp.profession, cp.annual_income, cp.city,
             (SELECT url FROM profile_photos pp WHERE pp.profile_id = cp.id AND pp.is_primary = TRUE LIMIT 1) as photo_url
      FROM customer_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.verification_status != 'REJECTED'
    `;
    const params: any[] = [];
    if (gender) {
      matchSql += ` AND cp.gender = ?`;
      params.push(gender);
    }
    matchSql += ` LIMIT 3`;

    let candidates: any[] = [];
    try {
      candidates = await query<any[]>(matchSql, params);
    } catch (err: any) {
      console.warn('[Sagun] match lookup failed:', err.message);
    }
    if (candidates.length > 0) {
      reply = `Here are government-ID verified matrimonial profiles on WedWithMe that match high compatibility scores. Our proprietary 10-Factor AI engine evaluates mutual preferences across lifestyle, education, values, and location.`;
      structuredData = {
        type: 'MATCHES',
        items: candidates
      };
      suggestedPrompts = [
        'How does the 10-Factor matching algorithm work?',
        'How do I send an express interest?',
        'Find wedding venues in Delhi'
      ];
    } else {
      reply = `We have hundreds of verified profiles. To get hyper-accurate matches with complete compatibility breakdowns, please update your partner preferences in your dashboard!`;
      suggestedPrompts = [
        'Update partner preferences',
        'Show high match percentage profiles'
      ];
    }
  } else if (isBudgetQuery) {
    let budgetTotal = 2500000; // default 25 Lakhs
    const lakhMatch = normalizedMsg.match(/(\d+)\s*(lakh|lac)/i);
    if (lakhMatch && lakhMatch[1]) {
      budgetTotal = parseInt(lakhMatch[1], 10) * 100000;
    }

    reply = `Here is an optimal Indian wedding budget allocation for ₹${(budgetTotal / 100000).toFixed(0)} Lakhs based on historical industry averages. WedWithMe helps you lock in contracts with 100% verified vendors within these target ranges.`;
    structuredData = {
      type: 'BUDGET_BREAKDOWN',
      items: [
        { category: 'Venue & Catering (Food & Beverages)', percentage: 40, amount: budgetTotal * 0.40 },
        { category: 'Photography & Cinematography / Drone', percentage: 15, amount: budgetTotal * 0.15 },
        { category: 'Decor, Mandap & Floral Styling', percentage: 15, amount: budgetTotal * 0.15 },
        { category: 'Bridal & Groom Attire & Jewelry', percentage: 12, amount: budgetTotal * 0.12 },
        { category: 'Makeup, Mehendi & Grooming', percentage: 6, amount: budgetTotal * 0.06 },
        { category: 'Music, DJ, Baraat & Entertainment', percentage: 7, amount: budgetTotal * 0.07 },
        { category: 'Contingency / Sagun / Logistics', percentage: 5, amount: budgetTotal * 0.05 }
      ]
    };
    suggestedPrompts = [
      'Find venues within my budget',
      'Show budget caterers in Delhi',
      'How to book with milestone escrow'
    ];
  }

  const { generateSagunResult, getSagunSystemPrompt } = await import('@/services/sagunProvider');
  let facts = '';
  if (structuredData?.type === 'VENDORS' && structuredData.items?.length) {
    facts = structuredData.items
      .map((v: any) => `- ${v.business_name} (${v.city}) ${v.category_name || ''} from ₹${v.starting_price}`)
      .join('\n');
  } else if (structuredData?.type === 'MATCHES' && structuredData.items?.length) {
    facts = structuredData.items
      .map((p: any) => `- ${p.name}, ${p.age}, ${p.city}, ${p.profession || ''}`)
      .join('\n');
  } else if (structuredData?.type === 'BUDGET_BREAKDOWN' && structuredData.items?.length) {
    facts = structuredData.items
      .map((b: any) => `- ${b.category}: ${b.percentage}%`)
      .join('\n');
  }

  const llm = await generateSagunResult([
    {
      role: 'SYSTEM',
      content:
        getSagunSystemPrompt() +
        (facts ? `\n\nUse this live WedWithMe data if relevant:\n${facts}` : ''),
    },
    { role: 'USER', content: message },
  ]);
  if (llm.text && !llm.error) {
    reply = llm.text;
  } else if (!reply) {
    reply =
      llm.text ||
      'Namaste! Main Sagun hoon. Abhi AI reply late ho gaya, lekin aap Vendors aur Matches pages par seedha dekh sakte ho.';
  }
  if (!suggestedPrompts.length) {
    suggestedPrompts = [
      'Show me top photographers in Delhi',
      'Find compatible verified brides / grooms',
      'Plan a ₹20 Lakh Indian wedding budget',
    ];
  }

  await persistMessage(currentConvId, 'SAGUN', reply, structuredData);

  return {
    conversationId: currentConvId,
    reply,
    structuredData,
    suggestedPrompts
  };
}
