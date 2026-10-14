/**
 * Stripe webhook endpoint
 *
 * Cedros Pay authenticates Stripe webhooks with a site-generated token carried
 * in the endpoint URL, so the operator's whole job is copying this URL into
 * Stripe and selecting the listed events. The token itself never appears as a
 * field; regenerating it is the only control.
 */

import { useState } from 'react';
import { Icons } from './icons';
import type { WebhookEndpoint } from './configApi';

export interface StripeWebhookEndpointProps {
  serverUrl: string;
  endpoint: WebhookEndpoint;
  /** Clears the token so the next load carries a fresh URL. */
  onRegenerate: () => Promise<void>;
  disabled?: boolean;
}

export function StripeWebhookEndpoint({
  serverUrl,
  endpoint,
  onRegenerate,
  disabled = false,
}: StripeWebhookEndpointProps) {
  const [copied, setCopied] = useState<'url' | 'events' | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  // serverUrl is the Pay runtime base (…/extensions/cedros-pay); the endpoint
  // path is site-relative, so strip the mount before joining.
  const siteBase = serverUrl.replace(/\/+$/, '').replace(/\/extensions\/cedros-pay$/, '');
  const url = `${siteBase}${endpoint.path}`;
  const events = endpoint.events.join(', ');

  const copy = async (kind: 'url' | 'events', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard unavailable (e.g. insecure context); the text stays selectable.
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="cedros-data-field cedros-admin__field cedros-admin__endpoint">
      <span className="cedros-data-label cedros-admin__field-label">Webhook endpoint</span>
      <div className="cedros-admin__endpoint-row">
        <code className="cedros-admin__endpoint-url" data-testid="stripe-webhook-url">
          {url}
        </code>
        <button
          type="button"
          className="cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-data-btn--sm cedros-admin__button--sm"
          onClick={() => copy('url', url)}
        >
          {copied === 'url' ? Icons.check : Icons.copy}
          {copied === 'url' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="cedros-admin__field-description">
        Add this URL as a webhook endpoint in the Stripe Dashboard. It carries a secret token, so
        treat it like a password. Then select these events:
      </div>
      <div className="cedros-admin__endpoint-row">
        <code className="cedros-admin__endpoint-url" data-testid="stripe-webhook-events">
          {events}
        </code>
        <button
          type="button"
          className="cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-data-btn--sm cedros-admin__button--sm"
          onClick={() => copy('events', events)}
        >
          {copied === 'events' ? Icons.check : Icons.copy}
          {copied === 'events' ? 'Copied' : 'Copy events'}
        </button>
      </div>
      <div className="cedros-admin__endpoint-row cedros-admin__endpoint-actions">
        <button
          type="button"
          className="cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-data-btn--sm cedros-admin__button--sm"
          onClick={regenerate}
          disabled={disabled || regenerating}
        >
          {Icons.refresh}
          {regenerating ? 'Regenerating…' : 'Regenerate URL'}
        </button>
        <span className="cedros-admin__field-description">
          Regenerating stops the old URL working. Update the endpoint in Stripe afterwards.
        </span>
      </div>
    </div>
  );
}
