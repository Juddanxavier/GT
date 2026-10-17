'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarClock, CheckCircle2, PackageSearch, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { pctStr, trendDir } from './utils';

type Tone = 'danger' | 'warning' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  danger: 'bg-danger/10 text-danger-soft-foreground',
  warning: 'bg-warning/10 text-warning-soft-foreground',
  neutral: 'bg-default-100 text-muted',
};

function MetricLink({
  href,
  icon: Icon,
  tone,
  label,
  count,
  delta,
  revealDelay,
}: {
  href: string;
  icon: LucideIcon;
  tone: Tone;
  label: string;
  count: number;
  /** Only the exceptions metric carries this. */
  delta?: number | null;
  revealDelay?: number;
}) {
  const style =
    revealDelay !== undefined ? ({ '--reveal-delay': `${revealDelay}ms` } as CSSProperties) : undefined;

  // A rise in a problem count is bad, so the tone flips against the arrow.
  const dir = delta === undefined ? null : trendDir(delta);
  const deltaClass =
    dir === 'up'
      ? 'text-danger-soft-foreground'
      : dir === 'down'
        ? 'text-success-soft-foreground'
        : 'text-muted';

  return (
    <Link
      href={href}
      style={style}
      className={`${revealDelay !== undefined ? 'reveal' : ''} flex items-center gap-3 rounded-md border border-divider bg-content2 px-3.5 py-3 transition-colors hover:bg-content3`}
    >
      <span
        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${TONE_CLASS[tone]}`}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] text-muted">{label}</span>
        <span className="block text-xl font-semibold leading-tight tabular-nums text-foreground">
          {count}
        </span>
      </span>
      {delta !== undefined && (
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${deltaClass}`}>
          {dir === 'up' ? <TrendingUp size={11} /> : dir === 'down' ? <TrendingDown size={11} /> : null}
          {pctStr(delta)}
        </span>
      )}
      <ArrowRight size={14} className="text-muted shrink-0" />
    </Link>
  );
}

/**
 * The dashboard's first read: what needs attention. It leads both dashboards,
 * takes over the three problem metrics (exceptions, overdue, not tracked), and
 * is a named section whose heading sits below the page's `h1` (AC-5, AC-6).
 *
 * When every count the payload provides is zero it shows an explicit all clear
 * state with a positive signal, never an empty or hidden panel (AC-7). The
 * summary and each metric link into the shipments list (AC-8).
 */
export function AttentionPanel({
  exceptions,
  overdue,
  notTracked,
  exceptionsDelta,
}: {
  exceptions: number;
  overdue: number;
  notTracked: number;
  exceptionsDelta: number | null;
}) {
  const total = exceptions + overdue + notTracked;
  const allClear = total === 0;
  const noun = total === 1 ? 'shipment' : 'shipments';
  const verb = total === 1 ? 'needs' : 'need';

  return (
    <section aria-labelledby="attention-panel-heading" className="reveal content-panel p-5">
      <h2 id="attention-panel-heading" className="text-base font-semibold tracking-tight text-foreground">
        Needs attention
      </h2>

      <Link
        href="/shipments"
        className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-accent"
      >
        {allClear ? (
          <>
            <CheckCircle2 size={16} className="shrink-0 text-success-soft-foreground" />
            <span>All clear. Nothing needs attention right now.</span>
          </>
        ) : (
          <span>
            {total} {noun} {verb} attention
          </span>
        )}
        <ArrowRight size={14} className="shrink-0 text-muted" />
      </Link>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricLink
          href="/shipments?status=Exception"
          icon={TriangleAlert}
          tone="danger"
          label="Exceptions"
          count={exceptions}
          delta={exceptionsDelta}
          revealDelay={0}
        />
        <MetricLink
          href="/shipments"
          icon={CalendarClock}
          tone="warning"
          label="Overdue"
          count={overdue}
          revealDelay={60}
        />
        <MetricLink
          href="/shipments"
          icon={PackageSearch}
          tone="neutral"
          label="Not tracked"
          count={notTracked}
          revealDelay={120}
        />
      </div>
    </section>
  );
}
