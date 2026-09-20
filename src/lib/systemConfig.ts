import { query } from '@/lib/db';

export async function getSystemConfig<T = any>(key: string, fallback: T): Promise<T> {
  try {
    const rows = await query<any[]>(
      `SELECT config_value FROM system_configuration WHERE config_key = ? LIMIT 1`,
      [key]
    );
    if (!rows.length) return fallback;
    const raw = rows[0].config_value;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return fallback;
  }
}

export async function isMatrimonialChatEnabled(): Promise<boolean> {
  const flag = process.env.MATRIMONIAL_CHAT_ENABLED;
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  const cfg = await getSystemConfig<{ enabled?: boolean }>('MATRIMONIAL_CHAT_ENABLED', { enabled: false });
  return Boolean(cfg.enabled);
}
