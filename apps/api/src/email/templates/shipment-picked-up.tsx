import React from 'react';
import { Text } from '@react-email/components';
import { EmailLayout } from './layout';
import type { Branding, ShipmentData } from '../types';
import { Detail } from './_components';

export function ShipmentPickedUpEmail({ shipment, branding }: { shipment: ShipmentData; branding?: Branding }) {
  return (
    <EmailLayout branding={branding} previewText={`${shipment.trackingNo} picked up`}>
      <table style={{ width: '100%' }}>
        <tr>
          <td style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#18181b', letterSpacing: '-0.3px' }}>
              On its way
            </Text>
            <Text style={{ margin: '6px 0 0', fontSize: 13, color: '#52525b' }}>
              Your shipment has been picked up and is moving through the network.
            </Text>
          </td>
        </tr>
      </table>

      <table style={{ width: '100%', marginTop: 24 }}>
        <Detail label="Tracking No" value={shipment.trackingNo} />
        {shipment.carrier && <Detail label="Carrier" value={shipment.carrier} />}
        <Detail label="Origin" value={shipment.origin ?? '—'} />
        <Detail label="Destination" value={shipment.destination ?? '—'} />
        <Detail label="Status" value="Picked Up" last />
      </table>

      <Text style={{ margin: '16px 0 0', fontSize: 11, color: '#a1a1aa', textAlign: 'center', letterSpacing: '0.2px' }}>
        We&apos;ll keep you updated every step of the way.
      </Text>
    </EmailLayout>
  );
}
