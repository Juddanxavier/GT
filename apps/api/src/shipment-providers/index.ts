import type { ShipmentProvider } from './types';
import { SeventeenTrackProvider } from './providers/seventeen-track';
import { TrackingMoreProvider } from './providers/tracking-more';

const PROVIDERS: Record<string, () => ShipmentProvider> = {
  '17track': () => new SeventeenTrackProvider(),
  trackingmore: () => new TrackingMoreProvider(),
};

let _instance: ShipmentProvider | null = null;

export function getProvider(): ShipmentProvider {
  if (_instance) return _instance;
  const name = process.env.SHIPMENT_PROVIDER || '17track';
  const factory = PROVIDERS[name];
  if (!factory) {
    throw new Error(
      `Unknown SHIPMENT_PROVIDER: "${name}". Available: ${Object.keys(PROVIDERS).join(', ')}`,
    );
  }
  _instance = factory();
  return _instance;
}

export function resetProvider(): void {
  _instance = null;
}
