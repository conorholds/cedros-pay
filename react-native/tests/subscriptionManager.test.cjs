const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

let initStripeCalls = [];
let initPaymentSheetCalls = [];
let presentPaymentSheetCalls = [];
let openUrlCalls = [];
let initPaymentSheetResult = { error: null };
let presentPaymentSheetResult = { error: null };

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@stripe/stripe-react-native') {
    return {
      initStripe: async (args) => {
        initStripeCalls.push(args);
      },
      initPaymentSheet: async (args) => {
        initPaymentSheetCalls.push(args);
        return initPaymentSheetResult;
      },
      presentPaymentSheet: async () => {
        presentPaymentSheetCalls.push(true);
        return presentPaymentSheetResult;
      },
    };
  }

  if (request === 'react-native') {
    return {
      Linking: {
        openURL: async (url) => {
          openUrlCalls.push(url);
        },
      },
    };
  }

  return originalLoad(request, parent, isMain);
};

const { SubscriptionManager } = require('../lib/managers/SubscriptionManager.js');
const { RouteDiscoveryManager } = require('../lib/managers/RouteDiscoveryManager.js');

test.after(() => {
  Module._load = originalLoad;
});

test.beforeEach(() => {
  initStripeCalls = [];
  initPaymentSheetCalls = [];
  presentPaymentSheetCalls = [];
  openUrlCalls = [];
  initPaymentSheetResult = { error: null };
  presentPaymentSheetResult = { error: null };

  global.fetch = async (url) => {
    if (String(url).includes('/cedros-health')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/api' }),
      };
    }

    throw new Error(`Unmocked fetch call: ${String(url)}`);
  };
});

function createManager() {
  return new SubscriptionManager(
    'pk_test_123',
    new RouteDiscoveryManager('https://api.example.com')
  );
}

function createManagerWithReturnUrl(returnUrl) {
  return new SubscriptionManager(
    'pk_test_123',
    new RouteDiscoveryManager('https://api.example.com'),
    { returnUrl }
  );
}

test('opens Stripe hosted checkout for redirect_checkout subscription sessions', async () => {
  global.fetch = async (url) => {
    if (String(url).includes('/cedros-health')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/api' }),
      };
    }

    if (String(url).includes('/paywall/v1/subscription/stripe-session')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          flow: 'redirect_checkout',
          sessionId: 'cs_sub_redirect_123',
          url: 'https://checkout.stripe.com/subscription',
        }),
      };
    }

    throw new Error(`Unmocked fetch call: ${String(url)}`);
  };

  const manager = createManager();
  const result = await manager.processSubscription({
    resource: 'plan-pro',
    interval: 'monthly',
  });

  assert.equal(result.success, true);
  assert.equal(result.transactionId, 'cs_sub_redirect_123');
  assert.deepEqual(openUrlCalls, ['https://checkout.stripe.com/subscription']);
  assert.equal(initPaymentSheetCalls.length, 0);
  assert.equal(presentPaymentSheetCalls.length, 0);
});

test('still supports payment_sheet subscription sessions when the backend returns native secrets', async () => {
  global.fetch = async (url) => {
    if (String(url).includes('/cedros-health')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/api' }),
      };
    }

    if (String(url).includes('/paywall/v1/subscription/stripe-session')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          flow: 'payment_sheet',
          paymentIntentClientSecret: 'pi_sub_123_secret_abc',
          customerId: 'cus_123',
          customerEphemeralKeySecret: 'ephkey_123',
        }),
      };
    }

    throw new Error(`Unmocked fetch call: ${String(url)}`);
  };

  const manager = createManager();
  const result = await manager.processSubscription({
    resource: 'plan-pro',
    interval: 'monthly',
  });

  assert.equal(result.success, true);
  assert.equal(result.transactionId, 'pi_sub_123');
  assert.equal(initStripeCalls.length, 1);
  assert.equal(initPaymentSheetCalls.length, 1);
  assert.equal(presentPaymentSheetCalls.length, 1);
  assert.equal(openUrlCalls.length, 0);
  assert.equal(
    initPaymentSheetCalls[0].paymentIntentClientSecret,
    'pi_sub_123_secret_abc'
  );
});

test('processMobileSubscription uses the dedicated mobile endpoint and forwards returnURL', async () => {
  global.fetch = async (url) => {
    if (String(url).includes('/cedros-health')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/api' }),
      };
    }

    if (String(url).includes('/paywall/v1/subscription/stripe-mobile-session')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          flow: 'payment_sheet',
          subscriptionId: 'sub_native_123',
          paymentIntentClientSecret: 'pi_sub_native_123_secret_abc',
          customerId: 'cus_native_123',
          customerEphemeralKeySecret: 'ephkey_native_123',
        }),
      };
    }

    throw new Error(`Unmocked fetch call: ${String(url)}`);
  };

  const manager = createManagerWithReturnUrl('covenant://stripe-return');
  const result = await manager.processMobileSubscription({
    resource: 'plan-pro',
    interval: 'monthly',
    customerEmail: 'subscriber@example.com',
  });

  assert.equal(result.success, true);
  assert.equal(result.transactionId, 'sub_native_123');
  assert.equal(initPaymentSheetCalls.length, 1);
  assert.equal(initPaymentSheetCalls[0].returnURL, 'covenant://stripe-return');
  assert.equal(
    initPaymentSheetCalls[0].paymentIntentClientSecret,
    'pi_sub_native_123_secret_abc'
  );
});

test('processMobileSubscription succeeds immediately when Stripe returns a trialing subscription without client confirmation', async () => {
  global.fetch = async (url) => {
    if (String(url).includes('/cedros-health')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/api' }),
      };
    }

    if (String(url).includes('/paywall/v1/subscription/stripe-mobile-session')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          flow: 'payment_sheet',
          subscriptionId: 'sub_trial_123',
          customerId: 'cus_trial_123',
          customerEphemeralKeySecret: 'ephkey_trial_123',
          status: 'trialing',
        }),
      };
    }

    throw new Error(`Unmocked fetch call: ${String(url)}`);
  };

  const manager = createManager();
  const result = await manager.processMobileSubscription({
    resource: 'plan-pro',
    interval: 'monthly',
    trialDays: 14,
  });

  assert.equal(result.success, true);
  assert.equal(result.transactionId, 'sub_trial_123');
  assert.equal(initPaymentSheetCalls.length, 0);
  assert.equal(presentPaymentSheetCalls.length, 0);
});
