'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Button, Input, ListBox, Modal, NumberField, Select } from '@heroui/react';
import { CustomerAssigner } from '@/components/customer-assigner';
import { AddressForm, type AddressData } from '@/components/address-form';
import type { Branch, CreateShipmentInput, Customer, Shipment } from '@/lib/queries';

export interface AssignerData {
  customerId: string | null;
  contactEmail: string;
  contactPhone: string;
}

interface CreateShipmentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newTrackingNumber: string;
  onNewTrackingNumberChange: (value: string) => void;
  billAmount: number;
  onBillAmountChange: (value: number) => void;
  selectedBranchId: string;
  onSelectedBranchIdChange: (value: string) => void;
  assignerData: AssignerData;
  onAssignerChange: (data: AssignerData) => void;
  senderAddress: AddressData;
  onSenderAddressChange: (value: AddressData) => void;
  recipientAddress: AddressData;
  onRecipientAddressChange: (value: AddressData) => void;
  errors: Record<string, string>;
  onErrorsChange: Dispatch<SetStateAction<Record<string, string>>>;
  clearError: (field: string) => void;
  shipmentRows: Shipment[];
  allCustomers: Customer[];
  branches: Branch[];
  effectiveTenantId: string;
  phoneDialCode: string;
  phoneFlag: string;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  onResetBranch: () => void;
  createShipment: UseMutationResult<Shipment, Error, CreateShipmentInput>;
  onSuccess: (trackingNo: string) => void;
  onError: (message: string) => void;
}

export function CreateShipmentModal({
  isOpen,
  onOpenChange,
  newTrackingNumber,
  onNewTrackingNumberChange,
  billAmount,
  onBillAmountChange,
  selectedBranchId,
  onSelectedBranchIdChange,
  assignerData,
  onAssignerChange,
  senderAddress,
  onSenderAddressChange,
  recipientAddress,
  onRecipientAddressChange,
  errors,
  onErrorsChange,
  clearError,
  shipmentRows,
  allCustomers,
  branches,
  effectiveTenantId,
  phoneDialCode,
  phoneFlag,
  isSuperAdmin,
  isTenantAdmin,
  onResetBranch,
  createShipment,
  onSuccess,
  onError,
}: CreateShipmentModalProps) {
  const branchVisible = isSuperAdmin || isTenantAdmin;

  function handleClose() {
    onOpenChange(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onErrorsChange({});
    if ((document.getElementById('hp-create') as HTMLInputElement)?.value) return;

    const newErrors: Record<string, string> = {};
    const trackingNo = newTrackingNumber.trim();

    if (!trackingNo) newErrors.trackingNo = 'Tracking number is required';
    else {
      const dup = shipmentRows.find((s) => s.trackingNo.toLowerCase() === trackingNo.toLowerCase());
      if (dup) newErrors.trackingNo = `Already exists (${dup.id.slice(0, 8)}...)`;
    }

    if (!billAmount || billAmount <= 0) newErrors.billAmount = 'Bill amount is required and must be positive';
    if (branchVisible && !selectedBranchId) newErrors.branchId = 'Please select a branch';

    const hasCustomer = assignerData.customerId !== null && assignerData.customerId !== '';
    const hasContact = assignerData.contactEmail.trim() !== '' || assignerData.contactPhone.trim() !== '';
    if (!hasCustomer && !hasContact) {
      newErrors.customerId = 'Assign a customer or provide contact details';
    }

    if (Object.keys(newErrors).length > 0) {
      onErrorsChange(newErrors);
      return;
    }

    const customerId = assignerData.customerId === 'self' ? undefined : assignerData.customerId;
    createShipment.mutate(
      {
        trackingNo,
        billAmount: billAmount || undefined,
        branchId: selectedBranchId || undefined,
        customerId,
        contactEmail: assignerData.contactEmail || undefined,
        contactPhone: assignerData.contactPhone || undefined,
        senderAddress,
        recipientAddress,
        tenantId: effectiveTenantId || undefined,
      },
      {
        onSuccess: (data) => {
          onSuccess(data.trackingNo);
          onResetBranch();
        },
        onError: (err) => onError(err instanceof Error ? err.message : 'Unknown error'),
      },
    );
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(v: boolean) => { if (!v) handleClose(); }}>
      <Modal.Container>
        <Modal.Dialog aria-label="New Shipment" className="max-w-2xl">
          <Modal.Header>
            <h2 className="text-lg font-semibold tracking-tight">New Shipment</h2>
            <p className="text-xs text-muted mt-0.5">All fields on one form — addresses optional</p>
          </Modal.Header>
          <Modal.Body className="max-h-[70vh] overflow-y-auto">
            <form id="create-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="hp-create">Leave empty</label>
                <input id="hp-create" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <section className="space-y-3">
                <p className="ops-label">Shipment</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label htmlFor="new-trackingNo" className="text-xs font-medium text-muted">Tracking Number *</label>
                    <Input
                      id="new-trackingNo"
                      variant="secondary"
                      placeholder="e.g. GT175001002"
                      value={newTrackingNumber}
                      onChange={(e) => {
                        onNewTrackingNumberChange(e.target.value.trimStart());
                        clearError('trackingNo');
                      }}
                      required
                    />
                    {errors.trackingNo && <p className="text-xs text-danger">{errors.trackingNo}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label htmlFor="new-billAmount" className="text-xs font-medium text-muted">Bill Amount *</label>
                    <NumberField.Root
                      aria-label="Bill amount"
                      variant="secondary"
                      fullWidth
                      value={billAmount}
                      onChange={(v) => {
                        onBillAmountChange(v);
                        clearError('billAmount');
                      }}
                    >
                      <NumberField.Group>
                        <NumberField.DecrementButton />
                        <NumberField.Input id="new-billAmount" placeholder="0.00" />
                        <NumberField.IncrementButton />
                      </NumberField.Group>
                    </NumberField.Root>
                    {errors.billAmount && <p className="text-xs text-danger">{errors.billAmount}</p>}
                  </div>
                </div>
                {branchVisible && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted">Branch *</label>
                    <Select
                      selectedKey={selectedBranchId}
                      onSelectionChange={(k) => {
                        onSelectedBranchIdChange(k as string);
                        clearError('branchId');
                      }}
                      placeholder="Select branch"
                      variant="secondary"
                      aria-label="Select branch"
                    >
                      <Select.Trigger className={`h-10 text-sm ${errors.branchId ? 'border-danger' : ''}`}>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {branches
                            .filter((b) => b.tenantId === effectiveTenantId)
                            .map((b) => (
                              <ListBox.Item key={b.id} id={b.id} textValue={b.name}>
                                {b.name}
                              </ListBox.Item>
                            ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    {errors.branchId && <p className="text-xs text-danger">{errors.branchId}</p>}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <p className="ops-label">Customer</p>
                <CustomerAssigner
                  customers={allCustomers}
                  customerId={assignerData.customerId ?? ''}
                  onChange={onAssignerChange}
                  phoneDialCode={phoneDialCode}
                  phoneFlag={phoneFlag}
                  clearError={() => clearError('customerId')}
                  errors={errors}
                />
                {!assignerData.customerId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="manual-email" className="text-xs font-medium text-muted">Email</label>
                      <Input
                        id="manual-email"
                        variant="secondary"
                        type="email"
                        placeholder="customer@example.com"
                        value={assignerData.contactEmail}
                        onChange={(e) => onAssignerChange({ ...assignerData, contactEmail: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="manual-phone" className="text-xs font-medium text-muted">Phone</label>
                      <div className="flex">
                        <div className="flex items-center gap-1 px-2.5 border border-r-0 border-border rounded-l-lg bg-muted/10 text-xs text-muted font-medium shrink-0">
                          {phoneFlag && <span>{phoneFlag}</span>}
                          {phoneDialCode}
                        </div>
                        <Input
                          id="manual-phone"
                          variant="secondary"
                          type="tel"
                          placeholder="Phone number"
                          value={assignerData.contactPhone.replace(phoneDialCode, '').trim()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            onAssignerChange({
                              ...assignerData,
                              contactPhone: raw ? `${phoneDialCode} ${raw}` : '',
                            });
                          }}
                          className="rounded-l-none border-l-0 flex-1 min-w-0 [&_input]:rounded-l-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <p className="ops-label">Sender Address</p>
                <AddressForm prefix="sender" value={senderAddress} onChange={onSenderAddressChange} showCountry={false} />
              </section>

              <section className="space-y-3">
                <p className="ops-label">Recipient Address</p>
                <AddressForm prefix="recipient" value={recipientAddress} onChange={onRecipientAddressChange} showContact />
              </section>
            </form>
          </Modal.Body>
          <Modal.Footer className="flex gap-2">
            <Button variant="secondary" onPress={handleClose}>Cancel</Button>
            <Button type="submit" form="create-form" isPending={createShipment.isPending} isDisabled={!newTrackingNumber}>
              Create Shipment
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
