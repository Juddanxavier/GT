import { describe, expect, it } from 'vitest';
import { validateShipmentForm, type ShipmentFormValues } from '@/lib/shipment-form-validation';

const base: ShipmentFormValues = {
  trackingNo: 'GT175001002',
  billAmount: 100,
  branchId: 'branch-1',
  branchRequired: true,
  assigner: { customerId: 'self', contactEmail: '', contactPhone: '' },
  senderAddress: {},
  recipientAddress: {},
  existingTrackingNumbers: [],
};

function validate(overrides: Partial<ShipmentFormValues> = {}) {
  return validateShipmentForm({ ...base, ...overrides });
}

describe('validateShipmentForm', () => {
  it('accepts a valid shipment', () => {
    expect(validate()).toEqual({});
  });

  describe('tracking number', () => {
    it('requires a tracking number', () => {
      expect(validate({ trackingNo: '   ' }).trackingNo).toBe('Tracking number is required');
    });

    it('rejects numbers shorter than 3 characters', () => {
      expect(validate({ trackingNo: 'AB' }).trackingNo).toBe(
        'Tracking number must be at least 3 characters',
      );
    });

    it('rejects invalid characters', () => {
      expect(validate({ trackingNo: 'GT#001' }).trackingNo).toBe(
        'Use letters, numbers, spaces, -, _, / or . only',
      );
    });

    it('flags duplicates case-insensitively', () => {
      expect(
        validate({ trackingNo: 'gt175001002', existingTrackingNumbers: ['GT175001002'] })
          .trackingNo,
      ).toBe('This tracking number is already in the list');
    });

    it('trims surrounding whitespace before validating', () => {
      expect(validate({ trackingNo: '  GT175001002  ' })).toEqual({});
    });
  });

  describe('bill amount', () => {
    it('requires a positive amount', () => {
      expect(validate({ billAmount: 0 }).billAmount).toBe('Enter a bill amount greater than 0');
      expect(validate({ billAmount: -5 }).billAmount).toBe('Enter a bill amount greater than 0');
      expect(validate({ billAmount: Number.NaN }).billAmount).toBe(
        'Enter a bill amount greater than 0',
      );
    });

    it('rejects unrealistic amounts', () => {
      expect(validate({ billAmount: 100_000_001 }).billAmount).toBe('Bill amount looks too large');
    });
  });

  describe('branch', () => {
    it('requires a branch when the user can choose one', () => {
      expect(validate({ branchId: '' }).branchId).toBe('Please select a branch');
    });

    it('does not require a branch for staff users', () => {
      expect(validate({ branchId: '', branchRequired: false })).toEqual({});
    });
  });

  describe('customer and contact details', () => {
    it('requires a customer or contact details', () => {
      expect(
        validate({ assigner: { customerId: null, contactEmail: '', contactPhone: '' } }).customerId,
      ).toBe('Assign a customer or provide an email or phone');
    });

    it('accepts manual email without a linked customer', () => {
      const errors = validate({
        assigner: { customerId: null, contactEmail: 'customer@example.com', contactPhone: '' },
      });
      expect(errors).toEqual({});
    });

    it('accepts manual phone without a linked customer', () => {
      const errors = validate({
        assigner: { customerId: null, contactEmail: '', contactPhone: '+91 9876543210' },
      });
      expect(errors).toEqual({});
    });

    it('accepts the self option without contact details', () => {
      expect(
        validate({ assigner: { customerId: 'self', contactEmail: '', contactPhone: '' } }),
      ).toEqual({});
    });

    it('rejects an invalid email', () => {
      expect(
        validate({
          assigner: { customerId: null, contactEmail: 'not-an-email', contactPhone: '' },
        }).contactEmail,
      ).toBe('Enter a valid email address');
    });

    it('rejects a phone without a country code', () => {
      expect(
        validate({
          assigner: { customerId: null, contactEmail: '', contactPhone: '9876543210' },
        }).contactPhone,
      ).toBe('Phone must start with + and country code (e.g. +91 9876543210)');
    });

    it('rejects a phone with too few digits', () => {
      expect(
        validate({
          assigner: { customerId: null, contactEmail: '', contactPhone: '+91 123' },
        }).contactPhone,
      ).toBe('Phone must start with + and country code (e.g. +91 9876543210)');
    });
  });

  describe('addresses', () => {
    it('validates sender and recipient email, phone and pincode', () => {
      const errors = validate({
        senderAddress: { email: 'bad', phone: '12345', pincode: '!' },
        recipientAddress: { email: 'bad', phone: '+91 9876543210', pincode: '123456' },
      });

      expect(errors['sender.email']).toBe('Enter a valid email address');
      expect(errors['sender.phone']).toBe(
        'Phone must start with + and country code (e.g. +91 9876543210)',
      );
      expect(errors['sender.pincode']).toBe(
        'Pincode must be 2–20 letters, numbers, spaces or hyphens',
      );
      expect(errors['recipient.email']).toBe('Enter a valid email address');
      expect(errors['recipient.phone']).toBeUndefined();
      expect(errors['recipient.pincode']).toBeUndefined();
    });
  });
});
