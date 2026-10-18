'use client';

import { Button, Chip } from '@heroui/react';
import { RefreshCw } from 'lucide-react';
import type { Branch } from './types';

export function CommandHeader({
  title,
  roleLabel,
  branches,
  branchFilter,
  showBranchFilter,
  branchBadge,
  onBranchChange,
  onRefresh,
}: {
  title: string;
  roleLabel: string;
  branches?: Branch[];
  branchFilter?: string;
  showBranchFilter?: boolean;
  branchBadge?: string;
  onBranchChange?: (id: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="content-panel overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 sm:px-6 py-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
            <Chip color="accent" variant="soft" size="sm" className="capitalize">
              {roleLabel.replace('-', ' ')}
            </Chip>
            {branchBadge && (
              <span className="px-2 py-0.5 rounded-md bg-accent-soft text-accent-soft-foreground text-[10px] font-medium">
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
              className="h-9 text-sm content-panel pl-3 pr-8 outline-none focus:ring-2 focus:ring-accent/40 text-foreground cursor-pointer appearance-none"
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
            className="rounded-xl hover:bg-content2 hover:text-accent"
          >
            <RefreshCw size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
