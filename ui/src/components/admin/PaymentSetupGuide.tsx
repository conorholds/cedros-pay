import type { ReactNode } from 'react';

interface SetupItem {
  title: string;
  description: ReactNode;
  steps: string[];
}

interface PaymentSetupGuideProps {
  serverUrl: string;
}

const FULL_GUIDE_URL =
  'https://github.com/conorholds/cedros-pay/tree/main/ui/docs/cross-channel-setup.md';

function GuideCard({ title, description, steps }: SetupItem) {
  return (
    <div
      style={{
        border: '1px solid var(--cedros-admin-border, #e5e7eb)',
        borderRadius: '0.75rem',
        padding: '1rem',
        background: 'var(--cedros-admin-surface, #ffffff)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{title}</div>
      <div
        style={{
          color: 'var(--cedros-admin-text-muted, #64748b)',
          fontSize: '0.9rem',
          marginBottom: '0.75rem',
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
      <ol style={{ margin: 0, paddingLeft: '1.1rem', lineHeight: 1.6, fontSize: '0.9rem' }}>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

function CodeLine({ children }: { children: ReactNode }) {
  return (
    <code
      style={{
        display: 'block',
        padding: '0.65rem 0.75rem',
        background: 'rgba(15, 23, 42, 0.04)',
        borderRadius: '0.5rem',
        marginTop: '0.5rem',
        wordBreak: 'break-all',
      }}
    >
      {children}
    </code>
  );
}

export function PaymentSetupGuide({ serverUrl }: PaymentSetupGuideProps) {
  const stripeWebhookUrl = `${serverUrl.replace(/\/$/, '')}/webhook/stripe`;
  const appleNotificationUrl = `${serverUrl.replace(/\/$/, '')}/paywall/v1/native-store/apple/notifications`;
  const googleNotificationUrl = `${serverUrl.replace(/\/$/, '')}/paywall/v1/native-store/google/notifications`;

  const cards: SetupItem[] = [
    {
      title: 'Stripe Web Checkout',
      description:
        'Use this for website payments and any mobile redirect Checkout flows. Cedros owns the checkout session creation, but Stripe still needs your API keys and webhook endpoint configured.',
      steps: [
        'Add your Stripe publishable key, secret key, and webhook signing secret in Payment Options → Stripe.',
        'Create a Stripe webhook endpoint that sends subscription and checkout events to the Cedros webhook URL shown below.',
        'If your app uses custom deep links for Stripe redirects, add the scheme in Stripe → allowed redirect schemes.',
      ],
    },
    {
      title: 'Apple App Store Billing',
      description:
        'Use this for digital goods and subscriptions distributed through the Apple App Store. Cedros verifies purchases and handles server notifications, but you still need to create App Store Connect products and credentials.',
      steps: [
        'In Products, map each store-managed product to its Apple product ID and choose the correct store-managed kind.',
        'In Payment Options → App Stores, enter your App Store Server API issuer ID, key ID, private key, and bundle ID.',
        'Create the matching products and subscriptions in App Store Connect, then point App Store Server Notifications at the Cedros Apple notification URL.',
        'If you rely on reader, US external purchase link, or similar exceptions, configure those policies in the app build and only after Apple approves the relevant entitlement.',
      ],
    },
    {
      title: 'Google Play Billing',
      description:
        'Use this for digital goods and subscriptions distributed through Google Play. Cedros verifies purchases, acknowledges them server-side, and processes RTDNs, but you still need Play Console catalog and service-account setup.',
      steps: [
        'In Products, map each Play product ID and, for subscriptions, the package name, base plan ID, and optional offer ID.',
        'In Payment Options → App Stores, enter your Google Play service-account email, private key, package name, push service-account email, and push audience.',
        'Create the matching one-time products or subscriptions in Google Play Console and point RTDN delivery at the Cedros Google notification URL.',
        'If you participate in User Choice Billing, Alternative Billing Only, or External Offers programs, configure those policies explicitly in the app build only for approved storefronts.',
      ],
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gap: '1rem',
        marginBottom: '1rem',
      }}
    >
      <div
        style={{
          padding: '1rem',
          borderRadius: '0.75rem',
          background: 'var(--cedros-admin-subtle, rgba(15, 23, 42, 0.03))',
          border: '1px solid var(--cedros-admin-border, #e5e7eb)',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Turnkey setup path</div>
        <div
          style={{
            color: 'var(--cedros-admin-text-muted, #64748b)',
            lineHeight: 1.6,
            fontSize: '0.9rem',
          }}
        >
          Create the product once in Cedros, configure each payment channel here, then point Stripe, App Store Connect, and Google Play Console at the Cedros endpoints below. Cedros packages can then load the same product catalog and apply the right rail at runtime.
        </div>
        <CodeLine>{stripeWebhookUrl}</CodeLine>
        <CodeLine>{appleNotificationUrl}</CodeLine>
        <CodeLine>{googleNotificationUrl}</CodeLine>
        <div
          style={{
            marginTop: '0.5rem',
            color: 'var(--cedros-admin-text-muted, #64748b)',
            fontSize: '0.8rem',
            lineHeight: 1.5,
          }}
        >
          Store notifications must target a tenant-specific Cedros deployment URL. If your deployment injects tenant context via domain, path prefix, or headers, use that tenant-scoped URL here instead of a generic shared endpoint.
        </div>
        <a
          href={FULL_GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: '0.75rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'underline',
            color: 'inherit',
          }}
        >
          Open the full cross-channel setup guide
        </a>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
        {cards.map((card) => (
          <GuideCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}
