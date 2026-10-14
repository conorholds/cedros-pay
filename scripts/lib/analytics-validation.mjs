import { assert, assertEqual, assertNamespacedIds } from './validation-helpers.mjs';

const allowedVisibility = new Set(['public', 'authenticated', 'admin']);
const supportedFields = new Set([
  'id',
  'displayName',
  'description',
  'category',
  'visibility',
  'kind',
]);
const unsafeProperty = /(email|token|secret|cookie|authorization|authheader|walletaddress|customerid|userid|sessionid|ipaddress|phone|paymentintent)/i;

function collectSchemaPropertyKeys(schema, keys = []) {
  for (const [key, value] of Object.entries(schema?.properties ?? {})) {
    keys.push(key);
    collectSchemaPropertyKeys(value, keys);
  }
  return keys;
}

function assertClosedObjectSchemas(schema, eventId, path = 'safeProperties') {
  if (schema?.type === 'object') {
    assert(
      schema.additionalProperties === false,
      `${eventId} ${path} must set additionalProperties=false`,
    );
  }
  for (const [key, value] of Object.entries(schema?.properties ?? {})) {
    assertClosedObjectSchemas(value, eventId, `${path}.${key}`);
  }
}

/** Validates analytics declarations, safe payload schemas, and audience contracts. */
export function assertAnalyticsEvents(manifest, analyticsPlan) {
  const manifestEvents = manifest.analytics?.events ?? [];
  const planEvents = new Map(
    (analyticsPlan.events ?? []).map((event) => [event.eventId, event]),
  );
  const eventIds = new Set();

  assertEqual(analyticsPlan.extensionId, manifest.extensionId, 'analytics plan extensionId');
  assertEqual(analyticsPlan.version, manifest.version, 'analytics plan version');
  assert(
    ['host-coordinated', 'published'].includes(analyticsPlan.runtimeApiStatus?.browserReport),
    'analytics browser runtime status is invalid',
  );
  assert(
    ['host-coordinated', 'published'].includes(analyticsPlan.runtimeApiStatus?.serverReport),
    'analytics server runtime status is invalid',
  );

  for (const event of manifestEvents) {
    assertNamespacedIds([event.id], manifest.extensionId, 'analytics event');
    assert(!eventIds.has(event.id), `duplicate analytics event ${event.id}`);
    assert(event.displayName, `${event.id} is missing displayName`);
    assert(event.description, `${event.id} is missing description`);
    assert(event.category, `${event.id} is missing category`);
    assert(
      allowedVisibility.has(event.visibility),
      `${event.id} has invalid visibility ${event.visibility}`,
    );
    for (const field of Object.keys(event)) {
      assert(
        supportedFields.has(field),
        `${event.id} uses unsupported analytics manifest field ${field}`,
      );
    }
    const plan = planEvents.get(event.id);
    assert(plan, `analytics trigger map missing ${event.id}`);
    assert(
      plan.trigger && plan.reportingPath && plan.safeProperties,
      `${event.id} trigger map is incomplete`,
    );
    assertClosedObjectSchemas(plan.safeProperties, event.id);
    for (const key of collectSchemaPropertyKeys(plan.safeProperties)) {
      assert(!unsafeProperty.test(key), `${event.id} unsafe analytics property key ${key}`);
    }
    eventIds.add(event.id);
  }

  assertPaymentSucceededIdempotency(planEvents);
}

function assertPaymentSucceededIdempotency(planEvents) {
  const succeeded = planEvents.get('cedros-pay:payment-succeeded');
  const idempotency = succeeded?.safeProperties?.properties?.idempotency_key;
  assertEqual(idempotency?.type, 'string', 'payment-succeeded idempotency_key type');
  assertEqual(idempotency?.minLength, 78, 'payment-succeeded idempotency_key minimum length');
  assertEqual(idempotency?.maxLength, 78, 'payment-succeeded idempotency_key maximum length');
  assertEqual(
    idempotency?.pattern,
    '^effect-target:[0-9a-f]{64}$',
    'payment-succeeded idempotency_key pattern',
  );
  assert(
    !(succeeded?.safeProperties?.required ?? []).includes('idempotency_key'),
    'payment-succeeded idempotency_key must remain optional',
  );
  assertEqual(
    succeeded?.audienceScopes?.idempotency_key,
    'authenticated',
    'payment-succeeded idempotency_key audience',
  );
  const settled = planEvents.get('cedros-pay:checkout-settled');
  assert(
    settled?.safeProperties?.properties?.idempotencyKey,
    'checkout-settled must retain its distinct camelCase idempotencyKey contract',
  );
  assert(
    !settled?.safeProperties?.properties?.idempotency_key,
    'checkout-settled must not conflate idempotencyKey with payment-succeeded idempotency_key',
  );
}
