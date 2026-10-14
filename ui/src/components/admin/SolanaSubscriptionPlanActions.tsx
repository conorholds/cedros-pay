import type { SolanaSubscriptionPlanConfig } from './types';

/** Wallet owns signing/submission; no plan-management binding is published yet. */
export function SolanaSubscriptionPlanActions({ config }: { config: SolanaSubscriptionPlanConfig }) {
  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="cedros-data-label cedros-admin__field-label">On-chain plan management</div>
      <p role="status">
        On-chain plan changes are unavailable until Cedros Wallet supports this workflow.
        Saved plan configuration remains available below.
      </p>
      {(['monthly', 'annual'] as const).map((interval) => (
        <div key={interval} style={{ marginTop: '0.75rem' }}>
          <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{interval} plan</div>
          <div style={{ fontSize: 12 }}>
            {(interval === 'annual' ? config.annualPlanAddress : config.monthlyPlanAddress) || 'No plan address saved'}
          </div>
          {['Create', 'Update', 'Delete'].map((action) => (
            <button
              key={action}
              type="button"
              className="cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost"
              disabled
              title="Cedros Wallet plan management is unavailable"
            >
              {action}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
