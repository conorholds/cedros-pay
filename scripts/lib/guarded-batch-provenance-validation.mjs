import { assert } from './validation-helpers.mjs';

export const LEGACY_GUARDED_BATCH_CAPABILITY = 'cedros-data:database-concurrency-v1';
export const STORAGE_CAS_CAPABILITY = 'cedros-data:extension-storage-cas-v1';
export const GUARDED_WRITE_POLICY_MIN_HOST = '0.1.9';
export const GUARDED_MODEL_SET_SHA256 =
  'eb25861790db9cb6da3145426b0afb4dce17b29a39b70651c523f1ed720972b2';

const HOST_COMMIT = '6a1ddc9beb31b6ab1765777365afeb576886c758';
const POLICY_HOST_COMMIT = '4b77968f8211791a198da6b71e1465a7ffa932cc';
const EVIDENCE_COMMIT = '2bde8949177ecdfad264544bf008ec4dc276aeb5';
const PRIOR_DIGEST = '198e2becdb9dd98022e92db46e815e09f78e3211b0e0ffbe1f2dc68214aeb127';

export function assertGuardedBatchProvenance(provenance) {
  assert(provenance?.schemaVersion === 1, 'guarded-batch provenance schemaVersion must be 1');
  assert(
    provenance.historicalCapabilityId === LEGACY_GUARDED_BATCH_CAPABILITY,
    `guarded-batch provenance must identify historical ${LEGACY_GUARDED_BATCH_CAPABILITY} evidence`,
  );
  assert(
    provenance.requestSchemaVersion === 1
      && provenance.transport === 'cedros:extension@0.1.0/database.compare-and-set'
      && provenance.requiredCapability === STORAGE_CAS_CAPABILITY,
    'guarded mutations must use schemaVersion 1 on the named database.compare-and-set transport',
  );
  assertRequestContract(provenance.requestContract);
  assert(
    provenance.hostCommit === HOST_COMMIT,
    `guarded-batch provenance must pin Cedros Data ${HOST_COMMIT}`,
  );
  assertEvidence(provenance.hostEvidence);
  assert(
    provenance.contractDocument === 'docs/extension-authoring/08-site-database.md#optimistic-concurrency-cedros-dataextension-storage-cas-v1',
    'guarded-batch provenance must pin the public storage CAS contract document',
  );
  assertPolicy(provenance.guardedOnlyWritePolicy);
  assert(
    provenance.activationMarker === 'cedros-pay:guarded-write-policy-state/active'
      && provenance.enrollmentRouteId === 'cedros-pay:guarded-policy-enroll'
      && provenance.writerInventory === 'docs/guarded-only-writer-inventory.json',
    'guarded-batch activation provenance is incomplete',
  );
  assert(
    provenance.requiredWhenPayHandlersAdopted === true
      && provenance.downgradeSafety === 'required-capability-host-version-and-wit-checksum',
    'guarded batch must use capability, host-version, and WIT downgrade protection',
  );
}

function assertRequestContract(contract) {
  assert(
    contract?.schemaVersion === 1
      && contract.conditionsField === 'conditions'
      && contract.opsField === 'ops'
      && contract.conditionLimit === 32
      && contract.operationLimit === 128
      && contract.predicates?.join(',') === 'absent,version'
      && contract.outcomes?.join(',') === 'applied,conflict'
      && contract.opaqueVersions === true
      && contract.rotateVersionOnEveryCommittedWrite === true
      && contract.reuseVersionAfterDeleteRecreate === false,
    'guarded batch JSON request/outcome contract is incomplete or has drifted',
  );
}

function assertEvidence(evidence) {
  assert(
    evidence?.branch === 'conorholds/database-concurrency-v1'
      && evidence.commit === EVIDENCE_COMMIT
      && evidence.integratedContractBase === POLICY_HOST_COMMIT
      && evidence.testName === 'pay_guarded_enrollment_and_policy_matrix'
      && /cargo test --lib pay_guarded_enrollment_and_policy_matrix/.test(evidence.testCommand ?? '')
      && evidence.coveredModelCount === 12
      && evidence.coveredModelSetSha256 === PRIOR_DIGEST
      && evidence.requiredRefreshModelCount === 18
      && evidence.requiredRefreshModelSetSha256 === GUARDED_MODEL_SET_SHA256
      && evidence.status === 'prior-model-set-proven;-eighteen-model-staging-refresh-required',
    'guarded-batch host evidence provenance is incomplete',
  );
}

function assertPolicy(policy) {
  assert(
    policy?.operation === 'setWritePolicy'
      && policy.policies?.join(',') === 'guarded-only,open'
      && policy.requiredScopes?.join(',') === 'write,delete'
      && policy.minCedrosDataVersion === GUARDED_WRITE_POLICY_MIN_HOST
      && policy.activation === 'explicit-durable-enrollment-required',
    'guarded-only write-policy provenance is incomplete',
  );
}
