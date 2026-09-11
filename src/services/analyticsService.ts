import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

export interface FunnelStepParams {
  userId?: string | null;
  funnelType: 'CUSTOMER' | 'VENDOR';
  stepName: string;
  stepNumber: number;
  metadata?: any;
}

export interface AnalyticsEventParams {
  userId?: string | null;
  sessionId?: string | null;
  eventName: string;
  entityType?: string;
  entityId?: string;
  properties?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordFunnelStep(params: FunnelStepParams): Promise<void> {
  try {
    const id = randomUUID();
    await query(
      `INSERT INTO funnel_events (id, user_id, funnel_type, step_name, step_number, completed, metadata_json)
       VALUES (?, ?, ?, ?, ?, TRUE, ?)`,
      [
        id,
        params.userId || null,
        params.funnelType,
        params.stepName,
        params.stepNumber,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ]
    );
  } catch (err: any) {
    console.error('Analytics funnel error:', err.message);
  }
}

export async function trackEvent(params: AnalyticsEventParams): Promise<void> {
  try {
    const id = randomUUID();
    await query(
      `INSERT INTO analytics_events (id, user_id, session_id, event_name, entity_type, entity_id, properties_json, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.userId || null,
        params.sessionId || null,
        params.eventName,
        params.entityType || null,
        params.entityId || null,
        params.properties ? JSON.stringify(params.properties) : null,
        params.ipAddress || null,
        params.userAgent || null,
      ]
    );
  } catch (err: any) {
    console.error('Analytics tracking error:', err.message);
  }
}
