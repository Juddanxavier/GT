import React from 'react';
import { Text } from '@react-email/components';
import { EmailLayout } from './layout';
import type { Branding, ShipmentData } from '../types';
import { Detail } from './_components';

export function ShipmentInTransitEmail({ shipment, branding }: { shipment: ShipmentData; branding?: Branding }) {
  return (
    <EmailLayout branding={branding} previewText={`${shipment.trackingNo} in transit`}>
      <table style={{ width: '100%' }}>
        <tr>
          <td style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#18181b', letterSpacing: '-0.3px' }}>
              Moving through network
            </Text>
            <Text style={{ margin: '6px 0 0', fontSize: 13, color: '#52525b' }}>
              Your shipment is currently in transit and making its way to the destination.
            </Text>
          </td>
        </tr>
      </table>

      <table style={{ width: '100%', marginTop: 24 }}>
        <Detail label="Tracking No" value={shipment.trackingNo} />
        {shipment.carrier && <Detail label="Carrier" value={shipment.carrier} />}
        <Detail label="Origin" value={shipment.origin ?? '—'} />
        <Detail label="Destination" value={shipment.destination ?? '—'} />
        {shipment.estimatedDelivery && <Detail label="Est. Delivery" value={shipment.estimatedDelivery} />}
        <Detail label="Status" value="In Transit" last />
      </table>

      <Text style={{ margin: '16px 0 0', fontSize: 11, color: '#a1a1aa', textAlign: 'center', letterSpacing: '0.2px' }}>
        We&apos;ll notify you when it&apos;s out for delivery.
      </Text>
    </EmailLayout>
  );
}
