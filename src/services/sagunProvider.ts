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

type ProviderName = 'gemini' | 'groq' | 'openai' | 'openrouter';

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

function listProviders(): { name: ProviderName; apiKey: string }[] {
  const sagunKey = readEnv('SAGUN_AI_KEY');
  const geminiKey = readEnv('AI_API_KEY') || readEnv('GEMINI_API_KEY') || readEnv('AI_PROVIDER_API_KEY');
  const groqKey = readEnv('GROQ_API_KEY');
  const providers: { name: ProviderName; apiKey: string }[] = [];

  if (sagunKey) {
    if (sagunKey.startsWith('gsk_')) providers.push({ name: 'groq', apiKey: sagunKey });
    else if (sagunKey.startsWith('sk-or-')) providers.push({ name: 'openrouter', apiKey: sagunKey });
    else if (sagunKey.startsWith('sk-')) providers.push({ name: 'openai', apiKey: sagunKey });
    else providers.push({ name: 'gemini', apiKey: sagunKey });
  }

  if (geminiKey && geminiKey !== sagunKey) providers.push({ name: 'gemini', apiKey: geminiKey });
  if (groqKey && groqKey !== sagunKey) providers.push({ name: 'groq', apiKey: groqKey });

  return providers;
}

const DEAD_GROQ_MODELS = new Set([
  'llama3-8b-8192',
  'llama3-70b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'gemma-7b-it',
  'llama-3.1-70b-versatile',
]);

const GROQ_FALLBACK_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
];

function groqModelList(): string[] {
  const preferred = cleanKey(process.env.GROQ_MODEL);
  const ordered = [preferred, ...GROQ_FALLBACK_MODELS].filter((id) => id && !DEAD_GROQ_MODELS.has(id));
  return [...new Set(ordered.length ? ordered : GROQ_FALLBACK_MODELS)];
}

function shouldRetryModel(status: number, message: string): boolean {
  const m = message.toLowerCase();
  if (status === 404 || status === 400) {
    if (
      m.includes('decommissioned') ||
      m.includes('deprecated') ||
      m.includes('no longer supported') ||
      m.includes('not found') ||
      m.includes('does not exist') ||
      m.includes('does not have access') ||
      m.includes('model')
    ) {
      return true;
    }
  }
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
          temperature: 0.2,
          max_tokens: 350,
        }),
      },
      20000
    );

    const message = data.choices?.[0]?.message;
    const text = Array.isArray(message?.content)
      ? message.content.map((part: any) => (typeof part === 'string' ? part : part?.text || '')).join('')
      : message?.content || message?.reasoning || '';
    if (response.ok && String(text).trim()) return String(text).trim();

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
          generationConfig: { temperature: 0.2, maxOutputTokens: 350 },
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
  if (name === 'openrouter') {
    return completeOpenAICompatible(
      'https://openrouter.ai/api/v1/chat/completions',
      apiKey,
      ['meta-llama/llama-3.1-8b-instruct:free', 'google/gemini-2.0-flash-exp:free'],
      chatMessages
    );
  }
  if (name === 'groq') {
    return completeOpenAICompatible(
      'https://api.groq.com/openai/v1/chat/completions',
      apiKey,
      groqModelList(),
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
      text: 'Sagun key load nahi hui. .env mein SAGUN_AI_KEY save karke `npm run dev` dubara start karo.',
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

export { getSagunSystemPrompt } from '@/lib/sagunSiteContext';
