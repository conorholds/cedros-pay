/**
 * Visible warning that an admin ledger scan stopped at its row cap, so the
 * rendered data may be partial. Rendered wherever an admin response reports
 * `truncated: true` (see `AdminPagedResponse` in ./types).
 */
export function LedgerTruncationWarning({ message }: { message: string }) {
  return (
    <div className="cedros-data-status cedros-data-status--warning cedros-admin__error-banner" role="status">
      <span>{message}</span>
    </div>
  );
}
