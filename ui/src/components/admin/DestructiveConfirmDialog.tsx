import { useId } from 'react';
import { AdminDialog } from './AdminDialog';

interface DestructiveConfirmDialogProps {
  confirmLabel: string;
  confirmingLabel?: string;
  impact: string;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}

export function DestructiveConfirmDialog({
  confirmLabel,
  confirmingLabel = 'Deleting…',
  impact,
  isConfirming = false,
  onCancel,
  onConfirm,
  title,
}: DestructiveConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <AdminDialog
      labelledBy={titleId}
      describedBy={descriptionId}
      onClose={isConfirming ? () => undefined : onCancel}
    >
      <div className="cedros-data-dialog__heading cedros-admin__section-header">
        <h3 id={titleId} className="cedros-data-dialog__title cedros-admin__section-title">
          {title}
        </h3>
      </div>
      <div id={descriptionId} className="cedros-data-dialog__body cedros-admin__modal-body">
        <p>{impact}</p>
        <p>This action cannot be undone.</p>
      </div>
      <div className="cedros-data-actions cedros-admin__modal-footer">
        <button
          type="button"
          className="cedros-data-btn cedros-data-btn--secondary cedros-admin__button"
          onClick={onCancel}
          disabled={isConfirming}
        >
          Cancel
        </button>
        <button
          type="button"
          className="cedros-data-btn cedros-data-btn--danger cedros-admin__button cedros-admin__button--danger"
          onClick={onConfirm}
          disabled={isConfirming}
        >
          {isConfirming ? confirmingLabel : confirmLabel}
        </button>
      </div>
    </AdminDialog>
  );
}
