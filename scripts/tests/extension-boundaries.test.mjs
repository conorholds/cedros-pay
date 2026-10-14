import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));

function productionSources(directory) {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__tests__') return [];
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return productionSources(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

test('Pay admin runtime never connects, signs, or submits through browser wallet providers', () => {
  for (const path of productionSources('ui/src')) {
    assert.doesNotMatch(read(path), /window\.(?:solana|phantom|solflare)|signTransaction|signAndSendTransaction|sendRawTransaction|setWalletSigner|paywall\/v1\/nonce/, path);
  }
  const pkg = json('ui/package.json');
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    assert.equal(pkg[field]?.['@solana/web3.js'], undefined);
  }
});

test('published subscription discovery distinguishes buyers from relying parties', () => {
  const manifest = json('cedros-extension.manifest.json');
  const skills = manifest.surfaces.ai.skills;
  const docs = skills.find((skill) => skill.id === 'cedros-pay:subscriptions').docs.markdown;
  assert.match(docs, /paywall\/v1\/subscription/);
  assert.match(docs, /end user’s Cedros Login session/);
  assert.match(docs, /service-to-service/);
  assert.match(docs, /Never expose that credential to a browser/);
  for (const skill of skills) assert.doesNotMatch(skill.docs.markdown, /\{\{API_BASE\}\}\/skills\//);
  assert.deepEqual(json('cedros-extension.bootstrap.json').manifest, manifest);
  assert.deepEqual(json('ui/react-native/src/extensionManifest.generated.json'), manifest);
});

test('unsupported jobs retain stable IDs but cannot advertise a successful run', () => {
  const manifest = json('cedros-extension.manifest.json');
  const handoff = json('cedros-extension.host-handoff.json');
  const automation = json('cedros-extension.automation.json');
  for (const id of ['sanctions-refresh', 'sanctions-sweep', 'balance-alert', 'email']) {
    const jobId = `cedros-pay:${id}`;
    assert.ok(manifest.surfaces.server.jobs.includes(jobId));
    assert.equal(manifest.jobSchedules.find((job) => job.jobId === jobId).enabled, false);
    assert.equal(automation.schedules.find((job) => job.jobId === jobId).enabled, false);
    const contract = handoff.jobContracts.find((job) => job.jobId === jobId);
    assert.match(contract.failureMode, /Unsupported: fails closed/);
    assert.match(contract.retryBehavior, /Terminal failed/);
  }
});


test('capacity billing mutations require actions while inspection remains a read tool', () => {
  const capabilities = json('cedros-extension.manifest.json').surfaces.ai.capabilities;
  for (const suffix of ['configure', 'enroll', 'activate', 'coupon-ensure']) {
    const id = `cedros-pay:capacity-${suffix}`;
    const capability = capabilities.find((item) => item.id === id);
    assert.ok(capability, id);
    assert.equal(capability.kind, 'action', id);
    assert.equal(capability.visibility, 'admin', id);
    assert.deepEqual(capability.auth.schemes, ['bearer-token'], id);
    assert.equal(capability.inputSchema.additionalProperties, false, id);
  }
  assert.equal(capabilities.find((item) => item.id === 'cedros-pay:capacity-read').kind, 'tool');
});
