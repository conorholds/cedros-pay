import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';

export const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export function readText(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

export function readJson(path) {
  return JSON.parse(readText(path));
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${inspect(expected)}, received ${inspect(actual)}`);
  }
}

export function assertDeepEqual(actual, expected, label, message = `${label}: objects differ`) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message);
  }
}

export function assertNamespacedId(id, extensionId, label) {
  assert(typeof id === 'string' && id.startsWith(`${extensionId}:`), `${label} must be namespaced: ${inspect(id)}`);
}

export function assertNamespacedIds(ids, extensionId, label) {
  for (const id of ids) {
    assert(
      typeof id === 'string' && id.startsWith(`${extensionId}:`),
      `${label} id must be namespaced with ${extensionId}: ${inspect(id)}`,
    );
  }
}

export function assertSeoMetadata(seo, ownerId) {
  if (seo === undefined) return;
  assert(seo && typeof seo === 'object' && !Array.isArray(seo), `${ownerId} seo must be an object`);

  const supportedFields = new Set([
    'title',
    'description',
    'canonicalPath',
    'ogTitle',
    'ogDescription',
    'ogImage',
    'noindex',
  ]);
  const stringFields = ['title', 'description', 'canonicalPath', 'ogTitle', 'ogDescription', 'ogImage'];

  for (const field of Object.keys(seo)) {
    assert(supportedFields.has(field), `${ownerId} seo uses unsupported field ${field}`);
  }
  for (const field of stringFields) {
    if (seo[field] === undefined) continue;
    assert(typeof seo[field] === 'string' && seo[field].trim().length > 0, `${ownerId} seo.${field} must be a non-empty string`);
  }
  if (seo.canonicalPath !== undefined) {
    assert(
      seo.canonicalPath.startsWith('/') && !seo.canonicalPath.startsWith('//'),
      `${ownerId} seo.canonicalPath must be a same-origin absolute path`,
    );
    assert(!/^[a-z][a-z0-9+.-]*:/i.test(seo.canonicalPath), `${ownerId} seo.canonicalPath cannot be external`);
  }
  if (seo.noindex !== undefined) {
    assert(typeof seo.noindex === 'boolean', `${ownerId} seo.noindex must be boolean`);
  }
  if (seo.noindex === true) {
    assert(
      seo.canonicalPath === undefined,
      `${ownerId} seo cannot declare canonicalPath when noindex is true`,
    );
  }
}

export function assertStarterContent(manifest) {
  const allowedFieldTypes = new Set(['text', 'email', 'textarea', 'tel', 'select', 'checkbox']);
  const formIds = new Set();
  const docsIds = new Set();

  for (const form of manifest.formTemplates ?? []) {
    assertNamespacedIds([form.id], manifest.extensionId, 'form template');
    assert(!formIds.has(form.id), `duplicate form template ${form.id}`);
    assert(form.displayName, `${form.id} is missing displayName`);
    assert(form.title, `${form.id} is missing title`);
    assert((form.fields ?? []).length > 0, `${form.id} must declare form fields`);
    const fieldKeys = new Set();
    for (const field of form.fields ?? []) {
      assert(/^[a-z][a-z0-9_]*$/.test(field.key), `${form.id} field key is invalid: ${field.key}`);
      assert(!fieldKeys.has(field.key), `${form.id} has duplicate field key ${field.key}`);
      assert(field.label, `${form.id}.${field.key} is missing label`);
      assert(allowedFieldTypes.has(field.type), `${form.id}.${field.key} has unsupported type ${field.type}`);
      if (field.type === 'select') {
        assert((field.options ?? []).length > 0, `${form.id}.${field.key} select fields need options`);
        for (const option of field.options) {
          assert(option.label && option.value, `${form.id}.${field.key} select options need label and value`);
        }
      }
      if (field.type === 'checkbox' && field.key.includes('consent')) {
        assert(field.label && field.helpText, `${form.id}.${field.key} consent checkbox needs label and helpText`);
      }
      fieldKeys.add(field.key);
    }
    formIds.add(form.id);
  }

  for (const article of manifest.docsArticles ?? []) {
    assertNamespacedIds([article.id], manifest.extensionId, 'docs article');
    assert(!docsIds.has(article.id), `duplicate docs article ${article.id}`);
    assert(article.displayName, `${article.id} is missing displayName`);
    assert(article.title, `${article.id} is missing title`);
    assert(article.slug, `${article.id} is missing slug`);
    assert(article.bodyMarkdown?.trim(), `${article.id} is missing bodyMarkdown`);
    assert(!/<\/?(script|style|iframe|object|embed|html)\b/i.test(article.bodyMarkdown), `${article.id} bodyMarkdown contains unsupported raw HTML`);
    if (article.routePath) {
      assert(article.routePath.startsWith('/'), `${article.id} routePath must be absolute`);
    }
    assertSeoMetadata(article.seo, article.id);
    docsIds.add(article.id);
  }
  assertPolicyStarters(manifest);
}

export function assertPolicyStarters(manifest) {
  const policyIds = new Set();
  const supportedFields = new Set([
    'id',
    'kind',
    'displayName',
    'title',
    'slug',
    'routePath',
    'footerLabel',
    'excerpt',
    'bodyMarkdown',
    'category',
    'tags',
    'seo',
  ]);

  for (const policy of manifest.policies ?? []) {
    assertNamespacedIds([policy.id], manifest.extensionId, 'policy');
    assert(!policyIds.has(policy.id), `duplicate policy ${policy.id}`);
    assert(policy.kind, `${policy.id} is missing kind`);
    assert(policy.displayName, `${policy.id} is missing displayName`);
    assert(policy.title, `${policy.id} is missing title`);
    assert(policy.slug, `${policy.id} is missing slug`);
    assert(policy.routePath?.startsWith('/'), `${policy.id} routePath must be absolute`);
    assert(policy.footerLabel, `${policy.id} is missing footerLabel`);
    assert(policy.excerpt, `${policy.id} is missing excerpt`);
    assert(policy.bodyMarkdown?.trim(), `${policy.id} is missing bodyMarkdown`);
    assert(policy.category, `${policy.id} is missing category`);
    assert(!/<\/?(script|style|iframe|object|embed|html)\b/i.test(policy.bodyMarkdown), `${policy.id} bodyMarkdown contains unsupported raw HTML`);
    assert(/owner[- ]review required/i.test(policy.bodyMarkdown), `${policy.id} must label owner-review required`);
    assert(/not legal advice/i.test(policy.bodyMarkdown), `${policy.id} must avoid presenting starter copy as legal advice`);
    for (const token of [
      'REFUND WINDOW',
      'ELIGIBLE PURCHASE TYPES',
      'INELIGIBLE PURCHASE TYPES',
      'RETURN CONDITION',
      'DIGITAL GOODS TERMS',
      'SUBSCRIPTION REFUND TERMS',
      'PROCESSING TIME',
      'RESTOCKING FEE',
      'SUPPORT CONTACT EMAIL OR FORM URL',
    ]) {
      assert(policy.bodyMarkdown.includes(`[${token}`), `${policy.id} is missing placeholder [${token}]`);
    }
    assert(/shipping/i.test(policy.bodyMarkdown), `${policy.id} must mention shipping terms`);
    assert((policy.tags ?? []).every((tag) => typeof tag === 'string' && tag.length > 0), `${policy.id} tags must be non-empty strings`);
    assertSeoMetadata(policy.seo, policy.id);
    for (const field of Object.keys(policy)) {
      assert(supportedFields.has(field), `${policy.id} uses unsupported policy manifest field ${field}`);
    }
    policyIds.add(policy.id);
  }
}

export function parseCargoValue(cargoToml, key) {
  const match = cargoToml.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, 'm'));
  assert(match, `server Cargo.toml is missing ${key}`);
  return match[1];
}
