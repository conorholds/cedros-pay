import {
  MoneyField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from './contentSettingsFields';
import { ContentCard } from './contentSettingsLayout';
import { ARTICLE_ACCESS_OPTIONS } from './contentSettingsOptions';
import type { AutosaveStatus } from './useAutosave';
import {
  makePrice,
  readPriceCents,
  readPriceCurrency,
  type MonetizationSettings,
} from './contentSettingsApi';

export function ArticlePaywallCard({
  monetization,
  onChange,
  status,
}: {
  monetization: MonetizationSettings;
  onChange: (patch: Partial<MonetizationSettings>) => void;
  status: AutosaveStatus;
}) {
  const access = monetization.defaultAccessMode;
  const isFree = access === 'free';
  const isPaid = access === 'paid';
  const isSubscription = access === 'subscription';
  const priceCents = readPriceCents(monetization.defaultPrice);
  const priceCurrency = readPriceCurrency(monetization.defaultPrice);

  return (
    <ContentCard
      title="Article paywall"
      description="Set the default access and price for new posts, plus the message readers see when a post is locked. You can still change any individual post later."
      enabled={monetization.enabled}
      onToggleEnabled={(enabled) => onChange({ enabled })}
      offNote="The article paywall is turned off. Turn it on to set defaults — new posts stay free to read until you do."
      status={status}
    >
      <SelectField
        label="Default access for new posts"
        description="How new posts start out. You can still change access on any individual post."
        value={access}
        options={ARTICLE_ACCESS_OPTIONS}
        onChange={(defaultAccessMode) => onChange({ defaultAccessMode })}
      />

      {!isFree && (
        <>
          <div className="cedros-admin__form-row">
            <NumberField
              label="Free preview length"
              description="Opening paragraphs readers see before the paywall. Set 0 to lock the post right away."
              placeholder="2"
              value={monetization.defaultPreviewParagraphs}
              onChange={(value) => onChange({ defaultPreviewParagraphs: value ?? 0 })}
            />
            <NumberField
              label="Free locked reads per month"
              description="Locked posts each reader can open free monthly before they’re asked to pay. Set 0 to require payment every time."
              placeholder="0"
              value={monetization.freeReadsPerMonth}
              onChange={(value) => onChange({ freeReadsPerMonth: value ?? 0 })}
            />
          </div>

          {isPaid && (
            <MoneyField
              label="Price per article"
              description="What it costs to unlock one post — the same price on every payment method (card, crypto, or credits). Leave blank to unlock by subscription only."
              placeholder="0.00"
              amountCents={priceCents}
              currency={priceCurrency}
              onChange={(amountCents) =>
                onChange({ defaultPrice: makePrice(amountCents, priceCurrency) })
              }
            />
          )}

          {isPaid && (
            <TextField
              label="Subscription for unlimited reads (optional)"
              description="Readers subscribed to this Pay product read every paid post without paying per article. Paste its product ID from your catalog, or leave blank to only sell per-article access."
              placeholder="Paste a subscription product ID"
              value={monetization.subscriptionProductId}
              onChange={(subscriptionProductId) => onChange({ subscriptionProductId })}
            />
          )}

          {isSubscription && (
            <TextField
              label="Subscription that unlocks posts"
              description="Readers subscribed to this Pay product get full access to subscriber-only posts. Paste its product ID from your catalog."
              placeholder="Paste a subscription product ID"
              value={monetization.subscriptionProductId}
              onChange={(subscriptionProductId) => onChange({ subscriptionProductId })}
            />
          )}

          <TextAreaField
            label="Locked post message"
            description="What readers see when they reach a locked post. Keep it short and inviting."
            placeholder="Subscribe or buy access to keep reading."
            value={monetization.lockedMessage}
            onChange={(lockedMessage) => onChange({ lockedMessage })}
            rows={3}
          />
        </>
      )}
    </ContentCard>
  );
}
