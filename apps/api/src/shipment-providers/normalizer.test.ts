import { describe, expect, it } from 'vitest';
import { normalizeEvent, normalizeStatus, normalizeTrackResponse } from './normalizer';

describe('normalizeStatus', () => {
  it('maps 17TRACK statuses to internal statuses', () => {
    expect(normalizeStatus('InTransit')).toBe('in_transit');
    expect(normalizeStatus('Delivered')).toBe('delivered');
    expect(normalizeStatus('OutForDelivery')).toBe('out_for_delivery');
    expect(normalizeStatus('Exception')).toBe('exception');
  });

  it('passes through already-internal statuses', () => {
    expect(normalizeStatus('pending')).toBe('pending');
    expect(normalizeStatus('in_transit')).toBe('in_transit');
  });

  it('maps 17TRACK sub-stages to their parent stage', () => {
    expect(normalizeStatus('InTransit_PickedUp')).toBe('in_transit');
    expect(normalizeStatus('InTransit_Other')).toBe('in_transit');
    expect(normalizeStatus('InTransit_CustomsReleased')).toBe('in_transit');
    expect(normalizeStatus('DeliveryFailure_AddressIssue')).toBe('failed_attempt');
    expect(normalizeStatus('Exception_Damage')).toBe('exception');
  });

  it('prefers the longest matching stage prefix', () => {
    // "Delivered_..." must not be captured by a shorter prefix.
    expect(normalizeStatus('Delivered_DroppedOff')).toBe('delivered');
    expect(normalizeStatus('OutForDelivery_Today')).toBe('out_for_delivery');
  });

  it('maps the granular PickedUp stage', () => {
    expect(normalizeStatus('PickedUp')).toBe('in_transit');
  });

  it('defaults unknown provider statuses to pending, not exception', () => {
    expect(normalizeStatus('SomethingWeird')).toBe('pending');
  });
});

describe('normalizeEvent', () => {
  it('normalizes 17TRACK event fields', () => {
    const event = normalizeEvent({
      stage: 'InTransit',
      sub_status: 'in_transit',
      description: 'Arrived at hub',
      location: 'Mumbai',
      time_utc: '2026-01-15T10:00:00.000Z',
      carrier: 'DHL',
      carrierCode: '100001',
    });

    expect(event.status).toBe('in_transit');
    expect(event.description).toBe('Arrived at hub');
    expect(event.location).toBe('Mumbai');
    expect(event.carrier).toBe('DHL');
    expect(event.eventTime).toBeInstanceOf(Date);
  });
});

describe('normalizeTrackResponse', () => {
  it('uses the latest event as current status', () => {
    const older = normalizeEvent({
      stage: 'InTransit',
      description: 'Older',
      time_utc: '2026-01-10T10:00:00.000Z',
    });
    const newer = normalizeEvent({
      stage: 'Delivered',
      description: 'Newer',
      time_utc: '2026-01-15T10:00:00.000Z',
    });

    const result = normalizeTrackResponse('17track', [older, newer]);
    expect(result.currentStatus).toBe('delivered');
    expect(result.events[0]?.status).toBe('delivered');
  });
});
