/**
 * WhatsApp Provider Abstraction
 * 
 * NOTE: The current implementation intentionally returns an 'UNCONFIGURED'
 * state if no provider is securely provided via ENV variables. This prevents
 * crashing the notification engine while safely persisting delivery metadata.
 * 
 * Configurable Metadata Example (For future active integrations):
 * Provider: Meta Graph API / Twilio
 * Cost Model: Session-based / Message-based depending on template.
 * Estimated Cost per message (India): ₹0.80 - ₹1.50 (depending on utility/marketing category).
 */

export interface WhatsAppPayload {
  recipientPhone: string;
  templateName?: string;
  messageText: string;
}

export interface WhatsAppResult {
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  provider: string;
  provider_reference_id: string | null;
  error_metadata: any | null;
}

export async function dispatchWhatsAppMessage(payload: WhatsAppPayload): Promise<WhatsAppResult> {
  let provider = process.env.WHATSAPP_PROVIDER || 'UNCONFIGURED';

  try {
    if (provider === 'UNCONFIGURED' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_WHATSAPP_FROM) {
      provider = 'TWILIO';
    }

    if (provider === 'UNCONFIGURED') {
      // Simulate safe failure due to missing provider configuration
      return {
        status: 'FAILED',
        provider: 'UNCONFIGURED',
        provider_reference_id: null,
        error_metadata: { message: 'WhatsApp provider not configured in environment variables' }
      };
    }

    // Mock branching for future integrations
    if (provider === 'TWILIO') {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_WHATSAPP_FROM;
      if (!sid || !token || !from) {
        throw new Error('Twilio WhatsApp env vars missing');
      }
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
          To: payload.recipientPhone.startsWith('whatsapp:') ? payload.recipientPhone : `whatsapp:${payload.recipientPhone}`,
          Body: payload.messageText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { status: 'FAILED', provider, provider_reference_id: null, error_metadata: data };
      }
      return { status: 'SENT', provider, provider_reference_id: data.sid, error_metadata: null };
    }

    if (provider === 'META_GRAPH') {
      // const response = await fetch('https://graph.facebook.com/v17.0/...');
      // return { status: 'SENT', provider, provider_reference_id: 'graph-id', error_metadata: null };
      throw new Error('Meta Graph integration not fully implemented');
    }

    return {
      status: 'FAILED',
      provider,
      provider_reference_id: null,
      error_metadata: { message: 'Unknown provider configuration' }
    };
    
  } catch (error: any) {
    return {
      status: 'FAILED',
      provider,
      provider_reference_id: null,
      error_metadata: { message: error.message, stack: error.stack }
    };
  }
}
