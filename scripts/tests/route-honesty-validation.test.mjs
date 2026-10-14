import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertIncompleteRouteHonesty,
  INCOMPLETE_ADMIN_ROUTE_IDS,
  SCHEDULING_CHECKOUT_ROUTE_ID,
} from '../lib/route-honesty-validation.mjs';

const placeholderRouteIds = [SCHEDULING_CHECKOUT_ROUTE_ID, ...INCOMPLETE_ADMIN_ROUTE_IDS];

function fixture() {
  return {
    manifest: {
      capabilities: [],
      surfaces: {
        server: { routes: [...placeholderRouteIds] },
        ai: { skills: [] },
      },
    },
    handoff: {
      items: [
        ...placeholderRouteIds.map((manifestId) => ({
          manifestId,
          status: 'unsupported',
          blocking: false,
        })),
      ],
      routeContracts: placeholderRouteIds.map((routeId) => ({
        routeId,
        launchGate: 'blocked until the workflow has a persisted implementation',
        responseSchema: '501 Cedros not_implemented error envelope.',
        errorCodes: ['not_implemented'],
      })),
    },
  };
}

test('accepts explicitly unavailable placeholder contracts', () => {
  const { manifest, handoff } = fixture();
  assert.doesNotThrow(() => assertIncompleteRouteHonesty(manifest, handoff));
});

test('rejects a callable launch gate for a placeholder', () => {
  const { manifest, handoff } = fixture();
  handoff.routeContracts[0].launchGate = 'staging';
  assert.throws(
    () => assertIncompleteRouteHonesty(manifest, handoff),
    /placeholder cannot use callable launch gate staging/,
  );
});

test('rejects a successful response promise for a placeholder', () => {
  const { manifest, handoff } = fixture();
  handoff.routeContracts[0].responseSchema = '200 JSON returns list';
  assert.throws(
    () => assertIncompleteRouteHonesty(manifest, handoff),
    /responseSchema must begin with 501/,
  );
});

test('rejects a placeholder contract without not_implemented', () => {
  const { manifest, handoff } = fixture();
  handoff.routeContracts[0].errorCodes = ['not_found'];
  assert.throws(
    () => assertIncompleteRouteHonesty(manifest, handoff),
    /placeholder must declare not_implemented/,
  );
});

test('rejects scheduling checkout capability advertising', () => {
  const { manifest, handoff } = fixture();
  manifest.capabilities.push({
    id: 'cedros-pay:checkout',
    requestedScopes: [{ resource: 'POST /paywall/v1/scheduling/checkout' }],
  });
  assert.throws(
    () => assertIncompleteRouteHonesty(manifest, handoff),
    /advertises unavailable scheduling checkout/,
  );
});

test('allows AI documentation for implemented dispute workflows', () => {
  const { manifest, handoff } = fixture();
  manifest.surfaces.ai.skills.push({
    id: 'cedros-pay:admin',
    docs: { markdown: 'Use the admin API for disputes.' },
  });
  assert.doesNotThrow(() => assertIncompleteRouteHonesty(manifest, handoff));
});

test('allows AI documentation for implemented return workflows', () => {
  const { manifest, handoff } = fixture();
  manifest.surfaces.ai.skills.push({
    id: 'cedros-pay:admin',
    docs: { markdown: 'List and manage customer return requests.' },
  });
  assert.doesNotThrow(() => assertIncompleteRouteHonesty(manifest, handoff));
});

test('rejects a standalone sidecar in extension-only handoff', () => {
  const { manifest, handoff } = fixture();
  handoff.items.push({ manifestId: 'cedros-pay:standalone-sidecar', type: 'sidecar service' });
  assert.throws(() => assertIncompleteRouteHonesty(manifest, handoff), /must not advertise a standalone sidecar/);
});
