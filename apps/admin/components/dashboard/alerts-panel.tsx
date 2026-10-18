'use client';

import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card } from '@heroui/react';
import type { Alert } from './types';
import { statusLabel } from './utils';

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const iconMap: Record<string, ReactNode> = {
    stale: <Clock size={14} />,
    overdue: <CalendarClock size={14} />,
    exception: <AlertTriangle size={14} />,
  };
  const labelMap: Record<string, string> = {
    stale: 'Stale',
    overdue: 'Overdue',
    exception: 'Exception',
  };

  return (
    <Card className="content-panel border-0">
      <Card.Header>
        <Card.Title className="text-base font-medium text-foreground">Alerts</Card.Title>
        <Card.Description className="text-xs text-muted">
          {alerts.length > 0
            ? `${alerts.length} shipment${alerts.length > 1 ? 's' : ''} need attention`
            : 'All clear'}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-muted text-sm py-2">
            <CheckCircle2 size={18} />
            <span>No alerts — all shipments are on track</span>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 10).map((a) => {
              const desc =
                a.type === 'stale'
                  ? `No update in ${a.lastTrackedAt ? Math.floor((Date.now() - new Date(a.lastTrackedAt).getTime()) / 86_400_000) : '?'} days`
                  : a.type === 'overdue'
                    ? `ETA was ${a.estimatedDelivery ? new Date(a.estimatedDelivery).toLocaleDateString() : '?'}`
                    : `Status: ${statusLabel(a.status)}`;
              return (
                <a
                  key={a.shipmentId}
                  href={`/shipments/${a.trackingNo}`}
                  className="flex items-center gap-3 text-sm px-4 py-3 rounded-xl border border-divider bg-content2 hover:bg-content3 transition-colors"
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-default-100 text-muted shrink-0">
                    {iconMap[a.type] ?? <AlertTriangle size={14} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                        {labelMap[a.type] ?? 'Alert'}
                      </span>
                      <span className="font-mono font-semibold text-sm text-foreground">{a.trackingNo}</span>
                    </div>
                    <p className="text-xs text-muted truncate mt-0.5">{desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-muted shrink-0" />
                </a>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
