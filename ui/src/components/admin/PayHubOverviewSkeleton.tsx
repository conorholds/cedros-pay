/**
 * First-paint skeleton for the Pay hub overview.
 *
 * Workbench requires route skeletons to mirror the real layout rather than show
 * a generic spinner, so this matches the settled page block for block: launch
 * summary, two metric tiles, and the workflow report. It renders only on first
 * load — a refresh keeps the last good content and marks it busy instead.
 */

export function PayHubOverviewSkeleton({ label }: { label: string }) {
  return (
    <div
      className="cedros-data-stack cedros-admin__settings"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <span className="cedros-admin__visually-hidden">{label}</span>
      <div className="cedros-data-card cedros-admin__launch" aria-hidden="true">
        <div className="cedros-admin__loading-skeleton cedros-admin__skeleton--launch">
          <span />
          <span />
        </div>
      </div>
      <div className="cedros-data-card cedros-admin__activity" aria-hidden="true">
        <div className="cedros-admin__loading-skeleton">
          <span />
        </div>
        <div className="cedros-data-summary-grid">
          <div className="cedros-data-metric cedros-admin__skeleton-metric">
            <div className="cedros-admin__loading-skeleton">
              <span />
              <span />
            </div>
          </div>
          <div className="cedros-data-metric cedros-admin__skeleton-metric">
            <div className="cedros-admin__loading-skeleton">
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
      <div className="cedros-data-card cedros-admin__overview-features" aria-hidden="true">
        <div className="cedros-admin__field-group-header">
          <div className="cedros-admin__loading-skeleton cedros-admin__skeleton--features">
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
