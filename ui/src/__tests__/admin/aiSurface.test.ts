import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const FIXTURE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');

function readArchiveJson<T>(fileName: string): T {
  return JSON.parse(readFileSync(path.join(FIXTURE_ROOT, fileName), 'utf8')) as T;
}

describe('Cedros AI surface', () => {
  it('publishes catalog administration capabilities from the server surface', async () => {
    const registerModule = await import('../../admin/register');
    const bootstrap = registerModule.default();
    const aiSurface = bootstrap.manifest.surfaces.ai;

    expect(aiSurface?.packageRef).toBe('server');
    expect(aiSurface?.capabilities?.map((capability) => capability.id)).toEqual([
      'cedros-pay:assistant-x402-purchase',
      'cedros-pay:guarded-policy-enroll',
      'cedros-pay:catalog-records-query',
      'cedros-pay:capacity-activation-status',
      'cedros-pay:capacity-tax-readiness',
      'cedros-pay:catalog-product-upsert',
      'cedros-pay:catalog-product-active-set',
      'cedros-pay:catalog-product-delete',
      'cedros-pay:catalog-price-upsert',
      'cedros-pay:catalog-stripe-tax-code-set',
      'cedros-pay:catalog-stripe-sync',
      'cedros-pay:subscription-settings-update',
      'cedros-pay:program-entitlement-upsert',
      'cedros-pay:program-invite-upsert',
      'cedros-pay:program-membership-upsert',
    ]);
    expect(aiSurface?.capabilities?.every((capability) =>
      capability.auth?.schemes?.includes('bearer-token')
    )).toBe(true);
    expect(aiSurface?.capabilities
      ?.filter((capability) => capability.id !== 'cedros-pay:assistant-x402-purchase')
      .every((capability) => capability.visibility === 'admin')
    ).toBe(true);
    expect(
      aiSurface?.capabilities?.find(
        (capability) => capability.id === 'cedros-pay:catalog-product-active-set'
      )
    ).toMatchObject({
      kind: 'action',
      visibility: 'admin',
      endpoint: {
        method: 'POST',
        path: '/extensions/cedros-pay/admin/catalog/products/active',
      },
      inputSchema: {
        required: ['productId', 'active'],
        additionalProperties: false,
      },
    });
    expect(
      aiSurface?.capabilities?.find(
        (capability) => capability.id === 'cedros-pay:catalog-product-delete'
      )
    ).toMatchObject({
      kind: 'action',
      visibility: 'admin',
      endpoint: {
        method: 'POST',
        path: '/extensions/cedros-pay/admin/catalog/products/delete',
      },
      inputSchema: {
        required: ['productId', 'confirmed'],
        properties: { confirmed: { const: true } },
        additionalProperties: false,
      },
    });
    const assistantPurchase = aiSurface?.capabilities?.[0];
    expect(assistantPurchase).toMatchObject({
      id: 'cedros-pay:assistant-x402-purchase',
      kind: 'action',
      visibility: 'authenticated',
      endpoint: {
        method: 'POST',
        path: '/extensions/cedros-pay/assistant/v1/x402/purchase',
      },
      inputSchema: {
        required: ['resourceUrl'],
        additionalProperties: false,
      },
      outputSchema: {
        properties: { boundary: { const: 'cedros_pay_x402_purchase' } },
        additionalProperties: false,
      },
    });
    expect(
      aiSurface?.capabilities?.find(
        (capability) => capability.id === 'cedros-pay:subscription-settings-update'
      )
    ).toMatchObject({
      kind: 'action',
      visibility: 'admin',
      endpoint: {
        method: 'PUT',
        path: '/extensions/cedros-pay/admin/subscriptions/settings',
      },
      inputSchema: {
        required: ['enabled', 'plans'],
        additionalProperties: false,
      },
    });
    expect(aiSurface?.skills?.map((skill) => skill.id)).toEqual([
      'cedros-pay:checkout',
      'cedros-pay:subscriptions',
      'cedros-pay:admin',
    ]);
    expect(aiSurface?.skills?.map((skill) => skill.visibility)).toEqual([
      'public',
      'authenticated',
      'admin',
    ]);

    for (const skill of aiSurface?.skills ?? []) {
      expect(skill.id.startsWith('cedros-pay:')).toBe(true);
      expect(skill.docs.markdown).toContain('## ');
      expect(skill.docs.markdown).not.toMatch(
        /secret|token|cookie|authorization|private key|paymentintent|customerid|userid|email address/iu
      );
    }
  });

  it('documents each executable capability with its owned Wasm route', () => {
    const manifest = readArchiveJson<{
      surfaces: { ai?: { capabilities?: Array<{ id: string }> } };
    }>('cedros-extension.manifest.json');
    const aiPlan = readArchiveJson<{
      surfaceStatus: { mode: string; packageRef: string; capabilityExecution: string };
      capabilityRouteMappings: unknown[];
      capabilityPolicy: { status: string; reservedPrefixes: string[]; authSchemes: string[] };
      assistantActionContracts: Array<{
        assistantAction: string;
        operationId: string;
        authentication: { requiredCapabilityClaim: string };
      }>;
      discoveryEndpoints: Array<{ path: string; cedrosAiCapability: boolean }>;
    }>('cedros-extension.ai.json');

    expect(manifest.surfaces.ai?.capabilities?.map((capability) => capability.id)).toHaveLength(15);
    expect(aiPlan.surfaceStatus).toMatchObject({
      mode: 'skills-and-capabilities',
      packageRef: 'server',
      capabilityExecution: 'manifest-owned-wasm-routes',
    });
    expect(aiPlan.capabilityRouteMappings).toHaveLength(15);
    expect(aiPlan.assistantActionContracts[0]).toMatchObject({
      assistantAction: 'cedros.monetization.x402.purchase',
      operationId: 'cedros_pay_x402_purchase',
      authentication: {
        requiredCapabilityClaim: 'cedros-pay:assistant-x402-purchase',
      },
    });
    expect(aiPlan.capabilityPolicy.status).toBe('active');
    expect(aiPlan.capabilityPolicy.reservedPrefixes).toContain('/ai/capabilities');
    expect(aiPlan.capabilityPolicy.authSchemes).toContain('bearer-token');
    expect(aiPlan.discoveryEndpoints.every((endpoint) => endpoint.path.startsWith('/'))).toBe(true);
    expect(
      aiPlan.discoveryEndpoints.every((endpoint) => endpoint.cedrosAiCapability === false)
    ).toBe(true);
  });
});
