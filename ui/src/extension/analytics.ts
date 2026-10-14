import {
  CEDROS_PAY_CHARGEBACK_OPENED_EVENT_ID,
  CEDROS_PAY_CHECKOUT_SETTLED_EVENT_ID,
  CEDROS_PAY_DISPUTE_OPENED_EVENT_ID,
  CEDROS_PAY_PAYMENT_FAILED_EVENT_ID,
  CEDROS_PAY_PAYMENT_REVERSED_EVENT_ID,
  CEDROS_PAY_PAYMENT_STARTED_EVENT_ID,
  CEDROS_PAY_PAYMENT_SUCCEEDED_EVENT_ID,
  CEDROS_PAY_REFUND_SETTLED_EVENT_ID,
  CEDROS_PAY_SUBSCRIPTION_CANCELED_EVENT_ID,
  CEDROS_PAY_SUBSCRIPTION_STARTED_EVENT_ID,
  CEDROS_PAY_WALLET_CONNECTED_EVENT_ID,
  CEDROS_PAY_PRICING_PAGE_VIEWED_EVENT_ID,
  CEDROS_PAY_PRICING_BILLING_PERIOD_CHANGED_EVENT_ID,
  CEDROS_PAY_PRICING_PLAN_SELECTED_EVENT_ID,
  CEDROS_PAY_PRICING_CHECKOUT_STARTED_EVENT_ID,
  CEDROS_PAY_PRICING_PROGRAM_LINK_CLICKED_EVENT_ID,
  CEDROS_PAY_DEVELOPER_PROGRAM_VIEWED_EVENT_ID,
  CEDROS_PAY_PARTNER_PROGRAM_VIEWED_EVENT_ID,
  CEDROS_PAY_PROGRAM_APPLICATION_STARTED_EVENT_ID,
  CEDROS_PAY_PROGRAM_ACTIVATION_ATTEMPTED_EVENT_ID,
  CEDROS_PAY_PROGRAM_ACTIVATION_SUCCEEDED_EVENT_ID,
  CEDROS_PAY_PROGRAM_ACTIVATION_FAILED_EVENT_ID,
} from './constants';
import type { CedrosExtensionAnalyticsManifest } from './types';

export const cedrosPayAnalytics: CedrosExtensionAnalyticsManifest = {
  events: [
    {
      id: CEDROS_PAY_PAYMENT_STARTED_EVENT_ID,
      displayName: 'Payment Started',
      description: 'A buyer started a Cedros Pay checkout or payment attempt.',
      category: 'commerce',
      visibility: 'public',
    },
    {
      id: CEDROS_PAY_PAYMENT_SUCCEEDED_EVENT_ID,
      displayName: 'Payment Succeeded',
      description: 'A Cedros Pay checkout or payment completed successfully.',
      category: 'commerce',
      kind: 'purchase_completion',
      visibility: 'authenticated',
    },
    {
      id: CEDROS_PAY_CHECKOUT_SETTLED_EVENT_ID,
      displayName: 'Checkout Settled',
      description: 'A Cedros Pay checkout is settled; Pay may call granted ledger rails for funding or fulfillment.',
      category: 'commerce',
      kind: 'purchase_completion',
      visibility: 'authenticated',
    },
    {
      id: CEDROS_PAY_PAYMENT_FAILED_EVENT_ID,
      displayName: 'Payment Failed',
      description: 'A Cedros Pay checkout or payment attempt failed with a redacted cause code.',
      category: 'commerce',
      visibility: 'authenticated',
    },
    {
      id: CEDROS_PAY_WALLET_CONNECTED_EVENT_ID,
      displayName: 'Wallet Connected',
      description: 'A buyer connected a wallet for an x402 or wallet-based Cedros Pay flow.',
      category: 'commerce',
      visibility: 'public',
    },
    {
      id: CEDROS_PAY_REFUND_SETTLED_EVENT_ID,
      displayName: 'Refund Settled',
      description: 'A Cedros Pay refund completed against a prior checkout or subscription invoice.',
      category: 'commerce',
      visibility: 'admin',
    },
    {
      id: CEDROS_PAY_CHARGEBACK_OPENED_EVENT_ID,
      displayName: 'Chargeback Opened',
      description: 'A chargeback was opened against a Cedros Pay charge.',
      category: 'commerce',
      visibility: 'admin',
    },
    {
      id: CEDROS_PAY_PAYMENT_REVERSED_EVENT_ID,
      displayName: 'Payment Reversed',
      description: 'A Cedros Pay payment was reversed by refund, dispute, chargeback, or manual adjustment.',
      category: 'commerce',
      visibility: 'admin',
    },
    {
      id: CEDROS_PAY_SUBSCRIPTION_STARTED_EVENT_ID,
      displayName: 'Subscription Started',
      description: 'A buyer started a recurring Cedros Pay subscription.',
      category: 'commerce',
      kind: 'subscription_start',
      visibility: 'admin',
    },
    {
      id: CEDROS_PAY_SUBSCRIPTION_CANCELED_EVENT_ID,
      displayName: 'Subscription Canceled',
      description: 'A recurring Cedros Pay subscription was canceled.',
      category: 'commerce',
      kind: 'subscription_cancellation',
      visibility: 'admin',
    },
    {
      id: CEDROS_PAY_DISPUTE_OPENED_EVENT_ID,
      displayName: 'Dispute Opened',
      description: 'A chargeback or payment dispute was opened against a Cedros Pay charge.',
      category: 'commerce',
      visibility: 'admin',
    },
    publicEvent(CEDROS_PAY_PRICING_PAGE_VIEWED_EVENT_ID, 'Pricing Page Viewed'),
    publicEvent(
      CEDROS_PAY_PRICING_BILLING_PERIOD_CHANGED_EVENT_ID,
      'Pricing Billing Period Changed'
    ),
    publicEvent(CEDROS_PAY_PRICING_PLAN_SELECTED_EVENT_ID, 'Pricing Plan Selected'),
    publicEvent(CEDROS_PAY_PRICING_CHECKOUT_STARTED_EVENT_ID, 'Pricing Checkout Started'),
    publicEvent(
      CEDROS_PAY_PRICING_PROGRAM_LINK_CLICKED_EVENT_ID,
      'Pricing Program Link Clicked'
    ),
    publicEvent(CEDROS_PAY_DEVELOPER_PROGRAM_VIEWED_EVENT_ID, 'Developer Program Viewed'),
    publicEvent(CEDROS_PAY_PARTNER_PROGRAM_VIEWED_EVENT_ID, 'Partner Program Viewed'),
    publicEvent(CEDROS_PAY_PROGRAM_APPLICATION_STARTED_EVENT_ID, 'Program Application Started'),
    publicEvent(CEDROS_PAY_PROGRAM_ACTIVATION_ATTEMPTED_EVENT_ID, 'Program Activation Attempted'),
    publicEvent(CEDROS_PAY_PROGRAM_ACTIVATION_SUCCEEDED_EVENT_ID, 'Program Activation Succeeded'),
    publicEvent(CEDROS_PAY_PROGRAM_ACTIVATION_FAILED_EVENT_ID, 'Program Activation Failed'),
  ],
};

function publicEvent(id: string, displayName: string) {
  return {
    id,
    displayName,
    description: `${displayName} on a public Cedros Pay pricing or program surface.`,
    category: 'commerce',
    visibility: 'public' as const,
  };
}
