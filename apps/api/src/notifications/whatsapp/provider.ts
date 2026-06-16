import { whatsappConfig, isWhatsAppConfigured } from './config';

type SendWhatsAppParams = {
  to: string;
  templateId: string;
  variables: Record<string, string>;
};

export async function sendWhatsApp(params: SendWhatsAppParams): Promise<void> {
  if (!isWhatsAppConfigured()) {
    throw new Error('MSG91 not configured — MSG91_AUTH_KEY or MSG91_WHATSAPP_SENDER missing');
  }

  const response = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outgoing-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: whatsappConfig.authKey,
    },
    body: JSON.stringify({
      integratedNumber: whatsappConfig.sender,
      contentType: 'template',
      to: params.to,
      templateId: params.templateId,
      variables: params.variables,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MSG91 WhatsApp send failed (${response.status}): ${body}`);
  }
}
