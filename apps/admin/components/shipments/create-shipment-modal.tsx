'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Button, Input, ListBox, Modal, NumberField, Select } from '@heroui/react';
import { CustomerAssigner } from '@/components/customer-assigner';
import { AddressForm, type AddressData } from '@/components/address-form';
import type { Branch, CreateShipmentInput, Customer, Shipment } from '@/lib/queries';
import { validateShipmentForm } from '@/lib/shipment-form-validation';

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

const FIELD_IDS: Record<string, string> = {
  trackingNo: 'new-trackingNo',
  billAmount: 'new-billAmount',
  branchId: 'new-branchId',
  customerId: 'customer-assigner-input',
  contactEmail: 'contact-email-input',
  contactPhone: 'contact-phone-input',
  'sender.email': 'sender-email',
  'sender.phone': 'sender-phone',
  'sender.pincode': 'sender-pincode',
  'recipient.email': 'recipient-email',
  'recipient.phone': 'recipient-phone',
  'recipient.pincode': 'recipient-pincode',
};

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

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Reset validation UI whenever the modal closes so a new shipment starts clean.
  useEffect(() => {
    if (!isOpen) {
      setTouched({});
      setSubmitAttempted(false);
    }
  }, [isOpen]);

  const liveErrors = useMemo(
    () =>
      validateShipmentForm({
        trackingNo: newTrackingNumber,
        billAmount,
        branchId: selectedBranchId,
        branchRequired: branchVisible,
        assigner: assignerData,
        senderAddress,
        recipientAddress,
        existingTrackingNumbers: shipmentRows.map((shipment) => shipment.trackingNo),
      }),
    [
      newTrackingNumber,
      billAmount,
      selectedBranchId,
      branchVisible,
      assignerData,
      senderAddress,
      recipientAddress,
      shipmentRows,
    ],
  );

  // A field shows its error once it has been blurred, its section has been
  // touched, or the user has tried to submit. Once shown it updates on every
  // keystroke, so corrections clear the message immediately.
  const shownErrors = useMemo(() => {
    const result: Record<string, string> = { ...errors };

    for (const [field, message] of Object.entries(liveErrors)) {
      const family = field.split('.')[0] ?? field;
      const visible =
        submitAttempted ||
        touched[field] === true ||
        touched[family] === true ||
        (field === 'customerId' &&
          (touched.contactEmail === true || touched.contactPhone === true));

      if (visible) result[field] = message;
    }

    return result;
  }, [errors, liveErrors, touched, submitAttempted]);

  const errorCount = Object.keys(liveErrors).length;

  function markTouched(field: string) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  function handleClose() {
    onOpenChange(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    onErrorsChange({});
    if ((document.getElementById('hp-create') as HTMLInputElement)?.value) return;

    const firstInvalidField = Object.keys(liveErrors)[0];
    if (firstInvalidField) {
      const targetId = FIELD_IDS[firstInvalidField];
      if (targetId) document.getElementById(targetId)?.focus();
      return;
    }

    const trackingNo = newTrackingNumber.trim();
    const customerId =
      assignerData.customerId && assignerData.customerId !== 'self'
        ? assignerData.customerId
        : undefined;

    createShipment.mutate(
      {
        trackingNo,
        billAmount,
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
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(v: boolean) => {
        if (!v) handleClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog aria-label="New Shipment" className="max-w-2xl">
          <Modal.Header>
            <h2 className="text-lg font-semibold tracking-tight">New Shipment</h2>
            <p className="text-xs text-muted mt-0.5">All fields on one form — addresses optional</p>
          </Modal.Header>
          <Modal.Body className="max-h-[70vh] overflow-y-auto">
            <form id="create-form" onSubmit={handleSubmit} noValidate className="space-y-6">
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="hp-create">Leave empty</label>
                <input id="hp-create" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              {submitAttempted && errorCount > 0 && (
                <div
                  role="alert"
                  className="rounded-sm border border-danger/30 bg-danger/[0.04] px-3 py-2 text-xs text-danger-soft-foreground"
                >
                  Please fix {errorCount} {errorCount === 1 ? 'field' : 'fields'} before creating
                  this shipment.
                </div>
              )}

              <section className="space-y-3">
                <p className="ops-label">Shipment</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label htmlFor="new-trackingNo" className="text-xs font-medium text-muted">
                      Tracking Number *
                    </label>
                    <Input
                      id="new-trackingNo"
                      variant="secondary"
                      placeholder="e.g. GT175001002"
                      value={newTrackingNumber}
                      maxLength={64}
                      onChange={(e) => {
                        onNewTrackingNumberChange(e.target.value.trimStart());
                        clearError('trackingNo');
                      }}
                      onBlur={() => markTouched('trackingNo')}
                      aria-invalid={!!shownErrors.trackingNo}
                      aria-describedby={shownErrors.trackingNo ? 'new-trackingNo-error' : undefined}
                      className={shownErrors.trackingNo ? 'border-danger' : undefined}
                    />
                    {shownErrors.trackingNo && (
                      <p id="new-trackingNo-error" className="text-xs text-danger-soft-foreground">
                        {shownErrors.trackingNo}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label htmlFor="new-billAmount" className="text-xs font-medium text-muted">
                      Bill Amount *
                    </label>
                    <NumberField.Root
                      aria-label="Bill amount"
                      variant="secondary"
                      fullWidth
                      minValue={0}
                      step={0.01}
                      value={billAmount}
                      isInvalid={!!shownErrors.billAmount}
                      onChange={(v) => {
                        onBillAmountChange(v);
                        clearError('billAmount');
                      }}
                    >
                      <NumberField.Group
                        className={shownErrors.billAmount ? 'border-danger' : undefined}
                      >
                        <NumberField.DecrementButton />
                        <NumberField.Input
                          id="new-billAmount"
                          placeholder="0.00"
                          onBlur={() => markTouched('billAmount')}
                          aria-invalid={!!shownErrors.billAmount}
                          aria-describedby={
                            shownErrors.billAmount ? 'new-billAmount-error' : undefined
                          }
                        />
                        <NumberField.IncrementButton />
                      </NumberField.Group>
                    </NumberField.Root>
                    {shownErrors.billAmount && (
                      <p id="new-billAmount-error" className="text-xs text-danger-soft-foreground">
                        {shownErrors.billAmount}
                      </p>
                    )}
                  </div>
                </div>
                {branchVisible && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted">Branch *</span>
                    <Select
                      selectedKey={selectedBranchId}
                      onSelectionChange={(k) => {
                        onSelectedBranchIdChange(k as string);
                        markTouched('branchId');
                        clearError('branchId');
                      }}
                      placeholder="Select branch"
                      variant="secondary"
                      aria-label="Select branch"
                    >
                      <Select.Trigger
                        id="new-branchId"
                        className={`h-10 text-sm ${shownErrors.branchId ? 'border-danger' : ''}`}
                        aria-invalid={!!shownErrors.branchId}
                        aria-describedby={shownErrors.branchId ? 'new-branchId-error' : undefined}
                      >
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
                    {shownErrors.branchId && (
                      <p id="new-branchId-error" className="text-xs text-danger-soft-foreground">
                        {shownErrors.branchId}
                      </p>
                    )}
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
                  onFieldBlur={markTouched}
                  errors={shownErrors}
                />
                {!assignerData.customerId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="contact-email-input"
                        className="text-xs font-medium text-muted"
                      >
                        Email
                      </label>
                      <Input
                        id="contact-email-input"
                        variant="secondary"
                        type="email"
                        placeholder="customer@example.com"
                        value={assignerData.contactEmail}
                        onChange={(e) =>
                          onAssignerChange({ ...assignerData, contactEmail: e.target.value })
                        }
                        onBlur={() => markTouched('contactEmail')}
                        aria-invalid={!!shownErrors.contactEmail}
                        aria-describedby={
                          shownErrors.contactEmail ? 'manual-email-error' : undefined
                        }
                        className={shownErrors.contactEmail ? 'border-danger' : undefined}
                      />
                      {shownErrors.contactEmail && (
                        <p id="manual-email-error" className="text-xs text-danger-soft-foreground">
                          {shownErrors.contactEmail}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="contact-phone-input"
                        className="text-xs font-medium text-muted"
                      >
                        Phone
                      </label>
                      <div className="flex">
                        <div className="flex items-center gap-1 px-2.5 border border-r-0 border-border rounded-l-lg bg-muted/10 text-xs text-muted font-medium shrink-0">
                          {phoneFlag && <span>{phoneFlag}</span>}
                          {phoneDialCode}
                        </div>
                        <Input
                          id="contact-phone-input"
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
                          onBlur={() => markTouched('contactPhone')}
                          aria-invalid={!!shownErrors.contactPhone}
                          aria-describedby={
                            shownErrors.contactPhone ? 'manual-phone-error' : undefined
                          }
                          className={`rounded-l-none border-l-0 flex-1 min-w-0 [&_input]:rounded-l-none ${shownErrors.contactPhone ? 'border-danger' : ''}`}
                        />
                      </div>
                      {shownErrors.contactPhone && (
                        <p id="manual-phone-error" className="text-xs text-danger-soft-foreground">
                          {shownErrors.contactPhone}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <p className="ops-label">Sender Address</p>
                <AddressForm
                  prefix="sender"
                  value={senderAddress}
                  onChange={onSenderAddressChange}
                  showCountry={false}
                  errors={shownErrors}
                  onFieldBlur={markTouched}
                />
              </section>

              <section className="space-y-3">
                <p className="ops-label">Recipient Address</p>
                <AddressForm
                  prefix="recipient"
                  value={recipientAddress}
                  onChange={onRecipientAddressChange}
                  showContact
                  errors={shownErrors}
                  onFieldBlur={markTouched}
                />
              </section>
            </form>
          </Modal.Body>
          <Modal.Footer className="flex gap-2">
            <Button variant="secondary" onPress={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-form"
              isPending={createShipment.isPending}
              isDisabled={createShipment.isPending}
            >
              Create Shipment
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
