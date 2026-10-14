import { HOST_SERVICE_IDS, getHostService, type HostContext } from './types';

export const CEDROS_BALANCE_CREDIT_RAIL_CAPABILITIES = [
  'cedros-balance:balance-read',
] as const;

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function hasBalanceRailCapabilityGrant(
  orgContext: NonNullable<HostContext['org']> | undefined
): boolean {
  const grants = new Set([
    ...(orgContext?.permissions ?? []),
    ...(orgContext?.capabilities ?? []),
  ]);
  return CEDROS_BALANCE_CREDIT_RAIL_CAPABILITIES.every((capability) =>
    grants.has(capability)
  );
}

export function hasCedrosBalanceInstalled(hostContext: HostContext): boolean {
  const orgContext = getHostService<NonNullable<HostContext['org']>>(
    hostContext,
    HOST_SERVICE_IDS.org
  );
  const balanceContext = readRecord(
    getHostService<NonNullable<HostContext['cedrosBalance']>>(
      hostContext,
      HOST_SERVICE_IDS.cedrosBalance
    ) ?? hostContext.cedrosBalance
  );
  if (balanceContext) {
    const installed =
      readBoolean(balanceContext.installed) ?? readBoolean(balanceContext.enabled) ?? true;
    if (!installed) return false;
    return hasBalanceRailCapabilityGrant(orgContext);
  }

  return hasBalanceRailCapabilityGrant(orgContext);
}
