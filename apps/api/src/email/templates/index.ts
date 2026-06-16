import type { JSX } from 'react';
import { ShipmentPickedUpEmail } from './shipment-picked-up';
import { ShipmentInTransitEmail } from './shipment-in-transit';
import { ShipmentOutForDeliveryEmail } from './shipment-out-for-delivery';
import { ShipmentDeliveredEmail } from './shipment-delivered';
import { ShipmentExceptionEmail } from './shipment-exception';
import type { Branding, ShipmentData } from '../types';

export type EventType = 'InfoReceived' | 'InTransit' | 'OutForDelivery' | 'Delivered' | 'Exception';

export const emailTemplates: Record<EventType, (props: { shipment: ShipmentData; branding?: Branding }) => JSX.Element> = {
  InfoReceived: ShipmentPickedUpEmail,
  InTransit: ShipmentInTransitEmail,
  OutForDelivery: ShipmentOutForDeliveryEmail,
  Delivered: ShipmentDeliveredEmail,
  Exception: ShipmentExceptionEmail,
};
