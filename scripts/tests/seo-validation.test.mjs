import assert from 'node:assert/strict';
import test from 'node:test';

import { assertSeoMetadata } from '../lib/validation-helpers.mjs';

test('accepts noindexed SEO metadata without a canonical path', () => {
  assert.doesNotThrow(() => assertSeoMetadata({ noindex: true }, 'policy'));
});

test('rejects a canonical path on noindexed SEO metadata', () => {
  assert.throws(
    () => assertSeoMetadata(
      { canonicalPath: '/refund-returns', noindex: true },
      'policy',
    ),
    /seo cannot declare canonicalPath when noindex is true/,
  );
});
