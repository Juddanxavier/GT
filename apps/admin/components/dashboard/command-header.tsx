'use client';

import { Button, Chip } from '@heroui/react';
import { RefreshCw } from 'lucide-react';
import type { Branch, TickerItem } from './types';

export function CommandHeader({
  title,
  roleLabel,
  ticker,
  branches,
  branchFilter,
  showBranchFilter,
  branchBadge,
  onBranchChange,
  onRefresh,
}: {
  title: string;
  roleLabel: string;
  ticker: TickerItem[];
  branches?: Branch[];
  branchFilter?: string;
  showBranchFilter?: boolean;
  branchBadge?: string;
  onBranchChange?: (id: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="content-panel overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-glass">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
            <Chip color="accent" variant="soft" size="sm" className="capitalize">
              {roleLabel.replace('-', ' ')}
            </Chip>
            {branchBadge && (
              <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-medium">
                {branchBadge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">Live operations overview</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showBranchFilter && branches && branches.length > 0 && onBranchChange && (
            <select
              value={branchFilter ?? ''}
              onChange={(e) => onBranchChange(e.target.value)}
              className="h-9 text-sm content-panel pl-3 pr-8 outline-none focus:ring-2 focus:ring-accent/20 text-foreground cursor-pointer appearance-none"
              aria-label="Filter by branch"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            aria-label="Refresh dashboard"
            onPress={onRefresh}
            className="hover:bg-accent/10 hover:text-accent"
          >
            <RefreshCw size={15} />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 sm:px-5 py-3 bg-muted/[0.04]">
        {ticker.map((item, i) => (
          <div key={item.label} className="flex items-center gap-2">
            {i > 0 && <span className="hidden sm:inline w-1 h-1 rounded-full bg-muted/40" />}
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold tabular-nums text-foreground">
                {item.value}
              </span>
              <span className="text-[11px] text-muted">{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
