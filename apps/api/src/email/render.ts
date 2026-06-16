import { render } from '@react-email/components';
import { emailTemplates, type EventType } from './templates';
import type { ShipmentData, Branding } from './types';

export async function renderEmail(eventType: EventType, shipment: ShipmentData, branding?: Branding): Promise<string> {
  const Component = emailTemplates[eventType];
  if (!Component) throw new Error(`No email template for event: ${eventType}`);
  return await render(Component({ shipment, branding }));
}
