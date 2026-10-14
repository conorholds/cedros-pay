import {
  CEDROS_PAY_CHECKOUT_FORM_TEMPLATE_ID,
  CEDROS_PAY_REFUND_RETURNS_POLICY_ID,
  CEDROS_PAY_REFUND_FORM_TEMPLATE_ID,
} from './constants';
import type {
  CedrosExtensionDocsArticleManifest,
  CedrosExtensionFormTemplateManifest,
  CedrosExtensionPolicyManifest,
} from './types';

const REFUND_RETURNS_POLICY_BODY_MARKDOWN = [
  '## Refund & Returns Policy',
  '',
  'Owner review required: this starter policy is not legal advice. Replace every placeholder with your business-specific terms before publishing.',
  '',
  '### Refund window',
  '',
  'Customers may request a refund within [REFUND WINDOW, e.g. 14 days] after purchase or delivery. Requests outside this window are reviewed only when required by applicable rules or an owner-approved exception.',
  '',
  '### Eligible purchases',
  '',
  'Refunds may be available for [ELIGIBLE PURCHASE TYPES], including duplicate charges, failed checkout fulfillment, or products that arrive materially different from the approved order details.',
  '',
  '### Ineligible purchases',
  '',
  'Refunds are generally not available for [INELIGIBLE PURCHASE TYPES], including completed custom work, final-sale items, misuse, or purchases that cannot be verified with an order reference.',
  '',
  '### Return condition',
  '',
  'Returned physical goods must be [RETURN CONDITION, e.g. unused, in original packaging, with accessories included] unless the item arrived damaged or applicable rules require another outcome.',
  '',
  '### Digital goods',
  '',
  'Digital goods, downloads, API credits, wallet-based access, and paywalled content are [DIGITAL GOODS TERMS, e.g. non-refundable once delivered or accessed] except where required by law or owner-approved policy.',
  '',
  '### Subscriptions',
  '',
  'Subscription cancellations stop future renewals. Refunds for current or prior subscription periods follow [SUBSCRIPTION REFUND TERMS], including any trial, partial-period, or usage-based rules.',
  '',
  '### Processing time',
  '',
  'Approved refunds are submitted within [PROCESSING TIME, e.g. 5-10 business days]. Banks, card networks, wallets, and payment providers may take additional time to post funds.',
  '',
  '### Shipping and restocking',
  '',
  'If returns require shipping, state who pays return shipping, whether original shipping is refundable, and whether any [RESTOCKING FEE] applies. Do not charge shipping or restocking fees unless the site owner has approved them.',
  '',
  '### Support contact',
  '',
  'To request help, contact [SUPPORT CONTACT EMAIL OR FORM URL] with your order reference, purchase date, item or plan name, and the reason for the request.',
].join('\n');

export const cedrosPayFormTemplates: CedrosExtensionFormTemplateManifest[] = [
  {
    id: CEDROS_PAY_CHECKOUT_FORM_TEMPLATE_ID,
    displayName: 'Manual Payment Request',
    title: 'Request a Manual Purchase',
    description:
      'Owner-editable intake form for purchases that require human follow-up; this form does not collect payment.',
    defaultKey: 'checkout',
    status: 'active',
    scope: 'contact',
    submitLabel: 'Send purchase request',
    successTitle: 'Purchase request received',
    successMessage:
      'We received your purchase request. No payment has been collected. The site owner will follow up with next steps.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Your name' },
      { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
      { key: 'item', label: 'Item or plan', type: 'text', required: true, placeholder: 'Product, service, or plan name' },
      { key: 'quantity', label: 'Quantity', type: 'text', required: false, placeholder: '1' },
      { key: 'notes', label: 'Checkout notes', type: 'textarea', required: false, placeholder: 'Add sizing, delivery, or billing details.' },
      {
        key: 'checkout_consent',
        label: 'I consent to this site using my submitted details to prepare this checkout.',
        type: 'checkbox',
        required: true,
        helpText: 'The site owner should review this consent text before publishing.',
      },
    ],
  },
  {
    id: CEDROS_PAY_REFUND_FORM_TEMPLATE_ID,
    displayName: 'Refund Support Request',
    title: 'Request Refund Support',
    description:
      'Owner-editable support intake for prior Cedros Pay purchases; submitting this form does not issue or approve a refund.',
    defaultKey: 'refund',
    status: 'active',
    scope: 'contact',
    submitLabel: 'Submit refund request',
    successTitle: 'Refund request received',
    successMessage:
      'We received your refund request. No refund has been issued or approved. The site owner will review it against the refund policy.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Your name' },
      { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
      { key: 'order_reference', label: 'Order reference', type: 'text', required: true, placeholder: 'Order, invoice, or receipt reference' },
      {
        key: 'refund_reason',
        label: 'Refund reason',
        type: 'select',
        required: true,
        options: [
          { label: 'Duplicate charge', value: 'duplicate_charge' },
          { label: 'Order not fulfilled', value: 'order_not_fulfilled' },
          { label: 'Wrong item or plan', value: 'wrong_item_or_plan' },
          { label: 'Canceled subscription', value: 'canceled_subscription' },
          { label: 'Other', value: 'other' },
        ],
      },
      { key: 'details', label: 'Refund details', type: 'textarea', required: true, placeholder: 'Describe the purchase and requested refund.' },
      {
        key: 'refund_consent',
        label: 'I consent to this site using my submitted details to review this refund request.',
        type: 'checkbox',
        required: true,
        helpText: 'The site owner should review this consent text before publishing.',
      },
    ],
  },
  programApplicationForm(
    'cedros-pay:ambassador-application-form',
    'Cedros Ambassador Program Application',
    'ambassador-program-application',
    'Ambassador Program',
    [
      { label: 'Education or demonstrations', value: 'education' },
      { label: 'Community participation', value: 'community' },
      { label: 'Feedback and product learning', value: 'feedback' },
      { label: 'Approved public advocacy', value: 'advocacy' },
    ]
  ),
  programApplicationForm(
    'cedros-pay:affiliate-application-form',
    'Cedros Affiliate Program Application',
    'affiliate-program-application',
    'Affiliate Program',
    [
      { label: 'Content and education', value: 'content' },
      { label: 'Client or professional network', value: 'network' },
      { label: 'Community referrals', value: 'community' },
      { label: 'Other approved referral activity', value: 'other' },
    ]
  ),
  programApplicationForm(
    'cedros-pay:sales-partner-application-form',
    'Cedros Independent Sales Partner Program Application',
    'sales-partner-program-application',
    'Independent Sales Partner Program',
    [
      { label: 'Source and qualify leads', value: 'source-qualify' },
      { label: 'Refer prospective customers', value: 'refer' },
      { label: 'Assist with customer evaluation', value: 'assist' },
      { label: 'Support approved sales conversations', value: 'sales-support' },
    ]
  ),
];

function programApplicationForm(
  id: string,
  displayName: string,
  defaultKey: string,
  programLabel: string,
  participationOptions: Array<{ label: string; value: string }>
): CedrosExtensionFormTemplateManifest {
  return {
    id,
    displayName,
    title: `Apply to the ${programLabel}`,
    description: `Owner-editable interest and eligibility form for the Cedros ${programLabel}.`,
    defaultKey,
    status: 'active',
    scope: 'contact',
    submitLabel: 'Submit application',
    successTitle: 'Application received',
    successMessage:
      'We received your application. Submission does not guarantee approval or program access.',
    autoCreateOnEnable: true,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Your name' },
      {
        key: 'email',
        label: 'Email address',
        type: 'email',
        required: true,
        placeholder: 'you@example.com',
      },
      {
        key: 'participation_type',
        label: 'How would you participate?',
        type: 'select',
        required: true,
        options: participationOptions,
      },
      {
        key: 'experience',
        label: 'Relevant experience and audience',
        type: 'textarea',
        required: true,
        placeholder: 'Tell us how you work and who you help. Do not include private customer data.',
      },
      {
        key: 'program_consent',
        label: 'I agree to be contacted about this program application.',
        type: 'checkbox',
        required: true,
        helpText: 'Applying does not create a pricing entitlement or guarantee acceptance.',
      },
    ],
  };
}

export const cedrosPayDocsArticles: CedrosExtensionDocsArticleManifest[] = [];

export const cedrosPayPolicies: CedrosExtensionPolicyManifest[] = [
  {
    id: CEDROS_PAY_REFUND_RETURNS_POLICY_ID,
    kind: 'refund-returns-policy',
    displayName: 'Refund & Returns Policy',
    title: 'Refund & Returns Policy',
    slug: 'refund-returns',
    routePath: '/refund-returns',
    footerLabel: 'Refund & Returns Policy',
    excerpt: 'Owner-reviewed refund and return rules for Cedros Pay checkout.',
    bodyMarkdown: REFUND_RETURNS_POLICY_BODY_MARKDOWN,
    category: 'legal',
    tags: ['refunds', 'returns', 'payments'],
    seo: {
      title: 'Refund & Returns Policy',
      description: 'Owner-reviewed refund and return rules for Cedros Pay checkout.',
      ogTitle: 'Refund & Returns Policy',
      ogDescription: 'Review refund, return, subscription, digital goods, and support terms for Cedros Pay checkout.',
      noindex: true,
    },
  },
];
