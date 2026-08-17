import { describe, it, expect } from 'vitest';
import { statusGroupCounts, STATUS_GROUPS } from '@/lib/status-config';

describe('statusGroupCounts', () => {
  it('aggregates per-status counts into group totals', () => {
    const result = statusGroupCounts({
      in_transit: 7,
      out_for_delivery: 10,
      failed_attempt: 0,
      pending: 4,
      info_received: 5,
      delivered: 4,
    });
    expect(result['In Transit']).toBe(17);
    expect(result.Pending).toBe(9);
    expect(result.Delivered).toBe(4);
    expect(result.Exception).toBe(0);
    expect(result.total).toBe(30);
  });

  it('returns zero for all groups when counts is undefined', () => {
    const result = statusGroupCounts(undefined);
    expect(result.total).toBe(0);
    for (const key of Object.keys(result)) expect(result[key]).toBe(0);
  });

  it('produces a key per STATUS_GROUPS entry plus total', () => {
    const result = statusGroupCounts({});
    expect(Object.keys(result).sort()).toEqual([...Object.keys(STATUS_GROUPS), 'total'].sort());
  });
});