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
  const provider = process.env.WHATSAPP_PROVIDER || 'UNCONFIGURED';

  try {
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
      // const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
      // const message = await client.messages.create({ ... });
      // return { status: 'SENT', provider, provider_reference_id: message.sid, error_metadata: null };
      throw new Error('Twilio integration not fully implemented');
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
