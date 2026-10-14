import { assert } from './validation-helpers.mjs';

export const SCHEDULING_CHECKOUT_ROUTE_ID = 'cedros-pay:checkout';
export const SCHEDULING_CHECKOUT_PATH = '/paywall/v1/scheduling/checkout';
export const INCOMPLETE_ADMIN_ROUTE_IDS = [];

const callableLaunchGate = /\b(staging|production|ready|self-serve)\b/i;

/**
 * Reject metadata that presents known fail-closed placeholder routes as working.
 * Remove a route from this list once it has a persisted implementation and tests.
 */
export function assertIncompleteRouteHonesty(manifest, handoff) {
  assertSchedulingIsNotAdvertised(manifest);

  const routeIds = new Set(manifest.surfaces?.server?.routes ?? []);
  const handoffItems = new Map(
    (handoff.items ?? []).map((item) => [item.manifestId, item]),
  );
  const contracts = new Map(
    (handoff.routeContracts ?? []).map((contract) => [contract.routeId, contract]),
  );
  const placeholderRouteIds = [SCHEDULING_CHECKOUT_ROUTE_ID, ...INCOMPLETE_ADMIN_ROUTE_IDS];

  for (const routeId of placeholderRouteIds) {
    if (!routeIds.has(routeId)) {
      assert(!contracts.has(routeId), `${routeId} has handoff metadata but is not declared`);
      continue;
    }
    const contract = contracts.get(routeId);
    assert(contract, `${routeId} needs an explicit unavailable handoff contract`);
    assertUnavailableContract(contract, routeId);
    const handoffItem = handoffItems.get(routeId);
    assert(handoffItem, `${routeId} needs an unsupported handoff row`);
    assert(
      handoffItem.status === 'unsupported' && handoffItem.blocking === false,
      `${routeId} handoff row must be unsupported and non-blocking`,
    );
  }

  assert(!handoffItems.has('cedros-pay:standalone-sidecar'),
    'extension-only handoff must not advertise a standalone sidecar');
}

function assertSchedulingIsNotAdvertised(manifest) {
  const schedulingPattern = /scheduling|held reservation|reservation-scoped/i;
  const capabilities = [
    ...(manifest.capabilities ?? []),
    ...(manifest.surfaces?.ai?.capabilities ?? []),
  ];
  for (const capability of capabilities) {
    const metadata = JSON.stringify(capability);
    if (
      capability.id !== SCHEDULING_CHECKOUT_ROUTE_ID
      && !metadata.includes(SCHEDULING_CHECKOUT_PATH)
    ) {
      continue;
    }
    assert(
      !metadata.includes(SCHEDULING_CHECKOUT_PATH) && !schedulingPattern.test(metadata),
      `${capability.id ?? 'manifest capability'} advertises unavailable scheduling checkout`,
    );
  }

  for (const skill of manifest.surfaces?.ai?.skills ?? []) {
    const docs = skill.docs?.markdown ?? '';
    assert(
      !docs.includes(SCHEDULING_CHECKOUT_PATH),
      `${skill.id} AI docs advertise unavailable scheduling checkout`,
    );
  }
}

function assertUnavailableContract(contract, routeId) {
  assert(
    !callableLaunchGate.test(contract.launchGate ?? ''),
    `${routeId} placeholder cannot use callable launch gate ${contract.launchGate}`,
  );
  assert(
    /^\s*(?:HTTP\s+)?501\b/i.test(contract.responseSchema ?? ''),
    `${routeId} placeholder responseSchema must begin with 501`,
  );
  assert(
    !/\b200\b/.test(contract.responseSchema ?? ''),
    `${routeId} placeholder responseSchema cannot promise 200`,
  );
  assert(
    (contract.errorCodes ?? []).includes('not_implemented'),
    `${routeId} placeholder must declare not_implemented`,
  );
}
