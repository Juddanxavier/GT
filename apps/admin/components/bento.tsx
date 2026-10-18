import type { ReactNode } from 'react';

/**
 * Bento tile sizes. Spans only apply at `lg`, where the board becomes a
 * four-column mosaic; below that every tile falls back to a single cell.
 */
export type BentoSize = 'base' | 'wide' | 'tall' | 'feature';

/** Span classes per size — the one place the mosaic geometry is defined. */
export const bentoSpan: Record<BentoSize, string> = {
  base: '',
  wide: 'lg:col-span-2',
  tall: 'lg:row-span-2',
  feature: 'lg:col-span-2 lg:row-span-2',
};

/**
 * The bento board. Four columns at `lg` by default; pass `columns={3}` for a
 * single three-up strip. Below `lg` a four-column board drops to two columns,
 * and a three-column board to one, so tiles stay readable on narrow screens.
 * Rows are at least 156px tall and grow to fit their content. Tile order
 * determines the mosaic, so callers list children in the order they should pack.
 */
export function BentoBoard({
  children,
  className,
  columns = 4,
}: {
  children: ReactNode;
  className?: string;
  /** Three columns for a 1x3 strip, four for the mosaic. */
  columns?: 3 | 4;
}) {
  const track = columns === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4';
  return (
    <div
      className={['grid', track, 'gap-4', className ?? ''].filter(Boolean).join(' ')}
      style={{ gridAutoRows: 'minmax(156px, auto)' }}
    >
      {children}
    </div>
  );
}

/**
 * Span pattern for a uniform KPI row, so the mosaic always fills its grid
 * instead of clipping or leaving a dangling cell. The first tile leads.
 */
export function bentoRowSpans(count: number): BentoSize[] {
  if (count <= 1) return ['feature'];
  if (count === 2) return ['feature', 'feature'];
  if (count === 3) return ['feature', 'wide', 'wide'];
  if (count === 4) return ['feature', 'wide', 'base', 'base'];
  return ['feature', ...Array.from({ length: count - 1 }, () => 'base' as BentoSize)];
}

/**
 * A non-KPI tile (status donut, breakdown list) that shares the board's chrome.
 * KPI tiles render through `KpiCard` instead, which carries its own band, wash,
 * and interaction states.
 */
export function BentoWidget({
  size = 'base',
  className,
  children,
}: {
  size?: BentoSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={['content-panel overflow-hidden flex flex-col p-4', bentoSpan[size], className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
