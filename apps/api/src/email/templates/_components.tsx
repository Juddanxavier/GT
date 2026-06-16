import React from 'react';
import { Text } from '@react-email/components';

export function Detail({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <tr>
      <td style={{
        padding: '8px 0',
        borderBottom: last ? 'none' : '1px solid #e4e4e7',
        verticalAlign: 'top',
      }}>
        <Text style={{
          margin: 0,
          fontSize: 10,
          color: '#a1a1aa',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>{label}</Text>
      </td>
      <td style={{
        padding: '8px 0',
        borderBottom: last ? 'none' : '1px solid #e4e4e7',
        textAlign: 'right',
        verticalAlign: 'top',
      }}>
        <Text style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          color: '#18181b',
        }}>{value}</Text>
      </td>
    </tr>
  );
}
