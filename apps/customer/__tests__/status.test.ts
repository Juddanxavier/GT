import { describe, expect, it } from 'vitest';
import { STATUS_COLORS, STATUS_LABELS } from '../lib/status';

describe('status config', () => {
  it('labels every status the UI can render', () => {
    const statuses = [
      'pending',
      'info_received',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'delivery_failure',
      'cancelled',
      'exception',
    ];
    for (const s of statuses) {
      expect(STATUS_LABELS[s], `missing label for ${s}`).toBeTruthy();
      expect(STATUS_COLORS[s], `missing color for ${s}`).toBeTruthy();
    }
  });

  it('falls back gracefully for unknown statuses (no label truthy check)', () => {
    expect(STATUS_LABELS['totally_unknown']).toBeUndefined();
  });
});
