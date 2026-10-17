'use client';

import { useEffect, useState } from 'react';
import { Card } from '@heroui/react';
import { api } from '@/lib/api';

export function TrackQuotaCard() {
  const [quota, setQuota] = useState<{ quota_total: number; quota_used: number; quota_remain: number; today_used: number } | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    api.get<{ quota_total: number; quota_used: number; quota_remain: number; today_used: number }>('/api/dashboard/17track-quota')
      .then(setQuota)
      .catch(() => setErr(true));
  }, []);
  if (err) return null;
  if (!quota) return <div className="h-24 rounded-lg glass-panel border-0 animate-pulse" />;
  const pct = quota.quota_total > 0 ? Math.round((quota.quota_used / quota.quota_total) * 100) : 0;
  return (
    <Card className="content-panel border-0 p-5">
      <Card.Header className="pb-1">
        <Card.Title className="text-base font-medium text-foreground">17TRACK Quota</Card.Title>
      </Card.Header>
      <Card.Content className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Used</span>
          <span className="font-semibold text-foreground">{quota.quota_used} / {quota.quota_total}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-default-100">
          <div className="stripe-lime h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Remaining</span>
          <span className="font-semibold text-foreground">{quota.quota_remain}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Used Today</span>
          <span className="font-semibold text-foreground">{quota.today_used}</span>
        </div>
      </Card.Content>
    </Card>
  );
}
