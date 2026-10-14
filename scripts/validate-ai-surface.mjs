#!/usr/bin/env node
import { inspect } from 'node:util';
import { assert, assertEqual, assertNamespacedId, readJson } from './lib/validation-helpers.mjs';

const allowedVisibility = new Set(['public', 'authenticated', 'admin']);
const allowedMethods = new Set(['POST', 'PUT', 'PATCH']);
const forbiddenDocs = /(secret|token|cookie|authorization|private key|paymentintent|customerid|userid|email address)/i;

function assertNamespaced(id, extensionId, label) {
  assertNamespacedId(id, extensionId, label);
  assert(!/[\s/]/.test(id), `${label} must not contain whitespace or slash: ${inspect(id)}`);
}

function assertObjectSchema(schema, label) {
  assert(schema && schema.type === 'object', `${label} must be a JSON object schema`);
}

function assertManifestSkills(manifest, aiPlan) {
  const skills = manifest.surfaces.ai?.skills ?? [];
  const planSkills = new Map((aiPlan.skills ?? []).map((skill) => [skill.skillId, skill]));
  const skillIds = new Set();

  assert(skills.length > 0 || (manifest.surfaces.ai?.capabilities ?? []).length > 0, 'AI surface needs at least one skill or capability');
  for (const skill of skills) {
    assertNamespaced(skill.id, manifest.extensionId, 'AI skill id');
    assert(!skillIds.has(skill.id), `duplicate AI skill ${skill.id}`);
    assert(skill.name && skill.description && skill.category, `${skill.id} is missing skill metadata`);
    assert(allowedVisibility.has(skill.visibility), `${skill.id} has invalid visibility ${skill.visibility}`);
    assert(skill.docs?.markdown?.trim(), `${skill.id} is missing docs.markdown`);
    assert(!forbiddenDocs.test(skill.docs.markdown), `${skill.id} docs contain unsafe sensitive terms`);

    const planSkill = planSkills.get(skill.id);
    assert(planSkill, `AI plan missing skill ${skill.id}`);
    assertEqual(planSkill.visibility, skill.visibility, `${skill.id} plan visibility`);
    assertEqual(planSkill.category, skill.category, `${skill.id} plan category`);
    skillIds.add(skill.id);
  }
}

function assertManifestCapabilities(manifest, aiPlan) {
  const routeIds = new Set(manifest.surfaces.server.routes ?? []);
  const capabilityMappings = new Map(
    (aiPlan.capabilityRouteMappings ?? []).map((mapping) => [mapping.capabilityId, mapping]),
  );
  const capabilityIds = new Set();

  for (const capability of manifest.surfaces.ai?.capabilities ?? []) {
    assertNamespaced(capability.id, manifest.extensionId, 'AI capability id');
    assert(!capabilityIds.has(capability.id), `duplicate AI capability ${capability.id}`);
    assert(['tool', 'action'].includes(capability.kind), `${capability.id} has invalid kind ${capability.kind}`);
    assert(allowedVisibility.has(capability.visibility), `${capability.id} has invalid visibility ${capability.visibility}`);
    assert(allowedMethods.has(capability.endpoint?.method), `${capability.id} endpoint method is invalid`);
    assert(capability.endpoint?.path?.startsWith('/'), `${capability.id} endpoint path must be absolute`);
    assert(!capability.endpoint.path.startsWith('/ai/capabilities'), `${capability.id} cannot target reserved AI execution prefix`);
    assertObjectSchema(capability.inputSchema, `${capability.id} inputSchema`);
    if (capability.outputSchema) {
      assertObjectSchema(capability.outputSchema, `${capability.id} outputSchema`);
    }
    if (capability.visibility !== 'public') {
      assert((capability.auth?.schemes ?? []).includes('bearer-token'), `${capability.id} needs bearer-token auth`);
    }

    const mapping = capabilityMappings.get(capability.id);
    assert(mapping, `AI plan missing capability route mapping for ${capability.id}`);
    assertEqual(mapping.endpointPath, capability.endpoint.path, `${capability.id} endpoint mapping`);
    if (mapping.ownedByExtension) {
      assert(routeIds.has(mapping.serverRouteId), `${capability.id} maps to undeclared server route ${mapping.serverRouteId}`);
      assert(mapping.runtime === 'wasm-route', `${capability.id} owned endpoint must use the Wasm route runtime`);
    }
    capabilityIds.add(capability.id);
  }

  assertEqual(capabilityMappings.size, capabilityIds.size, 'AI capability mapping count');
}

function assertAssistantPurchaseContract(manifest, aiPlan) {
  const capability = (manifest.surfaces.ai?.capabilities ?? []).find(
    (entry) => entry.id === 'cedros-pay:assistant-x402-purchase',
  );
  const contract = (aiPlan.assistantActionContracts ?? []).find(
    (entry) => entry.assistantAction === 'cedros.monetization.x402.purchase',
  );
  assert(capability?.kind === 'action', 'Site Assistant x402 capability must be an action');
  assert(capability?.visibility === 'authenticated', 'Site Assistant x402 capability must be authenticated');
  assertEqual(capability?.endpoint?.method, 'POST', 'Site Assistant x402 method');
  assertEqual(
    capability?.endpoint?.path,
    '/extensions/cedros-pay/assistant/v1/x402/purchase',
    'Site Assistant x402 route',
  );
  assertEqual(
    capability?.inputSchema?.required?.join(','),
    'resourceUrl',
    'Site Assistant x402 required arguments',
  );
  assert(capability?.inputSchema?.additionalProperties === false, 'Site Assistant x402 input must be closed');
  assertEqual(
    capability?.outputSchema?.properties?.boundary?.const,
    'cedros_pay_x402_purchase',
    'Site Assistant x402 output boundary',
  );
  assertEqual(contract?.operationId, 'cedros_pay_x402_purchase', 'Site Assistant x402 operation id');
  assertEqual(contract?.capabilityId, capability.id, 'Site Assistant x402 contract capability');
  assertEqual(
    contract?.authentication?.requiredCapabilityClaim,
    'cedros-pay:assistant-x402-purchase',
    'Site Assistant x402 authenticated capability claim',
  );
  assertEqual(
    contract?.authentication?.trustedServerContextSchema?.properties?.assistantId?.const,
    'ai-assistant',
    'Site Assistant x402 identity',
  );
  assertEqual(
    contract?.signingContract?.document,
    'docs/assistant-x402-signing-contract.json',
    'Site Assistant x402 signing contract document',
  );
  const signing = readJson(contract.signingContract.document);
  assertEqual(signing.schemaVersion, 1, 'Site Assistant x402 signing schemaVersion');
  assertEqual(
    signing.providerOperation?.accessId,
    'cedros-pay:blockchain-assistant-x402-sign',
    'Site Assistant x402 signing access',
  );
  assertEqual(
    signing.providerOperation?.operation,
    'blockchain.solana.sign.assistant-x402',
    'Site Assistant x402 signing operation',
  );
  const providerGrant = (manifest.providerAccess ?? []).find(
    (entry) => entry.id === signing.providerOperation.accessId,
  );
  assertEqual(providerGrant?.provider, 'blockchain', 'Site Assistant x402 signing provider');
  assertEqual(
    providerGrant?.scopes?.join(','),
    'blockchain.solana.sign.assistant-x402',
    'Site Assistant x402 signing grant scope',
  );
  const providerFields = signing.providerOperation.payloadSchema.required;
  assertEqual(
    providerFields.join(','),
    'walletId,walletVersionId,cluster,serializedTransactionBase64,transactionSha256,paymentMint,paymentAmountMicrounits,tokenDecimals,payTo,destinationTokenAccount,memo,maxFeeLamports,requestId,assistantId,runId,idempotencyKey',
    'Site Assistant x402 provider payload fields',
  );
  assert(signing.providerOperation.payloadSchema.additionalProperties === false, 'Site Assistant x402 provider payload must be closed');
  assertEqual(
    signing.vaultRequest?.bodySchema?.properties?.intent?.properties?.kind?.const,
    'assistantX402Payment',
    'Site Assistant x402 Vault intent kind',
  );
  assertEqual(
    Object.keys(signing.providerToVaultMapping).sort().join(','),
    [...providerFields].sort().join(','),
    'Site Assistant x402 provider-to-Vault mapping',
  );
  const serializedInput = JSON.stringify(capability.inputSchema);
  for (const forbidden of [
    'walletId', 'walletVersionId', 'serializedTransaction', 'signedTransaction',
    'signature', 'cluster', 'assistantId', 'requestId', 'idempotencyKey',
  ]) {
    assert(!serializedInput.includes(forbidden), `Site Assistant x402 input exposes ${forbidden}`);
  }
}

function main() {
  const manifest = readJson('cedros-extension.manifest.json');
  const aiPlan = readJson('cedros-extension.ai.json');

  assertEqual(aiPlan.schemaVersion, 1, 'AI plan schemaVersion');
  assertEqual(aiPlan.extensionId, manifest.extensionId, 'AI plan extensionId');
  assertEqual(aiPlan.version, manifest.version, 'AI plan version');
  assertEqual(manifest.surfaces.ai?.packageRef, 'server', 'AI packageRef');
  assertEqual(aiPlan.surfaceStatus?.packageRef, 'server', 'AI plan packageRef');

  assertManifestSkills(manifest, aiPlan);
  assertManifestCapabilities(manifest, aiPlan);
  assertAssistantPurchaseContract(manifest, aiPlan);
  const checkoutSkill = (aiPlan.skills ?? []).find(
    (skill) => skill.skillId === 'cedros-pay:checkout',
  );
  assert(
    checkoutSkill?.runtimeBehavior?.includes('eighteen-model'),
    'checkout AI plan must name the exact eighteen-model guarded set',
  );

  if ((manifest.surfaces.ai?.capabilities ?? []).length === 0) {
    assertEqual(aiPlan.surfaceStatus?.mode, 'skill-only', 'AI plan mode');
    assertEqual(aiPlan.capabilityPolicy?.status, 'deferred', 'AI capability policy status');
  }

  for (const endpoint of aiPlan.discoveryEndpoints ?? []) {
    assert(endpoint.path?.startsWith('/'), `${endpoint.path} discovery path must be absolute`);
    assertEqual(endpoint.cedrosAiCapability, false, `${endpoint.path} discovery capability marker`);
  }

  console.log('Cedros AI surface alignment passed.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
