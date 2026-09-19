/**
 * Sagun AI Provider Abstraction
 * 
 * Safely abstracts the LLM call to prevent crashes and protect credentials.
 * If no provider is configured, returns an informative fallback message.
 */

export interface SagunMessage {
  role: 'SYSTEM' | 'USER' | 'ASSISTANT';
  content: string;
}

export async function generateSagunResponse(messages: SagunMessage[]): Promise<string> {
  const provider = process.env.SAGUN_AI_PROVIDER || 'UNCONFIGURED';

  try {
    if (provider === 'UNCONFIGURED') {
      return "Hello! I am Sagun, your WedWithMe assistant. My AI brain is currently disconnected or unconfigured in this environment. Please browse our vendor directories or matching pages directly, and I'll be back online soon!";
    }

    if (provider === 'OPENAI') {
      // const { Configuration, OpenAIApi } = require('openai');
      // const configuration = new Configuration({ apiKey: process.env.SAGUN_AI_KEY });
      // const openai = new OpenAIApi(configuration);
      // const response = await openai.createChatCompletion({ model: 'gpt-4', messages });
      // return response.data.choices[0].message.content;
      throw new Error('OpenAI integration mock block reached');
    }

    return "I'm sorry, I'm currently unable to process requests due to an unknown provider configuration.";
    
  } catch (error: any) {
    console.error('Sagun Provider Error:', error);
    return "I'm having trouble connecting right now. Please try again later!";
  }
}

/**
 * Returns the baseline system prompt protecting PII and defining boundaries.
 */
export function getSagunSystemPrompt(): string {
  return `You are Sagun, the helpful WedWithMe assistant.
Rules:
1. You assist with vendor discovery, matrimonial matching, and booking guidance.
2. NEVER expose private PII, emails, passwords, or strict payment records.
3. Only recommend vendors or profiles based on the exact data provided in your context. Do NOT fabricate or invent names, prices, or locations.
4. Always clarify that your recommendations are NOT guarantees and depend on available platform data.
5. Keep your tone polite, concise, and helpful.`;
}
