import { TextAreaField, TextField } from './contentSettingsFields';
import { AmountChipsField } from './contentSettingsControls';
import { ContentCard } from './contentSettingsLayout';
import type { AutosaveStatus } from './useAutosave';
import type { TippingSettings } from './contentSettingsApi';

export function TippingCard({
  tipping,
  onChange,
  status,
  cryptoReady,
  cryptoEnabled,
}: {
  tipping: TippingSettings;
  onChange: (patch: Partial<TippingSettings>) => void;
  status: AutosaveStatus;
  cryptoReady: boolean;
  cryptoEnabled: boolean;
}) {
  const disabledNote = cryptoEnabled
    ? 'Add a payout wallet and payment token in Crypto before enabling tipping. Tips use that wallet and token.'
    : 'Turn on Crypto to enable tipping. Tips use the Crypto payout wallet and payment token.';

  return (
    <ContentCard
      title="Tipping"
      description="Let readers leave a tip on your posts. They pick an amount and pay with the Crypto payment token; funds settle to the Crypto payout wallet."
      enabled={tipping.enabled}
      onToggleEnabled={(enabled) => onChange({ enabled })}
      offNote="Tipping is turned off. Turn it on to set it up — Cedros won't show a tip button on your posts until you do."
      disabledNote={disabledNote}
      toggleDisabled={!cryptoReady}
      status={status}
    >
      <AmountChipsField
        label="Quick tip amounts"
        description="One-tap amounts shown in the tip dialog. Readers can still enter a custom amount."
        placeholder="Add an amount (e.g. 5)"
        value={tipping.presets}
        onChange={(presets) => onChange({ presets })}
      />
      <TextField
        label="Button text"
        placeholder="Tip"
        description="What the tip button says on your posts."
        value={tipping.label}
        onChange={(label) => onChange({ label })}
      />
      <TextAreaField
        label="Tip dialog message"
        description="Optional. A short, friendly line shown in the tip dialog."
        placeholder="Thanks for supporting independent writing!"
        value={tipping.description}
        onChange={(description) => onChange({ description })}
        rows={3}
      />
    </ContentCard>
  );
}
