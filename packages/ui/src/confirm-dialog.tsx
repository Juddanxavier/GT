'use client';

import { Button } from '@heroui/react/button';
import { Modal } from '@heroui/react/modal';
import type { ReactNode } from 'react';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use `danger` for destructive actions such as delete. */
  tone?: 'default' | 'danger';
  /** Disables both actions and blocks Escape and backdrop dismissal while true. */
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/**
 * The one right way to ask for confirmation in the admin app.
 *
 * Built on the HeroUI Modal (react-aria), so it traps focus while open, closes
 * on Escape, names itself through `Modal.Heading`, and returns focus to the
 * control that opened it. The cancel button comes first in the DOM, which is
 * where react-aria places the initial focus.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal.Backdrop
      isOpen={open}
      isDismissable={!isPending}
      isKeyboardDismissDisabled={isPending}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) onCancel();
      }}
    >
      <Modal.Container>
        <Modal.Dialog aria-modal="true">
          <Modal.Header>
            <Modal.Heading>{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-muted">{description}</p>
          </Modal.Body>
          <Modal.Footer className="flex gap-2">
            <Button variant="ghost" isDisabled={isPending} onPress={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              variant={tone === 'danger' ? 'danger' : 'primary'}
              isPending={isPending}
              onPress={() => {
                void onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
