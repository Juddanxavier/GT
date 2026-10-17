'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { cn } from '@heroui/react';
import { Banknote, CalendarDays, ScanBarcode, Tag, Truck } from 'lucide-react';
import { CopyButton } from '@/components/copy-button';
import { RouteJourneyStepper } from '@/components/shipments/route-journey-stepper';
import { ShipmentStatusBadge } from '@/components/shipment-status-badge';
import { formatCurrency } from '@/lib/currency';
import { shortDate } from '@/lib/format-date';
import type { ShipmentDetail } from '@/lib/queries';

const BARCODE_HEIGHT = 36;
const BARCODE_MAX_CHARS = 10;

interface BarcodeRun {
  x: number;
  w: number;
}

/** Deterministic bar pattern for a value: same input, same barcode, every
 * render. This is a visual waybill mark, not a scannable symbology. */
function barcodeRuns(value: string): { runs: BarcodeRun[]; modules: number } {
  const source = (value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'SHIPMENT').slice(
    0,
    BARCODE_MAX_CHARS,
  );
  const runs: BarcodeRun[] = [];
  let x = 0;
  const bar = (w: number) => {
    runs.push({ x, w });
    x += w;
  };
  const gap = (w: number) => {
    x += w;
  };

  /* Guard bars, then three bars and a space per character. */
  bar(1);
  gap(2);
  bar(1);
  gap(2);

  let seed = 11;
  for (let i = 0; i < source.length; i++) {
    seed = (seed * 31 + source.charCodeAt(i)) % 2147483647;
    const n = seed % 512;
    for (let b = 0; b < 3; b++) {
      const shift = b * 3;
      bar(1 + ((n >> shift) & 1) + ((n >> (shift + 1)) & 1));
      gap(1 + ((n >> (shift + 2)) & 1));
    }
  }

  bar(1);
  gap(2);
  bar(1);

  return { runs, modules: x };
}

/** The waybill mark. The encoded value is printed beneath it as text, so the
 * graphic itself is decorative. */
function TicketBarcode({ value }: { value: string }): ReactNode {
  const { runs, modules } = useMemo(() => barcodeRuns(value), [value]);

  return (
    <div className="space-y-1.5">
      <div className="relative overflow-hidden">
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox={`0 0 ${modules} ${BARCODE_HEIGHT}`}
          preserveAspectRatio="none"
          className="block h-9 w-full text-foreground"
        >
          {runs.map((run) => (
            <rect key={run.x} x={run.x} y={0} width={run.w} height={BARCODE_HEIGHT} fill="currentColor" />
          ))}
        </svg>
        {/* One pass of the scanner. Purely decorative, and gone once it runs. */}
        <span aria-hidden="true" className="scan-sweep absolute inset-x-0 top-0 h-px bg-primary" />
      </div>
      <p className="font-mono text-center text-[10px] tracking-[0.18em] text-muted">{value}</p>
    </div>
  );
}

/** One identifier on the tear-off stub. */
function StubField({
  icon: Icon,
  label,
  value,
  mono = false,
  strong = false,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}): ReactNode {
  return (
    <div className="min-w-0">
      <dt className="ops-label flex items-center gap-1.5">
        <Icon size={12} aria-hidden="true" />
        {label}
      </dt>
      <dd
        className={cn(
          'mt-0.5 truncate',
          strong ? 'text-base font-semibold tabular-nums' : 'text-xs',
          mono && 'font-mono tabular-nums',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

interface ShipmentTicketProps {
  shipment: ShipmentDetail;
  tenantCurrency?: string;
  className?: string;
}

/** The shipment as a waybill: the parcel's identity and journey on the body,
 * its identifiers on a tear-off stub, cut along the right edge.
 *
 * No frame: a waybill is paper, so the sheet, the cut and the two notches carry
 * the shape and a hairline border would only box it in.
 *
 * The journey is centred in the body rather than pinned under the tracking
 * number. The stub carries more content than the identity block, so on a wide
 * screen it is the taller half — centring spends that height instead of
 * leaving a hole under the number. */
export function ShipmentTicket({
  shipment,
  tenantCurrency,
  className,
}: ShipmentTicketProps): ReactNode {
  return (
    <section className={cn('relative overflow-hidden rounded-md bg-surface sm:flex', className)}>
      <div className="flex flex-col min-w-0 flex-1 p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <ShipmentStatusBadge status={shipment.status} size="md" />
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Truck size={13} aria-hidden="true" />
            {shipment.carrier || 'Unknown carrier'}
          </span>
          {shipment.trackingRegistered && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-success-soft-foreground">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              Live tracking
            </span>
          )}
        </div>

        <h1 className="font-mono text-2xl font-bold tracking-tight tabular-nums flex items-center gap-2 mt-3">
          {shipment.trackingNo}
          <CopyButton text={shipment.trackingNo} />
        </h1>

        <div className="mt-5 pt-4 border-t border-border flex flex-1 items-center">
          <div className="w-full">
            <RouteJourneyStepper
              status={shipment.status}
              origin={shipment.origin}
              destination={shipment.destination}
            />
          </div>
        </div>
      </div>

      {/* The cut, on the side: a notch at each end of a dashed tear line. */}
      <div aria-hidden="true" className="relative hidden sm:block w-px shrink-0">
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 size-4 rounded-full bg-background" />
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 size-4 rounded-full bg-background" />
        <span className="absolute inset-y-0 left-0 w-px perforation-y" />
      </div>

      {/* Stacked below `sm`, the halves meet along the other axis, so the cut
       * follows the layout and runs across instead. */}
      <div aria-hidden="true" className="relative sm:hidden">
        <span className="absolute -left-2 top-1/2 -translate-y-1/2 size-4 rounded-full bg-background" />
        <span className="absolute -right-2 top-1/2 -translate-y-1/2 size-4 rounded-full bg-background" />
        <span className="block h-px perforation-x" />
      </div>

      <div className="flex flex-col justify-between gap-4 p-5 sm:w-56 shrink-0">
        <p className="ops-label flex items-center gap-1.5">
          <ScanBarcode size={12} aria-hidden="true" />
          Waybill
        </p>

        <dl className="space-y-3">
          <StubField
            icon={Banknote}
            label="Bill amount"
            value={shipment.billAmount ? formatCurrency(shipment.billAmount, tenantCurrency) : '—'}
            strong
          />
          <StubField icon={Tag} label="Label" value={shipment.labelCode || '—'} mono />
          <StubField icon={CalendarDays} label="Created" value={shortDate(shipment.createdAt)} />
        </dl>

        <TicketBarcode value={shipment.trackingNo} />
      </div>
    </section>
  );
}
