import { describe, expect, it } from 'vitest';
import { tenantConfig } from '../lib/tenant-config';

describe('tenant config integrity', () => {
  it('has complete contact details', () => {
    expect(tenantConfig.contact.phone).toMatch(/^\+\d{2}/);
    expect(tenantConfig.contact.phoneHref).toBe(
      `tel:${tenantConfig.contact.phone.replace(/[^+\d]/g, '')}`,
    );
    expect(tenantConfig.contact.email).toContain('@');
    expect(tenantConfig.contact.city.length).toBeGreaterThan(0);
  });

  it('lists at least one office with address and phone', () => {
    expect(tenantConfig.offices.length).toBeGreaterThan(0);
    for (const office of tenantConfig.offices) {
      expect(office.name).toBeTruthy();
      expect(office.address).toBeTruthy();
      expect(office.phones).toBeTruthy();
    }
  });

  it('has hero copy and testimonials for the landing page', () => {
    expect(tenantConfig.hero.headline.length).toBe(2);
    expect(tenantConfig.hero.ctaTrack).toBeTruthy();
    expect(tenantConfig.testimonials.length).toBeGreaterThan(0);
  });
});
