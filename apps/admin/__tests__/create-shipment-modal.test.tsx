import type { UseMutationResult } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CreateShipmentModal } from '@/components/shipments/create-shipment-modal';
import type { Branch, CreateShipmentInput, Shipment } from '@/lib/queries';

const branches = [
  {
    id: 'b1',
    name: 'Main Branch',
    phone: null,
    email: null,
    address: null,
    tenantId: 't1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
] as unknown as Branch[];

function makeMutation() {
  return {
    mutate: vi.fn(),
    isPending: false,
  } as unknown as UseMutationResult<Shipment, Error, CreateShipmentInput>;
}

function renderModal(overrides: Partial<Parameters<typeof CreateShipmentModal>[0]> = {}) {
  const props: Parameters<typeof CreateShipmentModal>[0] = {
    isOpen: true,
    onOpenChange: vi.fn(),
    newTrackingNumber: '',
    onNewTrackingNumberChange: vi.fn(),
    billAmount: 100,
    onBillAmountChange: vi.fn(),
    selectedBranchId: 'b1',
    onSelectedBranchIdChange: vi.fn(),
    assignerData: { customerId: 'self', contactEmail: '', contactPhone: '' },
    onAssignerChange: vi.fn(),
    senderAddress: {},
    onSenderAddressChange: vi.fn(),
    recipientAddress: {},
    onRecipientAddressChange: vi.fn(),
    errors: {},
    onErrorsChange: vi.fn(),
    clearError: vi.fn(),
    shipmentRows: [],
    allCustomers: [],
    branches,
    effectiveTenantId: 't1',
    phoneDialCode: '+91',
    phoneFlag: '🇮🇳',
    isSuperAdmin: false,
    isTenantAdmin: true,
    onResetBranch: vi.fn(),
    createShipment: makeMutation(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };

  return { ...render(<CreateShipmentModal {...props} />), props };
}

function submitForm() {
  const form = document.getElementById('create-form');
  if (!form) throw new Error('create form not found');
  fireEvent.submit(form);
}

describe('CreateShipmentModal validation', () => {
  it('shows errors immediately after a field is blurred', () => {
    renderModal({ newTrackingNumber: 'AB' });

    const tracking = screen.getByLabelText(/tracking number/i);
    fireEvent.blur(tracking);

    expect(screen.getByText('Tracking number must be at least 3 characters')).toBeTruthy();
  });

  it('clears a shown error when the value becomes valid', () => {
    const { rerender, props } = renderModal({ newTrackingNumber: 'AB' });

    fireEvent.blur(screen.getByLabelText(/tracking number/i));
    expect(screen.getByText('Tracking number must be at least 3 characters')).toBeTruthy();

    rerender(<CreateShipmentModal {...props} newTrackingNumber="GT175001002" />);

    expect(screen.queryByText('Tracking number must be at least 3 characters')).toBeNull();
  });

  it('blocks submit and shows a summary for invalid input', () => {
    const createShipment = makeMutation();
    renderModal({ newTrackingNumber: '', billAmount: 0, createShipment });

    submitForm();

    expect(screen.getByRole('alert').textContent).toContain('Please fix');
    expect(screen.getByText('Tracking number is required')).toBeTruthy();
    expect(screen.getByText('Enter a bill amount greater than 0')).toBeTruthy();
    expect(createShipment.mutate).not.toHaveBeenCalled();
  });

  it('submits valid input', () => {
    const createShipment = makeMutation();
    renderModal({ newTrackingNumber: 'GT175001002', createShipment });

    submitForm();

    expect(createShipment.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ trackingNo: 'GT175001002', billAmount: 100, branchId: 'b1' }),
      expect.anything(),
    );
  });
});
