import { whatsappConfig } from './config';
import type { ShipmentData } from '../../email/types';
import type { EventType } from '../../email/templates';

type TemplateVars = Record<string, string>;

export function getWhatsAppTemplateParams(
  eventType: EventType,
  shipment: ShipmentData,
): { templateId: string; variables: TemplateVars } | null {
  const templateId = whatsappConfig.templates[eventType];
  if (!templateId) return null;

  const variables: TemplateVars = {
    customer_name: shipment.customerName ?? 'Valued Customer',
    label_code: shipment.labelCode ?? shipment.trackingNo,
    origin: shipment.origin ?? '',
    destination: shipment.destination ?? '',
    estimated_delivery: shipment.estimatedDelivery ?? '',
    status: shipment.status,
  };

  return { templateId, variables };
}
