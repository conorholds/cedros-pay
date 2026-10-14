import { EmptyState } from './EmptyState';
import { Icons } from './icons';
import { SolanaSubscriptionPlanSettings } from './SolanaSubscriptionPlanSettings';
import { PlanBadge, PlanNumberField, PlanTextField } from './SubscriptionPlanCardFields';
import type { SubscriptionPlan } from './types';
import { AnimatedDisclosure } from './AnimatedDisclosure';

interface SubscriptionPlanCardProps {
  index: number;
  isExpanded: boolean;
  inventoryEnabled?: boolean;
  plan: SubscriptionPlan;
  planCount: number;
  onAddFeature: (planId: string) => void;
  onDelete: (planId: string) => void;
  onDeleteFeature: (planId: string, featureIndex: number) => void;
  onMove: (planId: string, direction: 'up' | 'down') => void;
  onToggleExpanded: (planId: string) => void;
  onUpdate: (planId: string, updates: Partial<SubscriptionPlan>) => void;
  onUpdateFeature: (planId: string, featureIndex: number, value: string) => void;
}

function PlanSummary({
  index,
  isExpanded,
  plan,
  planCount,
  onDelete,
  onMove,
  onToggleExpanded,
}: Pick<
  SubscriptionPlanCardProps,
  'index' | 'isExpanded' | 'plan' | 'planCount' | 'onDelete' | 'onMove' | 'onToggleExpanded'
>) {
  const planName = plan.title || 'Untitled plan';
  return (
    <div className="cedros-admin__plan-summary">
      <button
        type="button"
        className="cedros-admin__plan-summary-toggle"
        onClick={() => onToggleExpanded(plan.id)}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${planName} plan`}
      >
        <span aria-hidden="true">{isExpanded ? Icons.chevronDown : Icons.chevronRight}</span>
        <span className="cedros-admin__plan-summary-main">
          <span className="cedros-admin__plan-summary-title">{planName}</span>
          {plan.isPopular && <PlanBadge tone="primary">Popular</PlanBadge>}
          {!plan.isActive && <PlanBadge tone="muted">Inactive</PlanBadge>}
          {plan.public === false && <PlanBadge tone="muted">Private</PlanBadge>}
          {plan.solanaSubscription?.enabled && <PlanBadge tone="success">Solana</PlanBadge>}
        </span>
        <span className="cedros-admin__plan-summary-price">
          ${plan.priceMonthlyUsd}/mo · ${plan.priceAnnualUsd}/yr
        </span>
      </button>
      <div className="cedros-admin__plan-summary-actions">
        <button
          type="button"
          className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost"
          onClick={() => onMove(plan.id, 'up')}
          disabled={index === 0}
          title="Move up"
          aria-label={`Move ${planName} up`}
          style={{ padding: '4px 8px' }}
        >
          {Icons.chevronUp}
        </button>
        <button
          type="button"
          className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost"
          onClick={() => onMove(plan.id, 'down')}
          disabled={index === planCount - 1}
          title="Move down"
          aria-label={`Move ${planName} down`}
          style={{ padding: '4px 8px' }}
        >
          {Icons.chevronDown}
        </button>
        <button
          type="button"
          className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost"
          onClick={() => onDelete(plan.id)}
          title="Delete plan"
          aria-label={`Delete ${planName} plan`}
          style={{ padding: '4px 8px', color: 'var(--pay-admin-error)' }}
        >
          {Icons.trash}
        </button>
      </div>
    </div>
  );
}

function PlanDescriptionField({
  plan,
  onUpdate,
}: Pick<SubscriptionPlanCardProps, 'plan' | 'onUpdate'>) {
  return (
    <div className="cedros-admin__form-row">
      <div className="cedros-data-field cedros-admin__field" style={{ flex: 1 }}>
        <label className="cedros-data-label cedros-admin__field-label">Description</label>
        <input
          type="text"
          className="cedros-data-input cedros-admin__input"
          value={plan.description}
          onChange={(event) => onUpdate(plan.id, { description: event.target.value })}
          placeholder="For entry-level developers managing lightweight workloads"
        />
      </div>
    </div>
  );
}

function PlanHighlightField({
  plan,
  onUpdate,
}: Pick<SubscriptionPlanCardProps, 'plan' | 'onUpdate'>) {
  return (
    <div className="cedros-admin__form-row">
      <div className="cedros-data-field cedros-admin__field">
        <label className="cedros-data-label cedros-admin__field-label">Feature highlight</label>
        <input
          type="text"
          className="cedros-data-input cedros-admin__input"
          value={plan.featureHighlight || ''}
          onChange={(event) => onUpdate(plan.id, { featureHighlight: event.target.value })}
          placeholder="100 prompts every 5 hours"
        />
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
          Bold text shown above feature list
        </div>
      </div>
    </div>
  );
}

function PlanFlags({
  plan,
  onUpdate,
}: Pick<SubscriptionPlanCardProps, 'plan' | 'onUpdate'>) {
  return (
    <div className="cedros-admin__form-row">
      <div className="cedros-data-field cedros-admin__field">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={plan.isPopular || false}
            onChange={(event) => onUpdate(plan.id, { isPopular: event.target.checked })}
          />
          Mark as Popular (featured styling)
        </label>
      </div>
      <div className="cedros-data-field cedros-admin__field">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={plan.isActive}
            onChange={(event) => onUpdate(plan.id, { isActive: event.target.checked })}
          />
          Active (available for purchase)
        </label>
      </div>
      <div className="cedros-data-field cedros-admin__field">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={plan.public !== false}
            onChange={(event) => onUpdate(plan.id, { public: event.target.checked })}
          />
          Public (shown in plan selection)
        </label>
      </div>
    </div>
  );
}

function PlanInventoryFields({
  plan,
  onUpdate,
}: Pick<SubscriptionPlanCardProps, 'plan' | 'onUpdate'>) {
  return (
    <div className="cedros-admin__form-row" style={{ marginTop: '0.5rem' }}>
      <div className="cedros-data-field cedros-admin__field">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={plan.inventoryQuantity != null}
            onChange={(event) =>
              onUpdate(plan.id, { inventoryQuantity: event.target.checked ? 100 : null })
            }
          />
          Limit quantity available
        </label>
      </div>
      {plan.inventoryQuantity != null && (
        <div className="cedros-data-field cedros-admin__field">
          <label className="cedros-data-label cedros-admin__field-label">Total available</label>
          <input
            type="number"
            className="cedros-data-input cedros-admin__input"
            value={plan.inventoryQuantity ?? ''}
            onChange={(event) =>
              onUpdate(plan.id, { inventoryQuantity: parseInt(event.target.value) || 0 })
            }
            min="0"
            style={{ width: 100 }}
          />
          {plan.inventorySold != null && plan.inventorySold > 0 && (
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
              {plan.inventorySold} sold · {Math.max(0, plan.inventoryQuantity - plan.inventorySold)} remaining
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanFeatureList({
  plan,
  onAddFeature,
  onDeleteFeature,
  onUpdateFeature,
}: Pick<SubscriptionPlanCardProps, 'plan' | 'onAddFeature' | 'onDeleteFeature' | 'onUpdateFeature'>) {
  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <label className="cedros-data-label cedros-admin__field-label" style={{ margin: 0 }}>
          Feature list ({plan.features.length})
        </label>
        <button
          type="button"
          className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost"
          onClick={() => onAddFeature(plan.id)}
          style={{ fontSize: 12, padding: '4px 8px' }}
        >
          + Add feature
        </button>
      </div>
      {plan.features.length === 0 ? (
        <EmptyState
          title="No features yet"
          description={'Click "Add feature" to add bullet points.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {plan.features.map((feature, featureIndex) => (
            <div key={featureIndex} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ opacity: 0.4, fontSize: 12 }}>{featureIndex + 1}.</span>
              <input
                type="text"
                className="cedros-data-input cedros-admin__input"
                value={feature}
                onChange={(event) => onUpdateFeature(plan.id, featureIndex, event.target.value)}
                placeholder="e.g., Powered by MiniMax M2.1"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost"
                onClick={() => onDeleteFeature(plan.id, featureIndex)}
                style={{ padding: '4px 8px', color: 'var(--pay-admin-error)' }}
                title="Remove feature"
                aria-label={`Remove feature ${featureIndex + 1} from ${plan.title || 'Untitled plan'}`}
              >
                {Icons.trash}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanDetails({
  plan,
  onAddFeature,
  onDeleteFeature,
  inventoryEnabled = true,
  onUpdate,
  onUpdateFeature,
}: Pick<
  SubscriptionPlanCardProps,
  'plan' | 'onAddFeature' | 'onDeleteFeature' | 'inventoryEnabled' | 'onUpdate' | 'onUpdateFeature'
>) {
  return (
    <div style={{ padding: '1rem', borderTop: '1px solid var(--pay-admin-border)' }}>
      <div className="cedros-admin__form-row">
        <PlanTextField
          label="Plan name"
          value={plan.title}
          onChange={(title) => onUpdate(plan.id, { title })}
          placeholder="e.g., Starter"
        />
        <PlanTextField
          label="Button text"
          value={plan.buttonText || ''}
          onChange={(buttonText) => onUpdate(plan.id, { buttonText })}
          placeholder="Purchase"
        />
      </div>
      <PlanDescriptionField plan={plan} onUpdate={onUpdate} />
      <div className="cedros-admin__form-row">
        <PlanNumberField
          label="Monthly price (USD)"
          value={plan.priceMonthlyUsd}
          onChange={(priceMonthlyUsd) => onUpdate(plan.id, { priceMonthlyUsd })}
          placeholder="10"
        />
        <PlanNumberField
          label="Annual price (USD)"
          value={plan.priceAnnualUsd}
          onChange={(priceAnnualUsd) => onUpdate(plan.id, { priceAnnualUsd })}
          placeholder="100"
        />
      </div>
      <PlanHighlightField plan={plan} onUpdate={onUpdate} />
      <PlanFlags plan={plan} onUpdate={onUpdate} />
      {inventoryEnabled && <PlanInventoryFields plan={plan} onUpdate={onUpdate} />}
      <SolanaSubscriptionPlanSettings
        plan={plan}
        onChange={(updates) => onUpdate(plan.id, updates)}
      />
      <PlanFeatureList
        plan={plan}
        onAddFeature={onAddFeature}
        onDeleteFeature={onDeleteFeature}
        onUpdateFeature={onUpdateFeature}
      />
    </div>
  );
}

export function SubscriptionPlanCard(props: SubscriptionPlanCardProps) {
  return (
    <div
      style={{
        border: '1px solid var(--pay-admin-border)',
        borderRadius: 'var(--pay-admin-radius-surface)',
        overflow: 'hidden',
        background: props.plan.isPopular ? 'var(--pay-admin-accent)' : undefined,
      }}
    >
      <PlanSummary {...props} />
      <AnimatedDisclosure open={props.isExpanded}>
        <PlanDetails
          plan={props.plan}
          onAddFeature={props.onAddFeature}
          onDeleteFeature={props.onDeleteFeature}
          inventoryEnabled={props.inventoryEnabled}
          onUpdate={props.onUpdate}
          onUpdateFeature={props.onUpdateFeature}
        />
      </AnimatedDisclosure>
    </div>
  );
}
