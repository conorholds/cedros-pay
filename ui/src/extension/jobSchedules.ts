import type { CedrosExtensionJobScheduleManifest } from './types';

export const cedrosPayJobSchedules: CedrosExtensionJobScheduleManifest[] = [
  schedule('cedros-pay:schedule-sanctions-refresh', 'cedros-pay:sanctions-refresh', 'Sanctions refresh', '15 2 * * *', 300),
  schedule('cedros-pay:schedule-sanctions-sweep', 'cedros-pay:sanctions-sweep', 'Sanctions sweep', '45 2 * * *', 600),
  schedule('cedros-pay:schedule-balance-alert', 'cedros-pay:balance-alert', 'Balance alert', '0 * * * *', 120),
  schedule('cedros-pay:schedule-health-check', 'cedros-pay:health-check', 'Health check', '*/5 * * * *', 60),
  schedule('cedros-pay:schedule-cleanup', 'cedros-pay:cleanup', 'Cleanup', '*/5 * * * *', 600, true, true),
  schedule('cedros-pay:schedule-email', 'cedros-pay:email', 'Email queue', '* * * * *', 120),
  schedule('cedros-pay:schedule-stats-rollup', 'cedros-pay:stats-rollup', 'Stats rollup', '30 0 * * *', 120),
  schedule('cedros-pay:schedule-catalog-sync', 'cedros-pay:catalog-sync', 'Stripe catalog sync', '*/5 * * * *', 300, true, true),
  schedule('cedros-pay:schedule-subscription-sync', 'cedros-pay:subscription-sync', 'Subscription sync', '*/15 * * * *', 300, true, true),
  schedule('cedros-pay:schedule-webhook-delivery', 'cedros-pay:webhook-delivery', 'Webhook delivery', '* * * * *', 120, true, true),
  schedule('cedros-pay:schedule-x402-reconcile', 'cedros-pay:x402-reconcile', 'x402 reconcile', '*/5 * * * *', 180),
];

export function cloneCedrosPayJobSchedules(): CedrosExtensionJobScheduleManifest[] {
  return cedrosPayJobSchedules.map((item) => ({ ...item }));
}

function schedule(
  id: string,
  jobId: string,
  label: string,
  expression: string,
  timeoutSeconds: number,
  enabled = false,
  autoCreateOnEnable = false,
): CedrosExtensionJobScheduleManifest {
  return {
    id,
    jobId,
    label,
    enabled,
    cron: expression,
    timeoutSeconds,
    maxRetries: 0,
    ...(autoCreateOnEnable ? { autoCreateOnEnable: true } : {}),
  };
}
