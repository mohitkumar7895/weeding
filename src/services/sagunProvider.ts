/**
 * Sagun AI Provider — OpenAI or Google Gemini via env keys.
 */

export interface SagunMessage {
  role: 'SYSTEM' | 'USER' | 'ASSISTANT';
  content: string;
}

function resolveProvider(): { name: string; apiKey: string } {
  const explicit = (process.env.SAGUN_AI_PROVIDER || '').toLowerCase();
  const sagunKey = process.env.SAGUN_AI_KEY || '';
  const geminiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';

  if (explicit === 'openai' || sagunKey.startsWith('sk-')) {
    return { name: 'openai', apiKey: sagunKey };
  }
  if (explicit === 'google' || explicit === 'gemini' || geminiKey) {
    return { name: 'gemini', apiKey: geminiKey || sagunKey };
  }
  if (sagunKey) return { name: 'openai', apiKey: sagunKey };
  return { name: 'UNCONFIGURED', apiKey: '' };
}

export async function generateSagunResponse(messages: SagunMessage[]): Promise<string> {
  const { name, apiKey } = resolveProvider();

  try {
    if (name === 'UNCONFIGURED' || !apiKey) {
      return "Hello! I am Sagun, your WedWithMe assistant. Set SAGUN_AI_KEY (OpenAI) or AI_API_KEY (Gemini) to enable live replies. I can still guide you from the Matches, Vendors, and Bookings pages.";
    }

    const chatMessages = messages.map((m) => ({
      role: m.role === 'SYSTEM' ? 'system' : m.role === 'ASSISTANT' ? 'assistant' : 'user',
      content: m.content,
    }));

    if (name === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.SAGUN_AI_MODEL || 'gpt-4o-mini',
          messages: chatMessages,
          temperature: 0.4,
        }),
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!response.ok || !text) {
        throw new Error(data.error?.message || 'OpenAI request failed');
      }
      return text;
    }

    const geminiModel = process.env.AI_MODEL || 'gemini-1.5-flash';
    const system = messages.filter((m) => m.role === 'SYSTEM').map((m) => m.content).join('\n');
    const contents = messages
      .filter((m) => m.role !== 'SYSTEM')
      .map((m) => ({
        role: m.role === 'ASSISTANT' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents,
        }),
      }
    );
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!response.ok || !text) {
      throw new Error(data.error?.message || 'Gemini request failed');
    }
    return text;
  } catch (error: any) {
    console.error('Sagun Provider Error:', error);
    return "I'm having trouble connecting to the AI provider right now. Please try again later.";
  }
}

export function getSagunSystemPrompt(): string {
  return `You are Sagun, the helpful WedWithMe assistant.
Rules:
1. You assist with vendor discovery, matrimonial matching, and booking guidance.
2. NEVER expose private PII, emails, passwords, or strict payment records.
3. Only recommend vendors or profiles based on the exact data provided in your context. Do NOT fabricate or invent names, prices, or locations.
4. Always clarify that your recommendations are NOT guarantees and depend on available platform data.
5. Keep your tone polite, concise, and helpful.`;
}
