import React from 'react';
import { Section, Text } from '@react-email/components';
import { EmailLayout } from './layout';
import type { Branding, ShipmentData } from '../types';
import { Detail } from './_components';

export function ShipmentExceptionEmail({ shipment, branding }: { shipment: ShipmentData; branding?: Branding }) {
  return (
    <EmailLayout branding={branding} previewText={`${shipment.trackingNo} exception`}>
      <table style={{ width: '100%' }}>
        <tr>
          <td style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#dc2626', letterSpacing: '-0.3px' }}>
              Action needed
            </Text>
            <Text style={{ margin: '6px 0 0', fontSize: 13, color: '#52525b' }}>
              There was an issue with the delivery of your shipment. Our team has been notified and is reviewing the situation.
            </Text>
          </td>
        </tr>
      </table>

      <table style={{ width: '100%', marginTop: 24 }}>
        <Detail label="Tracking No" value={shipment.trackingNo} />
        {shipment.carrier && <Detail label="Carrier" value={shipment.carrier} />}
        <Detail label="Origin" value={shipment.origin ?? '—'} />
        <Detail label="Destination" value={shipment.destination ?? '—'} />
        <Detail label="Status" value="Exception" last />
      </table>

      <Section style={{ background: '#fafafa', borderRadius: 6, padding: '12px 14px', marginTop: 16, border: '1px solid #e4e4e7' }}>
        <Text style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#18181b' }}>
          What happens next?
        </Text>
        <Text style={{ margin: 0, fontSize: 11, color: '#52525b', lineHeight: 1.6 }}>
          We&apos;re looking into this with the carrier. For urgent assistance, please contact our support team directly.
        </Text>
      </Section>

      <Text style={{ margin: '16px 0 0', fontSize: 11, color: '#a1a1aa', textAlign: 'center', letterSpacing: '0.2px' }}>
        We apologize for the inconvenience.
      </Text>
    </EmailLayout>
  );
}
