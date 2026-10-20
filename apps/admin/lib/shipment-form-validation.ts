export interface ShipmentFormAddress {
  name?: string;
  phone?: string;
  email?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface ShipmentFormAssigner {
  customerId: string | null;
  contactEmail: string;
  contactPhone: string;
}

export interface ShipmentFormValues {
  trackingNo: string;
  billAmount: number;
  branchId: string;
  branchRequired: boolean;
  assigner: ShipmentFormAssigner;
  senderAddress: ShipmentFormAddress;
  recipientAddress: ShipmentFormAddress;
  /** Tracking numbers already loaded in the table, used for a best-effort duplicate check. */
  existingTrackingNumbers?: string[];
}

export type ShipmentFormErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TRACKING_RE = /^[A-Za-z0-9][A-Za-z0-9 _./-]*$/;
const PHONE_RE = /^\+[\d\s-]+$/;
const PINCODE_RE = /^[A-Za-z0-9][A-Za-z0-9 -]{1,19}$/;

const MAX_TRACKING_LENGTH = 64;
const MAX_BILL_AMOUNT = 100_000_000;

function validateEmail(value: string | undefined, label: string): string | undefined {
  const email = value?.trim();
  if (!email) return undefined;
  if (!EMAIL_RE.test(email)) return `Enter a valid ${label.toLowerCase()}`;
  return undefined;
}

function validatePhone(value: string | undefined, label: string): string | undefined {
  const phone = value?.trim();
  if (!phone) return undefined;

  const digits = phone.replace(/\D/g, '');
  if (!PHONE_RE.test(phone) || digits.length < 6 || digits.length > 15) {
    return `${label} must start with + and country code (e.g. +91 9876543210)`;
  }
  return undefined;
}

function validateAddress(
  prefix: 'sender' | 'recipient',
  address: ShipmentFormAddress,
  errors: ShipmentFormErrors,
) {
  const emailError = validateEmail(address.email, 'email address');
  if (emailError) errors[`${prefix}.email`] = emailError;

  const phoneError = validatePhone(address.phone, 'Phone');
  if (phoneError) errors[`${prefix}.phone`] = phoneError;

  const pincode = address.pincode?.trim();
  if (pincode && !PINCODE_RE.test(pincode)) {
    errors[`${prefix}.pincode`] = 'Pincode must be 2–20 letters, numbers, spaces or hyphens';
  }
}

export function validateShipmentForm(values: ShipmentFormValues): ShipmentFormErrors {
  const errors: ShipmentFormErrors = {};
  const trackingNo = values.trackingNo.trim();

  if (!trackingNo) {
    errors.trackingNo = 'Tracking number is required';
  } else if (trackingNo.length < 3) {
    errors.trackingNo = 'Tracking number must be at least 3 characters';
  } else if (trackingNo.length > MAX_TRACKING_LENGTH) {
    errors.trackingNo = `Tracking number must be ${MAX_TRACKING_LENGTH} characters or fewer`;
  } else if (!TRACKING_RE.test(trackingNo)) {
    errors.trackingNo = 'Use letters, numbers, spaces, -, _, / or . only';
  } else {
    const duplicate = values.existingTrackingNumbers?.some(
      (existing) => existing.toLowerCase() === trackingNo.toLowerCase(),
    );
    if (duplicate) errors.trackingNo = 'This tracking number is already in the list';
  }

  if (!Number.isFinite(values.billAmount) || values.billAmount <= 0) {
    errors.billAmount = 'Enter a bill amount greater than 0';
  } else if (values.billAmount > MAX_BILL_AMOUNT) {
    errors.billAmount = 'Bill amount looks too large';
  }

  if (values.branchRequired && !values.branchId) {
    errors.branchId = 'Please select a branch';
  }

  const { customerId, contactEmail, contactPhone } = values.assigner;
  const email = contactEmail?.trim() ?? '';
  const phone = contactPhone?.trim() ?? '';
  const hasCustomer = customerId !== null && customerId !== '';

  if (!hasCustomer && !email && !phone) {
    errors.customerId = 'Assign a customer or provide an email or phone';
  }

  const emailError = validateEmail(email, 'email address');
  if (emailError) errors.contactEmail = emailError;

  const phoneError = validatePhone(phone, 'Phone');
  if (phoneError) errors.contactPhone = phoneError;

  validateAddress('sender', values.senderAddress, errors);
  validateAddress('recipient', values.recipientAddress, errors);

  return errors;
}
