import packageMetadata from '../../package.json' with { type: 'json' };

export const CEDROS_PAY_EXTENSION_ID = 'cedros-pay';
export const CEDROS_PAY_DISPLAY_NAME = 'Cedros Pay';
export const CEDROS_PAY_EXTENSION_DESCRIPTION =
  'Unified checkout, billing, and payments extension for Cedros surfaces.';
export const CEDROS_PAY_EXTENSION_VERSION = packageMetadata.version;
export const CEDROS_PAY_MIN_CEDROS_DATA_VERSION = '0.1.81';
export const CEDROS_PAY_WIT_CHECKSUM =
  '2bb16879743cfd2748b7deefefcb82204c16b55a1c1a70385f4e9707a83d48f9';
export const CEDROS_PAY_SERVER_VERSION = CEDROS_PAY_EXTENSION_VERSION;
export const CEDROS_PAY_REACT_NATIVE_VERSION = CEDROS_PAY_EXTENSION_VERSION;
export const CEDROS_PAY_ADMIN_MODULE_ID = 'cedros-pay:admin';
export const CEDROS_PAY_STATUS_CARD_ID = 'cedros-pay:status-card';
export const CEDROS_PAY_CHECKOUT_FORM_TEMPLATE_ID = 'cedros-pay:checkout-form';
export const CEDROS_PAY_REFUND_FORM_TEMPLATE_ID = 'cedros-pay:refund-form';
export const CEDROS_PAY_REFUND_RETURNS_POLICY_ID = 'cedros-pay:refund-returns';
export const CEDROS_PAY_PAYMENT_ONBOARDING_ID = 'cedros-pay:payment-setup';
export const CEDROS_PAY_PAYMENT_STARTED_EVENT_ID = 'cedros-pay:payment-started';
export const CEDROS_PAY_PAYMENT_SUCCEEDED_EVENT_ID = 'cedros-pay:payment-succeeded';
export const CEDROS_PAY_CHECKOUT_SETTLED_EVENT_ID = 'cedros-pay:checkout-settled';
export const CEDROS_PAY_PAYMENT_FAILED_EVENT_ID = 'cedros-pay:payment-failed';
export const CEDROS_PAY_WALLET_CONNECTED_EVENT_ID = 'cedros-pay:wallet-connected';
export const CEDROS_PAY_REFUND_SETTLED_EVENT_ID = 'cedros-pay:refund-settled';
export const CEDROS_PAY_CHARGEBACK_OPENED_EVENT_ID = 'cedros-pay:chargeback-opened';
export const CEDROS_PAY_PAYMENT_REVERSED_EVENT_ID = 'cedros-pay:payment-reversed';
export const CEDROS_PAY_ENTITLEMENT_CHANGED_EVENT_ID = 'cedros-pay:entitlement-changed';
export const CEDROS_PAY_SUBSCRIPTION_STARTED_EVENT_ID = 'cedros-pay:subscription-started';
export const CEDROS_PAY_SUBSCRIPTION_CANCELED_EVENT_ID = 'cedros-pay:subscription-canceled';
export const CEDROS_PAY_DISPUTE_OPENED_EVENT_ID = 'cedros-pay:dispute-opened';
export const CEDROS_PAY_PRICING_PAGE_VIEWED_EVENT_ID = 'cedros-pay:pricing-page-viewed';
export const CEDROS_PAY_PRICING_BILLING_PERIOD_CHANGED_EVENT_ID =
  'cedros-pay:pricing-billing-period-changed';
export const CEDROS_PAY_PRICING_PLAN_SELECTED_EVENT_ID = 'cedros-pay:pricing-plan-selected';
export const CEDROS_PAY_PRICING_CHECKOUT_STARTED_EVENT_ID =
  'cedros-pay:pricing-checkout-started';
export const CEDROS_PAY_PRICING_PROGRAM_LINK_CLICKED_EVENT_ID =
  'cedros-pay:pricing-program-link-clicked';
export const CEDROS_PAY_DEVELOPER_PROGRAM_VIEWED_EVENT_ID =
  'cedros-pay:developer-program-viewed';
export const CEDROS_PAY_PARTNER_PROGRAM_VIEWED_EVENT_ID =
  'cedros-pay:partner-program-viewed';
export const CEDROS_PAY_PROGRAM_APPLICATION_STARTED_EVENT_ID =
  'cedros-pay:program-application-started';
export const CEDROS_PAY_PROGRAM_ACTIVATION_ATTEMPTED_EVENT_ID =
  'cedros-pay:program-activation-attempted';
export const CEDROS_PAY_PROGRAM_ACTIVATION_SUCCEEDED_EVENT_ID =
  'cedros-pay:program-activation-succeeded';
export const CEDROS_PAY_PROGRAM_ACTIVATION_FAILED_EVENT_ID =
  'cedros-pay:program-activation-failed';
export const CEDROS_PAY_BALANCE_READ_CAPABILITY_ID = 'cedros-pay:balance-read';
export const CEDROS_PAY_SUBSCRIPTION_READ_CAPABILITY_ID = 'cedros-pay:subscription-read';
export const CEDROS_PAY_ENTITLEMENT_READ_CAPABILITY_ID = 'cedros-pay:entitlement-read';
export const CEDROS_PAY_ACCESS_PASS_CAPABILITY_ID = 'cedros-pay:access-pass';
export const CEDROS_PAY_STATS_ROUTE_ID = 'cedros-pay:stats';
export const CEDROS_PAY_ENTITLEMENTS_ROUTE_ID = 'cedros-pay:entitlements';
export const CEDROS_PAY_SUBSCRIPTION_ENTITLEMENTS_ROUTE_ID = 'cedros-pay:subscription-entitlements';
