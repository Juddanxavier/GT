export const whatsappConfig = {
  authKey: process.env.MSG91_AUTH_KEY || '',
  sender: process.env.MSG91_WHATSAPP_SENDER || '',
  templates: {
    InfoReceived: process.env.MSG91_TEMPLATE_ID_PICKEDUP || '',
    InTransit: process.env.MSG91_TEMPLATE_ID_INTRANSIT || '',
    OutForDelivery: process.env.MSG91_TEMPLATE_ID_OUTFORDELIVERY || '',
    Delivered: process.env.MSG91_TEMPLATE_ID_DELIVERED || '',
    Exception: process.env.MSG91_TEMPLATE_ID_EXCEPTION || '',
  },
};

export function isWhatsAppConfigured(): boolean {
  return !!whatsappConfig.authKey && !!whatsappConfig.sender;
}
