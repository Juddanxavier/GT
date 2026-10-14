'use client';

import { Button } from '@heroui/react';
import { Modal } from '@heroui/react/modal';

type FilterConfirmModalsProps = {
  confirmTenant: { id: string; name: string } | null;
  setConfirmTenant: (value: { id: string; name: string } | null) => void;
  onConfirmTenant: (id: string) => void;
  confirmBranch: { id: string; name: string } | null;
  setConfirmBranch: (value: { id: string; name: string } | null) => void;
  onConfirmBranch: (id: string) => void;
};

export function FilterConfirmModals({
  confirmTenant,
  setConfirmTenant,
  onConfirmTenant,
  confirmBranch,
  setConfirmBranch,
  onConfirmBranch,
}: FilterConfirmModalsProps) {
  return (
    <>
      <Modal.Backdrop
        isOpen={!!confirmTenant}
        onOpenChange={(open) => {
          if (!open) setConfirmTenant(null);
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="glass-panel">
            <Modal.Header>
              <Modal.Heading>Switch Tenant</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">
                Switch to <strong>{confirmTenant?.name}</strong>? Data on all pages will refresh.
              </p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="ghost" onPress={() => setConfirmTenant(null)}>Cancel</Button>
              <Button
                variant="primary"
                onPress={() => {
                  if (confirmTenant) onConfirmTenant(confirmTenant.id);
                  setConfirmTenant(null);
                }}
              >
                Switch
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop
        isOpen={!!confirmBranch}
        onOpenChange={(open) => {
          if (!open) setConfirmBranch(null);
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="glass-panel">
            <Modal.Header>
              <Modal.Heading>Switch Branch</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">
                Switch to <strong>{confirmBranch?.name}</strong>? Data on all pages will refresh.
              </p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="ghost" onPress={() => setConfirmBranch(null)}>Cancel</Button>
              <Button
                variant="primary"
                onPress={() => {
                  if (confirmBranch) onConfirmBranch(confirmBranch.id);
                  setConfirmBranch(null);
                }}
              >
                Switch
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
