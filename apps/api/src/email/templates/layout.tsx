import React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Img,
} from '@react-email/components';
import type { Branding } from '../types';

const brandGreen = '#22c55e';

export function EmailLayout({
  children, branding, previewText,
}: {
  children: React.ReactNode;
  branding?: Branding;
  previewText?: string;
}) {
  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={{
        fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
        background: '#f0f0f0',
        padding: '32px 16px',
        color: '#18181b',
        fontSize: 13,
        lineHeight: 1.6,
        margin: 0,
      }}>
        <Container style={{ maxWidth: 520, margin: '0 auto' }}>
          <Section style={{
            background: branding?.primaryColor ?? brandGreen,
            padding: '28px',
            borderRadius: '6px 6px 0 0',
          }}>
            <table style={{ width: '100%' }}>
              <tr>
                {branding?.logoUrl ? (
                  <td style={{ width: 32, verticalAlign: 'middle' }}>
                    <Img src={branding.logoUrl} alt="" width="auto" height="28" style={{ display: 'block' }} />
                  </td>
                ) : null}
                <td style={{ verticalAlign: 'middle', paddingLeft: branding?.logoUrl ? '10px' : '0' }}>
                  <Text style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '-0.2px',
                  }}>
                    {branding?.companyName ?? 'Gajan Traders'}
                  </Text>
                </td>
                <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                  <Text style={{
                    margin: 0,
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.7)',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}>Notification</Text>
                </td>
              </tr>
            </table>
          </Section>

          <Section style={{ background: '#fff', padding: '24px 28px' }}>
            {children}
          </Section>

          <Section style={{
            background: '#fff',
            borderRadius: '0 0 6px 6px',
            padding: '16px 28px',
            borderTop: '1px solid #e4e4e7',
          }}>
            <Text style={{
              margin: 0,
              fontSize: 10,
              color: '#a1a1aa',
              textAlign: 'center',
              letterSpacing: '0.2px',
            }}>
              {branding?.companyName ?? 'Gajan Traders'} — Automated Shipment Notification
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
