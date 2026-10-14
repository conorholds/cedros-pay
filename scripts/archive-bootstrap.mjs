import assert from 'node:assert/strict';

// Archive bootstrap uses the same serializable template definitions as the
// browser registration. The manifest continues to contain summaries only.
export function archiveBootstrap(manifest, runtime) {
  assert.deepEqual(runtime.manifest, manifest, 'compiled web manifest must match the archive');
  const contentTemplates = runtime.contentTemplates ?? [];
  assert(Array.isArray(contentTemplates), 'runtime contentTemplates must be an array');
  const declared = new Set((manifest.contentTemplates ?? []).map(({ id }) => id));
  const seen = new Set();
  for (const template of contentTemplates) {
    assert(declared.has(template.id), `undeclared runtime template ${template.id}`);
    assert(!seen.has(template.id), `duplicate runtime template ${template.id}`);
    seen.add(template.id);
  }
  for (const seed of manifest.pageSeeds ?? []) {
    if (!seed.autoCreateOnEnable || seed.templateId === 'page-default') continue;
    const template = contentTemplates.find(({ id }) => id === seed.templateId);
    assert(template?.zones?.length > 0, `page seed ${seed.id} requires a serialized template layout`);
  }
  const portable = JSON.parse(JSON.stringify(contentTemplates));
  assert.deepEqual(portable, contentTemplates, 'template layouts must contain only JSON data');
  return { manifest, ...(portable.length ? { contentTemplates: portable } : {}) };
}
