/**
 * Sagun AI Provider — free Gemini first, then Groq, then paid OpenAI.
 */

export interface SagunMessage {
  role: 'SYSTEM' | 'USER' | 'ASSISTANT';
  content: string;
}

export interface SagunLlmResult {
  text: string;
  error?: string;
}

type ProviderName = 'gemini' | 'groq' | 'openai';

function cleanKey(value?: string): string {
  return (value || '').trim().replace(/^["']+|["']+$/g, '');
}

function readEnv(name: string): string {
  const fromProcess = cleanKey(process.env[name]);
  if (fromProcess) return fromProcess;
  if (process.env.NODE_ENV === 'production') return '';
  try {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    for (const file of ['.env.local', '.env']) {
      const filePath = path.join(/* turbopackIgnore: true */ process.cwd(), file);
      if (!fs.existsSync(filePath)) continue;
      const text = fs.readFileSync(filePath, 'utf8');
      const match = text.match(new RegExp(`^${name}\\s*=\\s*(.*)$`, 'm'));
      if (match?.[1]) return cleanKey(match[1]);
    }
  } catch {
    /* ignore */
  }
  return '';
}

function isGeminiKey(value: string): boolean {
  return value.startsWith('AIza') || value.startsWith('AQ.');
}

function listProviders(): { name: ProviderName; apiKey: string }[] {
  const geminiKey = readEnv('AI_API_KEY') || readEnv('GEMINI_API_KEY');
  const groqKey = readEnv('GROQ_API_KEY');
  const sagunKey = readEnv('SAGUN_AI_KEY');
  const providers: { name: ProviderName; apiKey: string }[] = [];

  if (geminiKey) providers.push({ name: 'gemini', apiKey: geminiKey });
  if (isGeminiKey(sagunKey) && sagunKey !== geminiKey) {
    providers.push({ name: 'gemini', apiKey: sagunKey });
  }
  if (groqKey) providers.push({ name: 'groq', apiKey: groqKey });
  // Paid OpenAI only if no free Gemini/Groq key is set
  if (!providers.length && sagunKey.startsWith('sk-')) {
    providers.push({ name: 'openai', apiKey: sagunKey });
  }

  return providers;
}

function shouldRetryModel(status: number, message: string): boolean {
  const m = message.toLowerCase();
  if (status === 404) return true;
  return m.includes('model') && (m.includes('not found') || m.includes('does not exist') || m.includes('does not have access'));
}

function isQuotaError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('no credits') ||
    m.includes('insufficient_quota') ||
    m.includes('quota') ||
    m.includes('billing') ||
    m.includes('exceeded')
  );
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`AI request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw new Error(error?.message || 'Network error calling AI provider');
  } finally {
    clearTimeout(timer);
  }
}

async function completeOpenAICompatible(
  url: string,
  apiKey: string,
  models: string[],
  messages: { role: string; content: string }[]
): Promise<string> {
  let lastError = 'AI request failed';
  for (const model of models) {
    const { response, data } = await fetchJson(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.5,
          max_tokens: 400,
        }),
      },
      20000
    );

    const text = data.choices?.[0]?.message?.content;
    if (response.ok && text) return String(text).trim();

    lastError = data.error?.message || `AI ${response.status} for model ${model}`;
    if (response.status === 401 || response.status === 403 || response.status === 429 || isQuotaError(lastError)) {
      throw new Error(lastError);
    }
    if (!shouldRetryModel(response.status, lastError)) {
      throw new Error(lastError);
    }
  }
  throw new Error(lastError);
}

async function completeGemini(apiKey: string, messages: SagunMessage[]): Promise<string> {
  const models = [
    ...new Set(
      [
        cleanKey(process.env.AI_MODEL),
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.5-flash-lite',
        'gemini-flash-latest',
        'gemini-1.5-flash',
      ].filter(Boolean)
    ),
  ];
  const system = messages.filter((m) => m.role === 'SYSTEM').map((m) => m.content).join('\n');
  const contents = messages
    .filter((m) => m.role !== 'SYSTEM')
    .map((m) => ({
      role: m.role === 'ASSISTANT' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  let lastError = 'Gemini request failed';
  for (const geminiModel of models) {
    const { response, data } = await fetchJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents,
        }),
      },
      20000
    );
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (response.ok && text) return String(text).trim();
    lastError = data.error?.message || `Gemini ${response.status} for ${geminiModel}`;
    if (String(lastError).toLowerCase().includes('api key not valid')) {
      throw new Error(lastError);
    }
    if (!shouldRetryModel(response.status, lastError) && response.status !== 404 && response.status !== 400) {
      throw new Error(lastError);
    }
  }
  throw new Error(lastError);
}

async function completeProvider(
  name: ProviderName,
  apiKey: string,
  messages: SagunMessage[],
  chatMessages: { role: string; content: string }[]
): Promise<string> {
  if (name === 'gemini') return completeGemini(apiKey, messages);
  if (name === 'groq') {
    return completeOpenAICompatible(
      'https://api.groq.com/openai/v1/chat/completions',
      apiKey,
      [...new Set([cleanKey(process.env.GROQ_MODEL), 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile'].filter(Boolean))],
      chatMessages
    );
  }
  return completeOpenAICompatible(
    'https://api.openai.com/v1/chat/completions',
    apiKey,
    [...new Set([cleanKey(process.env.SAGUN_AI_MODEL), 'gpt-4o-mini', 'gpt-3.5-turbo'].filter(Boolean))],
    chatMessages
  );
}

export async function generateSagunResponse(messages: SagunMessage[]): Promise<string> {
  const result = await generateSagunResult(messages);
  return result.text;
}

export async function generateSagunResult(messages: SagunMessage[]): Promise<SagunLlmResult> {
  const providers = listProviders();
  console.log(
    '[Sagun] providers:',
    providers.map((p) => `${p.name}:${p.apiKey.slice(0, 4)}…`).join(',') || 'none'
  );

  if (!providers.length) {
    return {
      text: 'Sagun key load nahi hui. .env mein AI_API_KEY save karke `npm run dev` dubara start karo.',
      error: 'missing_key',
    };
  }

  const chatMessages = messages.map((m) => ({
    role: m.role === 'SYSTEM' ? 'system' : m.role === 'ASSISTANT' ? 'assistant' : 'user',
    content: m.content,
  }));

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const text = await completeProvider(provider.name, provider.apiKey, messages, chatMessages);
      if (text) return { text };
    } catch (error: any) {
      const message = String(error?.message || 'AI provider error');
      console.error('[Sagun] provider error:', provider.name, message);
      errors.push(`${provider.name}: ${message}`);
    }
  }

  const combined = errors.join(' | ');
  return {
    text: `Sagun AI connect nahi ho paayi (${providers[0].name}): ${combined}`,
    error: combined || 'provider_failed',
  };
}

export function getSagunSystemPrompt(): string {
  return `You are Sagun, the helpful WedWithMe assistant. Reply in the user's language (Hindi or English). Keep answers short and practical.
Rules:
1. Help with vendor discovery, matrimonial matching, and booking guidance.
2. NEVER expose private PII, emails, passwords, or payment secrets.
3. If platform data is provided below, use those names/prices only. Do not invent vendors.
4. Matching and recommendations are informational, not a guarantee.
5. Be polite, concise, and warm.`;
}
