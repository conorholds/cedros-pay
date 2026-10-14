import assert from 'node:assert/strict';
import test from 'node:test';

import { validateGuardedWriterInventory } from '../lib/guarded-writer-inventory-validation.mjs';

function fixture() {
  return {
    inventory: {
      schemaVersion: 1,
      controlModelId: 'cedros-pay:guarded-write-policy-state',
      modelSetSha256: 'd0c82bdf62879aba3202ddad31008d5424276d0edba642e32fb5e293aea62fcb',
      runtimeContract: {
        path: 'server-wasm/domain/src/guarded_policy/contract.rs',
        modelsConstant: 'GUARDED_MODELS',
        digestConstant: 'MODEL_SET_SHA256',
        checkoutAuthorityCommit: 'a889960a004f94e0c484fe28a12ee06b5d971e1b',
        reviewedSourceCommit: '21da874bd3ebe902f0a961cc3e65f003107033b5',
      },
      candidateModels: [{
        constant: 'MODEL_LEDGER',
        contentModelId: 'cedros-pay:commerce-ledger',
        remainingUnconditionalWriters: [],
      }],
      nonCandidateUnconditionalWriters: [{
        file: 'server-wasm/domain/src/catalog.rs',
        modelConstant: 'MODEL_CATALOG',
        writeCalls: 1,
        deleteCalls: 0,
      }],
      plainBatchCallsites: [{
        file: 'server-wasm/domain/src/db.rs',
        count: 1,
        requiredToken: 'let applied = self.batch(&[op])?;',
        classification: 'write-policy-control-only',
        candidateDataMutation: false,
      }],
      policyActivation: {
        ready: true,
        enrollmentRouteId: 'cedros-pay:guarded-policy-enroll',
        enrollmentSource: 'server-wasm/domain/src/routes/guarded_policy_enrollment.rs',
        markerModelId: 'cedros-pay:guarded-write-policy-state',
        markerEntryKey: 'active',
        productionEvidence: 'pending Cedros Data 0.1.9 staging deployment',
      },
    },
    sources: new Map([
      ['server-wasm/domain/src/ids.rs',
        'pub const MODEL_LEDGER: &str = "cedros-pay:commerce-ledger";'],
      ['server-wasm/domain/src/catalog.rs',
        'db.write(ids::MODEL_CATALOG, key, value)?;'],
      ['server-wasm/domain/src/db.rs',
        'let applied = self.batch(&[op])?;'],
      ['server-wasm/domain/src/routes/guarded_policy_enrollment.rs',
        `context.require_claim_or_capability(
          ids::ROUTE_ADMIN,
          ids::ROUTE_GUARDED_POLICY_ENROLL,
        )?;
        context.require_admin_write_or_capability(ids::ROUTE_GUARDED_POLICY_ENROLL)?;
        crate::guarded_policy::enroll(seams)?;`],
      ['server-wasm/domain/src/guarded_policy/contract.rs', `
        pub const MODEL_SET_SHA256: &str =
          "d0c82bdf62879aba3202ddad31008d5424276d0edba642e32fb5e293aea62fcb";
        pub const GUARDED_MODELS: [&str; 1] = [
          "cedros-pay:commerce-ledger",
        ];
      `],
    ]),
  };
}

test('accepts an exact non-candidate writer and policy-only batch inventory', () => {
  const value = fixture();
  assert.doesNotThrow(() => validateGuardedWriterInventory(value.inventory, value.sources));
});

test('rejects a new unconditional candidate-model writer', () => {
  const value = fixture();
  value.sources.set(
    'server-wasm/domain/src/unsafe.rs',
    'db.write(ids::MODEL_LEDGER, key, value)?;',
  );
  assert.throws(
    () => validateGuardedWriterInventory(value.inventory, value.sources),
    /unconditional write\/delete inventory drift|candidate guarded-only model/,
  );
});

test('rejects associated-method syntax for an unconditional candidate writer', () => {
  const value = fixture();
  value.sources.set(
    'server-wasm/domain/src/unsafe.rs',
    'Db::write(&db, ids::MODEL_LEDGER, key, value)?;',
  );
  assert.throws(
    () => validateGuardedWriterInventory(value.inventory, value.sources),
    /unconditional write\/delete inventory drift|candidate guarded-only model/,
  );
});

test('rejects an unconditional writer for a dormant module-scoped model', () => {
  const value = fixture();
  value.inventory.candidateModels = [{
    constant: 'CART_MODEL_ID',
    constantSource: 'server-wasm/domain/src/versioned_cart/mod.rs',
    contentModelId: 'cedros-pay:customer-carts',
    remainingUnconditionalWriters: [],
  }];
  value.inventory.modelSetSha256 =
    '5358fde95d804f67f92a01591b708eedfd202689e6cc861a30a2610e3daf21d7';
  value.sources.set(
    'server-wasm/domain/src/versioned_cart/mod.rs',
    'pub const CART_MODEL_ID: &str = "cedros-pay:customer-carts";',
  );
  value.sources.set('server-wasm/domain/src/guarded_policy/contract.rs', `
    pub const MODEL_SET_SHA256: &str =
      "5358fde95d804f67f92a01591b708eedfd202689e6cc861a30a2610e3daf21d7";
    pub const GUARDED_MODELS: [&str; 1] = ["cedros-pay:customer-carts"];
  `);
  value.sources.set(
    'server-wasm/domain/src/unsafe.rs',
    'db.write(CART_MODEL_ID, key, value)?;',
  );
  assert.throws(
    () => validateGuardedWriterInventory(value.inventory, value.sources),
    /candidate guarded-only model/,
  );
});

test('rejects an unclassified plain batch', () => {
  const value = fixture();
  value.sources.set('server-wasm/domain/src/unsafe.rs', 'db.batch(&ops)?;');
  assert.throws(
    () => validateGuardedWriterInventory(value.inventory, value.sources),
    /plain batch inventory drift/,
  );
});

test('rejects enrollment without the exact guarded-policy bearer capability gates', () => {
  const value = fixture();
  value.sources.set(
    'server-wasm/domain/src/routes/guarded_policy_enrollment.rs',
    'context.require_admin_write()?; crate::guarded_policy::enroll(seams)?;',
  );
  assert.throws(
    () => validateGuardedWriterInventory(value.inventory, value.sources),
    /authenticated atomic enrollment core/,
  );
});

test('rejects drift from the guarded-policy runtime model set', () => {
  const value = fixture();
  value.sources.set('server-wasm/domain/src/guarded_policy/contract.rs', `
    pub const MODEL_SET_SHA256: &str =
      "d0c82bdf62879aba3202ddad31008d5424276d0edba642e32fb5e293aea62fcb";
    pub const GUARDED_MODELS: [&str; 1] = ["cedros-pay:checkout-stock"];
  `);
  assert.throws(
    () => validateGuardedWriterInventory(value.inventory, value.sources),
    /model set differs from guarded-policy runtime contract/,
  );
});

test('rejects drift from the guarded-policy runtime digest', () => {
  const value = fixture();
  value.sources.set('server-wasm/domain/src/guarded_policy/contract.rs', `
    pub const MODEL_SET_SHA256: &str =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    pub const GUARDED_MODELS: [&str; 1] = ["cedros-pay:commerce-ledger"];
  `);
  assert.throws(
    () => validateGuardedWriterInventory(value.inventory, value.sources),
    /digest differs from guarded-policy runtime contract/,
  );
});

test('rejects stale source-count provenance', () => {
  const value = fixture();
  value.inventory.runtimeContract.reviewedSourceCommit = 'stale';
  assert.throws(
    () => validateGuardedWriterInventory(value.inventory, value.sources),
    /source-count provenance is stale/,
  );
});
