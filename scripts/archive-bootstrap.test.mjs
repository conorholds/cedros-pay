import assert from 'node:assert/strict';
import test from 'node:test';
import { archiveBootstrap } from './archive-bootstrap.mjs';
const manifest = { contentTemplates: [{ id: 'test:page' }], pageSeeds: [{ id: 'test:seed', templateId: 'test:page', autoCreateOnEnable: true }] };
const template = { id: 'test:page', zones: [{ id: 'main' }], blocks: [{ type: 'test:block', zoneId: 'main', props: { title: 'Authored page' } }] };
const runtime = { manifest, contentTemplates: [template] };
test('archives the exact authored layout separately from manifest summaries', () => {
  assert.deepEqual(archiveBootstrap(manifest, runtime), runtime);
  assert.equal(manifest.contentTemplates[0].zones, undefined);
});
test('rejects missing required layouts and stale compiled manifests', () => {
  assert.throws(() => archiveBootstrap(manifest, { manifest }), /serialized template layout/);
  assert.throws(() => archiveBootstrap(manifest, { ...runtime, manifest: {} }), /compiled web manifest/);
});
test('rejects undeclared, duplicate, and non-JSON runtime definitions', () => {
  for (const contentTemplates of [[{ ...template, id: 'other:page' }], [template, template], [{ ...template, render() {} }]]) {
    assert.throws(() => archiveBootstrap(manifest, { manifest, contentTemplates }));
  }
});
