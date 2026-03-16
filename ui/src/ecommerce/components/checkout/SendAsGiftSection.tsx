/**
 * Send as Gift Section
 *
 * Checkout section that lets buyers send any purchase as a gift.
 * Provides recipient email and personal message fields behind a toggle.
 * Works with both gift card products and regular products.
 */

import { useState } from 'react';
import { useCheckout } from '../../state/checkout/useCheckout';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="text-xs text-red-600">{message}</div>;
}

export interface SendAsGiftSectionProps {
  /** When true, the section starts expanded (e.g., for gift card products). */
  defaultOpen?: boolean;
  /** Label shown on the toggle. Defaults to "Send as a gift". */
  label?: string;
}

export function SendAsGiftSection({
  defaultOpen = false,
  label = 'Send as a gift',
}: SendAsGiftSectionProps) {
  const checkout = useCheckout();
  const [isGift, setIsGift] = useState(
    defaultOpen || !!(checkout.values.recipientEmail || checkout.values.giftMessage)
  );

  const handleToggle = () => {
    const next = !isGift;
    setIsGift(next);
    if (!next) {
      checkout.setField('recipientEmail', '');
      checkout.setField('giftMessage', '');
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={isGift}
          onChange={handleToggle}
          className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-800"
        />
        <span className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
          {label}
        </span>
      </label>

      {isGift && (
        <div className="grid gap-3 pl-7">
          <div className="grid gap-2">
            <Label htmlFor="gift-recipient-email">Recipient email</Label>
            <Input
              id="gift-recipient-email"
              type="email"
              value={checkout.values.recipientEmail ?? ''}
              onChange={(e) => checkout.setField('recipientEmail', e.target.value)}
              placeholder="recipient@example.com"
              aria-invalid={Boolean(checkout.fieldErrors.recipientEmail)}
            />
            <FieldError message={checkout.fieldErrors.recipientEmail} />
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              The recipient will receive an email with details on how to claim their gift.
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gift-message">Gift message (optional)</Label>
            <textarea
              id="gift-message"
              value={checkout.values.giftMessage ?? ''}
              onChange={(e) => checkout.setField('giftMessage', e.target.value)}
              placeholder="Add a personal message..."
              maxLength={500}
              rows={3}
              className="w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder-neutral-500"
            />
            {checkout.values.giftMessage && (
              <div className="text-right text-xs text-neutral-400">
                {checkout.values.giftMessage.length}/500
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
