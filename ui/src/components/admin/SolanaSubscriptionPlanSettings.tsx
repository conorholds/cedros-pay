import type { ReactNode } from 'react';
import { SolanaSubscriptionPlanActions } from './SolanaSubscriptionPlanActions';
import type { SolanaSubscriptionPlanConfig, SubscriptionPlan } from './types';

const DEFAULT_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const DEFAULT_PROGRAM = 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44';

interface Props {
  plan: SubscriptionPlan;
  onChange: (updates: Partial<SubscriptionPlan>) => void;
}

export function SolanaSubscriptionPlanSettings({ plan, onChange }: Props) {
  const config = plan.solanaSubscription ?? null;
  const enabled = config?.enabled ?? false;

  const updateConfig = (updates: Partial<SolanaSubscriptionPlanConfig>) => {
    onChange({
      solanaSubscription: {
        ...defaultConfig(),
        ...(config ?? {}),
        ...updates,
      },
    });
  };

  const clearConfig = () => {
    onChange({ solanaSubscription: null });
  };

  return (
    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--pay-admin-border)' }}>
      <div className="cedros-admin__form-row">
        <div className="cedros-data-field cedros-admin__field">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => {
                if (event.target.checked) updateConfig({ enabled: true });
                else clearConfig();
              }}
            />
            Enable Solana subscriptions
          </label>
        </div>
      </div>

      {enabled && config && (
        <>
          <div className="cedros-admin__form-row">
            <Field label="Default plan ID">
              <NumberInput
                value={config.planId}
                onChange={(planId) => updateConfig({ planId })}
                min={0}
              />
            </Field>
            <Field label="Monthly amount atomic">
              <NumberInput
                value={config.monthlyAmountAtomic}
                onChange={(monthlyAmountAtomic) => updateConfig({ monthlyAmountAtomic })}
                min={1}
              />
            </Field>
            <Field label="Monthly period hours">
              <NumberInput
                value={config.monthlyPeriodHours}
                onChange={(monthlyPeriodHours) => updateConfig({ monthlyPeriodHours })}
                min={1}
                max={8760}
              />
            </Field>
          </div>

          <div className="cedros-admin__form-row">
            <Field label="Monthly plan ID">
              <NumberInput
                value={config.monthlyPlanId}
                onChange={(monthlyPlanId) => updateConfig({ monthlyPlanId })}
                min={0}
              />
            </Field>
            <Field label="Annual plan ID">
              <NumberInput
                value={config.annualPlanId}
                onChange={(annualPlanId) => updateConfig({ annualPlanId })}
                min={0}
              />
            </Field>
          </div>

          <div className="cedros-admin__form-row">
            <Field label="Annual amount atomic">
              <NumberInput
                value={config.annualAmountAtomic}
                onChange={(annualAmountAtomic) => updateConfig({ annualAmountAtomic })}
                min={1}
              />
            </Field>
            <Field label="Annual period hours">
              <NumberInput
                value={config.annualPeriodHours}
                onChange={(annualPeriodHours) => updateConfig({ annualPeriodHours })}
                min={1}
                max={8760}
              />
            </Field>
            <Field label="Token program">
              <TextInput
                value={config.tokenProgramAddress}
                placeholder={DEFAULT_TOKEN_PROGRAM}
                onChange={(tokenProgramAddress) => updateConfig({ tokenProgramAddress })}
              />
            </Field>
          </div>

          <div className="cedros-admin__form-row">
            <Field label="Merchant address">
              <TextInput
                value={config.merchantAddress}
                onChange={(merchantAddress) => updateConfig({ merchantAddress })}
              />
            </Field>
            <Field label="Token mint">
              <TextInput
                value={config.tokenMint}
                onChange={(tokenMint) => updateConfig({ tokenMint })}
              />
            </Field>
          </div>

          <div className="cedros-admin__form-row">
            <Field label="Collector address">
              <TextInput
                value={config.collectorAddress}
                onChange={(collectorAddress) => updateConfig({ collectorAddress })}
              />
            </Field>
            <Field label="Receiver token account">
              <TextInput
                value={config.receiverTokenAccount}
                onChange={(receiverTokenAccount) => updateConfig({ receiverTokenAccount })}
              />
            </Field>
          </div>

          <div className="cedros-admin__form-row">
            <Field label="Program address">
              <TextInput
                value={config.programAddress}
                placeholder={DEFAULT_PROGRAM}
                onChange={(programAddress) => updateConfig({ programAddress })}
              />
            </Field>
            <Field label="Plan PDA">
              <TextInput
                value={config.planAddress}
                onChange={(planAddress) => updateConfig({ planAddress })}
              />
            </Field>
            <Field label="Monthly plan PDA">
              <TextInput
                value={config.monthlyPlanAddress}
                onChange={(monthlyPlanAddress) => updateConfig({ monthlyPlanAddress })}
              />
            </Field>
          </div>

          <div className="cedros-admin__form-row">
            <Field label="Annual plan PDA">
              <TextInput
                value={config.annualPlanAddress}
                onChange={(annualPlanAddress) => updateConfig({ annualPlanAddress })}
              />
            </Field>
          </div>

          <div className="cedros-admin__form-row">
            <Field label="Expected plan created at">
              <NumberInput
                value={config.expectedCreatedAt}
                onChange={(expectedCreatedAt) => updateConfig({ expectedCreatedAt })}
              />
            </Field>
            <Field label="Monthly created at">
              <NumberInput
                value={config.monthlyExpectedCreatedAt}
                onChange={(monthlyExpectedCreatedAt) => updateConfig({ monthlyExpectedCreatedAt })}
              />
            </Field>
            <Field label="Annual created at">
              <NumberInput
                value={config.annualExpectedCreatedAt}
                onChange={(annualExpectedCreatedAt) => updateConfig({ annualExpectedCreatedAt })}
              />
            </Field>
          </div>

          <div className="cedros-admin__form-row">
            <Field label="Expected authority init ID">
              <NumberInput
                value={config.expectedSubscriptionAuthorityInitId}
                onChange={(expectedSubscriptionAuthorityInitId) =>
                  updateConfig({ expectedSubscriptionAuthorityInitId })}
              />
            </Field>
          </div>

          <div className="cedros-admin__form-row">
            <Field label="Metadata URI">
              <TextInput
                value={config.metadataUri}
                onChange={(metadataUri) => updateConfig({ metadataUri })}
              />
            </Field>
            <Field label="End timestamp">
              <NumberInput
                value={config.endTs}
                onChange={(endTs) => updateConfig({ endTs })}
                min={0}
              />
            </Field>
            <Field label="Plan status">
              <select
                className="cedros-data-input cedros-admin__input"
                value={config.status ?? 'active'}
                onChange={(event) => updateConfig({ status: event.target.value as 'active' | 'sunset' })}
              >
                <option value="active">Active</option>
                <option value="sunset">Sunset</option>
              </select>
            </Field>
          </div>

          <div className="cedros-admin__form-row">
            <Field label="Monthly end timestamp">
              <NumberInput
                value={config.monthlyEndTs}
                onChange={(monthlyEndTs) => updateConfig({ monthlyEndTs })}
                min={0}
              />
            </Field>
            <Field label="Monthly status">
              <select
                className="cedros-data-input cedros-admin__input"
                value={config.monthlyStatus ?? config.status ?? 'active'}
                onChange={(event) => updateConfig({ monthlyStatus: event.target.value as 'active' | 'sunset' })}
              >
                <option value="active">Active</option>
                <option value="sunset">Sunset</option>
              </select>
            </Field>
          </div>

          <div className="cedros-admin__form-row">
            <Field label="Annual end timestamp">
              <NumberInput
                value={config.annualEndTs}
                onChange={(annualEndTs) => updateConfig({ annualEndTs })}
                min={0}
              />
            </Field>
            <Field label="Annual status">
              <select
                className="cedros-data-input cedros-admin__input"
                value={config.annualStatus ?? config.status ?? 'active'}
                onChange={(event) => updateConfig({ annualStatus: event.target.value as 'active' | 'sunset' })}
              >
                <option value="active">Active</option>
                <option value="sunset">Sunset</option>
              </select>
            </Field>
          </div>

          <div className="cedros-admin__form-row">
            <Field label="Destination wallets">
              <TextInput
                value={(config.destinations ?? []).join(', ')}
                onChange={(value) => updateConfig({ destinations: splitList(value) })}
              />
            </Field>
            <Field label="Puller wallets">
              <TextInput
                value={(config.pullers ?? []).join(', ')}
                onChange={(value) => updateConfig({ pullers: splitList(value) })}
              />
            </Field>
          </div>

          <SolanaSubscriptionPlanActions config={config} />
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cedros-data-field cedros-admin__field">
      <label className="cedros-data-label cedros-admin__field-label">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      className="cedros-data-input cedros-admin__input"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(event) => onChange(cleanString(event.target.value))}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      className="cedros-data-input cedros-admin__input"
      value={value ?? ''}
      min={min}
      max={max}
      onChange={(event) => onChange(cleanNumber(event.target.value))}
    />
  );
}

function defaultConfig(): SolanaSubscriptionPlanConfig {
  return {
    enabled: true,
    planId: 0,
    merchantAddress: '',
    tokenMint: '',
    tokenProgramAddress: DEFAULT_TOKEN_PROGRAM,
    programAddress: DEFAULT_PROGRAM,
    monthlyPeriodHours: 720,
    annualPeriodHours: 8760,
    destinations: [],
    pullers: [],
    status: 'active',
    monthlyStatus: 'active',
    annualStatus: 'active',
  };
}

function cleanString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function cleanNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}
