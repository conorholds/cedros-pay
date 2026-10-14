import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { assertAnalyticsEvents } from '../lib/analytics-validation.mjs';

function readJson(relativePath) {
  return JSON.parse(
    readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8'),
  );
}

function fixture() {
  return {
    manifest: readJson('cedros-extension.manifest.json'),
    analytics: readJson('cedros-extension.analytics.json'),
  };
}

test('accepts the published analytics manifest and safe schemas', () => {
  const { manifest, analytics } = fixture();
  assert.doesNotThrow(() => assertAnalyticsEvents(manifest, analytics));
});

test('rejects a weakened payment idempotency identifier contract', () => {
  const { manifest, analytics } = fixture();
  const succeeded = analytics.events.find(
    (event) => event.eventId === 'cedros-pay:payment-succeeded',
  );
  succeeded.safeProperties.properties.idempotency_key.maxLength = 256;

  assert.throws(
    () => assertAnalyticsEvents(manifest, analytics),
    /payment-succeeded idempotency_key maximum length/,
  );
});
