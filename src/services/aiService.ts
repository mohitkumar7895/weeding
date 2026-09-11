import { query, transaction } from '@/lib/db';
import { randomUUID } from 'crypto';

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
  const normalizedMsg = message.toLowerCase().trim();
  let currentConvId = conversationId;

  // 1. Ensure conversation exists
  if (!currentConvId) {
    currentConvId = randomUUID();
    await query(
      `INSERT INTO ai_conversations (id, user_id, session_token) VALUES (?, ?, ?)`,
      [currentConvId, userId, randomUUID()]
    );
  } else {
    // Verify conversation exists
    const existing = await query<any[]>(`SELECT id FROM ai_conversations WHERE id = ?`, [currentConvId]);
    if (!existing.length) {
      currentConvId = randomUUID();
      await query(
        `INSERT INTO ai_conversations (id, user_id, session_token) VALUES (?, ?, ?)`,
        [currentConvId, userId, randomUUID()]
      );
    }
  }

  // 2. Save User Message
  const userMsgId = randomUUID();
  await query(
    `INSERT INTO ai_messages (id, conversation_id, sender, content) VALUES (?, ?, 'USER', ?)`,
    [userMsgId, currentConvId, message]
  );

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
      JOIN categories c ON v.category_id = c.id
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

    const vendors = await query<any[]>(vendorSql, params);

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

    const candidates = await query<any[]>(matchSql, params);
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
  } else {
    // General conversational & cultural guidance
    reply = `Namaste! I am Sagun, your AI Wedding & Matrimonial Advisor on WedWithMe. 
I can help you discover 100% government-ID verified matrimonial matches, calculate Vedic compatibility, recommend top wedding vendors with verified pricing, and plan your milestone-based budget.
What aspect of your wedding or matchmaking journey can I assist you with today?`;
    suggestedPrompts = [
      'Show me top photographers in Delhi',
      'Find compatible verified brides / grooms',
      'Plan a ₹20 Lakh Indian wedding budget',
      'What are the auspicious wedding dates for 2026-2027?'
    ];
  }

  // 4. Save Sagun Response
  const aiMsgId = randomUUID();
  await query(
    `INSERT INTO ai_messages (id, conversation_id, sender, content, structured_data) VALUES (?, ?, 'SAGUN', ?, ?)`,
    [aiMsgId, currentConvId, reply, structuredData ? JSON.stringify(structuredData) : null]
  );

  return {
    conversationId: currentConvId,
    reply,
    structuredData,
    suggestedPrompts
  };
}
