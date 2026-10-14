import { createHash } from 'node:crypto';

const directMutations = [
  /\.(write|delete)\s*\(\s*ids::(MODEL_[A-Z_]+)/g,
  /Db::(write|delete)\s*\(\s*[^,]+,\s*ids::(MODEL_[A-Z_]+)/g,
];
const plainBatch = /(?:\.batch|Db::batch)\s*\(/g;
const CHECKOUT_AUTHORITY_COMMIT = 'a889960a004f94e0c484fe28a12ee06b5d971e1b';
const REVIEWED_SOURCE_COMMIT = '21da874bd3ebe902f0a961cc3e65f003107033b5';

export function validateGuardedWriterInventory(inventory, sources) {
  assert(inventory?.schemaVersion === 1, 'writer inventory schemaVersion must be 1');
  assert(Array.isArray(inventory.candidateModels), 'candidateModels must be an array');
  assert(
    Array.isArray(inventory.nonCandidateUnconditionalWriters),
    'nonCandidateUnconditionalWriters must be an array',
  );
  assert(Array.isArray(inventory.plainBatchCallsites), 'plainBatchCallsites must be an array');

  const candidateConstants = new Set();
  const modelIds = inventory.candidateModels.map((model) => model.contentModelId);
  assert(
    modelIds.join('\0') === [...modelIds].sort().join('\0'),
    'candidate guarded-only models must be canonically sorted',
  );
  const digest = createHash('sha256').update(JSON.stringify(modelIds)).digest('hex');
  assert(inventory.modelSetSha256 === digest, 'candidate model-set SHA-256 is stale');
  validateRuntimeContract(inventory, sources, modelIds);
  assert(
    inventory.controlModelId === 'cedros-pay:guarded-write-policy-state',
    'guarded-only control model is invalid',
  );
  for (const model of inventory.candidateModels) {
    assert(/^[A-Z][A-Z0-9_]+$/.test(model.constant), 'candidate model constant is invalid');
    assert(!candidateConstants.has(model.constant), `duplicate candidate ${model.constant}`);
    assert(
      Array.isArray(model.remainingUnconditionalWriters)
        && model.remainingUnconditionalWriters.length === 0,
      `${model.constant} still lists unconditional writers`,
    );
    candidateConstants.add(model.constant);
  }
  validateModelIds(inventory, sources);

  const actualDirect = countDirectMutations(sources, candidateConstants);
  const expectedDirect = expectedDirectMutations(inventory);
  assertSameCounts(actualDirect.all, expectedDirect, 'unconditional write/delete');
  for (const [key, count] of actualDirect.candidates) {
    assert(count === 0, `candidate guarded-only model has an unconditional writer: ${key}`);
  }
  validatePlainBatches(inventory, sources);
  validateActivation(inventory, sources);
  return {
    candidateModelCount: candidateConstants.size,
    directMutationCount: sum(actualDirect.all),
    plainBatchCount: inventory.plainBatchCallsites.reduce((total, item) => total + item.count, 0),
  };
}

function validateRuntimeContract(inventory, sources, modelIds) {
  const contract = inventory.runtimeContract;
  assert(contract?.path === 'server-wasm/domain/src/guarded_policy/contract.rs',
    'guarded-policy runtime contract path is invalid');
  assert(contract.modelsConstant === 'GUARDED_MODELS',
    'guarded-policy runtime model constant is invalid');
  assert(contract.digestConstant === 'MODEL_SET_SHA256',
    'guarded-policy runtime digest constant is invalid');
  assert(
    contract.checkoutAuthorityCommit === CHECKOUT_AUTHORITY_COMMIT
      && contract.reviewedSourceCommit === REVIEWED_SOURCE_COMMIT,
    'writer inventory source-count provenance is stale',
  );
  const source = sources.get(contract.path);
  assert(source, `${contract.path} is missing from writer inventory sources`);
  const array = source.match(new RegExp(
    `pub const ${contract.modelsConstant}:\\s*\\[&str;\\s*(\\d+)\\]\\s*=\\s*\\[([\\s\\S]*?)\\];`,
  ));
  assert(array, `cannot parse guarded-policy ${contract.modelsConstant}`);
  const runtimeModels = [...array[2].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert(Number(array[1]) === runtimeModels.length,
    'guarded-policy runtime model array length is stale');
  assert(runtimeModels.join('\0') === modelIds.join('\0'),
    'writer inventory model set differs from guarded-policy runtime contract');
  const digest = source.match(new RegExp(
    `pub const ${contract.digestConstant}:\\s*&str\\s*=\\s*"([0-9a-f]{64})";`,
  ));
  assert(digest, `cannot parse guarded-policy ${contract.digestConstant}`);
  assert(digest[1] === inventory.modelSetSha256,
    'writer inventory digest differs from guarded-policy runtime contract');
}

function validateModelIds(inventory, sources) {
  for (const model of inventory.candidateModels) {
    const sourcePath = model.constantSource ?? 'server-wasm/domain/src/ids.rs';
    const source = sources.get(sourcePath);
    assert(source, `${sourcePath} is missing from writer inventory sources`);
    const pattern = new RegExp(
      `pub const ${model.constant}: &str = "${escapeRegex(model.contentModelId)}";`,
    );
    assert(pattern.test(source), `${model.constant} contentModelId does not match ${sourcePath}`);
  }
}

function countDirectMutations(sources, candidateConstants) {
  const all = new Map();
  const candidates = new Map();
  for (const [file, source] of sources) {
    for (const pattern of directMutations) {
      for (const match of source.matchAll(pattern)) {
        const [, operation, model] = match;
        increment(all, `${file}|${operation}|${model}`);
        if (candidateConstants.has(model)) increment(candidates, `${file}|${operation}|${model}`);
      }
    }
  }
  for (const model of [...candidateConstants].filter((constant) => !constant.startsWith('MODEL_'))) {
    const escaped = escapeRegex(model);
    const patterns = [
      new RegExp(`\\.(write|delete)\\s*\\(\\s*(?:[A-Za-z0-9_:]+::)?(${escaped})\\b`, 'g'),
      new RegExp(`Db::(write|delete)\\s*\\(\\s*[^,]+,\\s*(?:[A-Za-z0-9_:]+::)?(${escaped})\\b`, 'g'),
    ];
    for (const [file, source] of sources) {
      for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
          increment(candidates, `${file}|${match[1]}|${match[2]}`);
        }
      }
    }
  }
  return { all, candidates };
}

function expectedDirectMutations(inventory) {
  const expected = new Map();
  for (const item of inventory.nonCandidateUnconditionalWriters) {
    assert(!item.file.includes('..'), `writer inventory path escapes repository: ${item.file}`);
    if (item.writeCalls > 0) expected.set(`${item.file}|write|${item.modelConstant}`, item.writeCalls);
    if (item.deleteCalls > 0) {
      expected.set(`${item.file}|delete|${item.modelConstant}`, item.deleteCalls);
    }
  }
  return expected;
}

function validatePlainBatches(inventory, sources) {
  const actual = new Map();
  for (const [file, source] of sources) {
    const count = [...source.matchAll(plainBatch)].length;
    if (count > 0) actual.set(file, count);
  }
  const expected = new Map();
  for (const item of inventory.plainBatchCallsites) {
    assert(item.candidateDataMutation === false, `${item.file} plain batch mutates candidate data`);
    assert(item.classification === 'write-policy-control-only', `${item.file} batch is not policy-only`);
    const source = sources.get(item.file);
    assert(source?.includes(item.requiredToken), `${item.file} required batch token is missing`);
    expected.set(item.file, item.count);
  }
  assertSameCounts(actual, expected, 'plain batch');
}

function validateActivation(inventory, sources) {
  const activation = inventory.policyActivation;
  assert(activation?.ready === true, 'writer inventory must activate guarded-only policy');
  assert(
    activation.enrollmentRouteId === 'cedros-pay:guarded-policy-enroll'
      && activation.enrollmentSource === 'server-wasm/domain/src/routes/guarded_policy_enrollment.rs'
      && activation.markerModelId === inventory.controlModelId
      && activation.markerEntryKey === 'active',
    'guarded-only policy activation contract is incomplete',
  );
  const source = sources.get(activation.enrollmentSource) ?? '';
  assert(
    source.includes('crate::guarded_policy::enroll(seams)?')
      && /require_claim_or_capability\s*\(\s*ids::ROUTE_ADMIN,\s*ids::ROUTE_GUARDED_POLICY_ENROLL\s*,?\s*\)\?/.test(source)
      && /require_admin_write_or_capability\s*\(\s*ids::ROUTE_GUARDED_POLICY_ENROLL\s*,?\s*\)\?/.test(source),
    'guarded-only enrollment route must invoke the authenticated atomic enrollment core',
  );
  assert(
    /^pending Cedros platform \d+\.\d+\.\d+ staging deployment/.test(activation.productionEvidence ?? ''),
    'writer inventory must not claim unavailable production enrollment evidence',
  );
}

function assertSameCounts(actual, expected, label) {
  const keys = new Set([...actual.keys(), ...expected.keys()]);
  const differences = [...keys]
    .filter((key) => actual.get(key) !== expected.get(key))
    .map((key) => `${key} expected ${expected.get(key) ?? 0}, found ${actual.get(key) ?? 0}`);
  assert(differences.length === 0, `${label} inventory drift:\n${differences.join('\n')}`);
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sum(map) {
  return [...map.values()].reduce((total, value) => total + value, 0);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
