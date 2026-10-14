/**
 * Subscription page copy
 *
 * The words that decorate the plan grid buyers choose from. It lives beside the
 * plans it labels, and every field is attached to a preview of the surface it
 * renders on, so the operator edits the result rather than the storage.
 *
 * Copy autosaves through the field-masked subscription-settings protocol
 * (If-Match + update mask); plan fields keep their own whole-settings save.
 */

import { useCallback, useId } from 'react';
import {
  AutosaveStatusIndicator,
  useCedrosAutosave,
  type CedrosAutosaveSaveMetadata,
} from '../../autosave';
import { AdvancedDetails } from './contentSettingsLayout';
import {
  SUBSCRIPTION_PAGE_AUTOSAVE_RESOURCE,
  autosaveSubscriptionPageSettings,
  makeSubscriptionPagePatch,
  subscriptionPageUpdateMask,
} from './subscriptionAutosaveApi';
import {
  DEFAULT_SUBSCRIPTION_SETTINGS,
  readSubscriptionPageCopySettings,
} from './subscriptionSettingsModel';
import type { SubscriptionPageCopySettings } from './subscriptionSettingsModel';
import type { IAdminAuthManager } from './AdminAuthManager';
import type { AutosaveStatus } from './useAutosave';

function statusClass(status: AutosaveStatus): string {
  if (status === 'failed') return 'error';
  return status;
}

function CopyField({
  disabled,
  label,
  onChange,
  placeholder,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string | undefined;
}) {
  const fieldId = useId();
  return (
    <div className="cedros-data-field cedros-admin__field">
      <label className="cedros-data-label cedros-admin__field-label" htmlFor={fieldId}>
        {label}
      </label>
      <input
        id={fieldId}
        type="text"
        className="cedros-data-input cedros-admin__input"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

export function SubscriptionPageCopyCard({
  authManager,
  disabled = false,
  draft,
  etag,
  onChange,
  onConflict,
  onFailure,
  onSaved,
  persistenceScope,
  revision,
}: {
  authManager: IAdminAuthManager | undefined;
  disabled?: boolean;
  draft: SubscriptionPageCopySettings;
  etag: string;
  onChange: (patch: Partial<SubscriptionPageCopySettings>) => void;
  onConflict: () => void;
  onFailure: () => void;
  onSaved: (result: { revision?: number | string; etag?: string }) => void;
  persistenceScope?: string;
  revision: number;
}) {
  const titleId = useId();

  const save = useCallback(
    async (
      patch: Partial<SubscriptionPageCopySettings>,
      metadata: CedrosAutosaveSaveMetadata
    ) => {
      const result = await autosaveSubscriptionPageSettings(authManager, patch, metadata);
      onSaved({ revision: result.revision, etag: result.etag });
      return {
        ...result,
        canonicalPatchOrResource: result.canonicalPatchOrResource
          ? readSubscriptionPageCopySettings(result.canonicalPatchOrResource)
          : undefined,
      };
    },
    [authManager, onSaved]
  );

  const autosave = useCedrosAutosave<
    Partial<SubscriptionPageCopySettings>,
    SubscriptionPageCopySettings
  >({
    extensionId: SUBSCRIPTION_PAGE_AUTOSAVE_RESOURCE.extensionId,
    resourceType: SUBSCRIPTION_PAGE_AUTOSAVE_RESOURCE.resourceType,
    resourceId: persistenceScope
      ? `default:${persistenceScope}`
      : SUBSCRIPTION_PAGE_AUTOSAVE_RESOURCE.deriveResourceId(draft),
    baseRevision: revision,
    etag,
    draft,
    makePatch: makeSubscriptionPagePatch,
    validatePatch: SUBSCRIPTION_PAGE_AUTOSAVE_RESOURCE.validatePatch,
    save,
    getUpdateMask: subscriptionPageUpdateMask,
    debounceProfile: SUBSCRIPTION_PAGE_AUTOSAVE_RESOURCE.debounceProfile,
    conflictStrategy: SUBSCRIPTION_PAGE_AUTOSAVE_RESOURCE.conflictStrategy,
    persistenceKey: persistenceScope
      ? `subscription-settings:${persistenceScope}:page-copy`
      : undefined,
    blockedFields: SUBSCRIPTION_PAGE_AUTOSAVE_RESOURCE.blockedFields,
    enabled: !disabled,
    onConflict,
    onPermanentFailure: onFailure,
  });

  const previewTitle = draft.pageTitle?.trim() || DEFAULT_SUBSCRIPTION_SETTINGS.pageTitle;
  const previewSubtitle = draft.pageSubtitle?.trim() || DEFAULT_SUBSCRIPTION_SETTINGS.pageSubtitle;
  const popularBadge =
    draft.popularBadgeText?.trim() || DEFAULT_SUBSCRIPTION_SETTINGS.popularBadgeText;
  const annualBadge =
    draft.annualSavingsBadge?.trim() || DEFAULT_SUBSCRIPTION_SETTINGS.annualSavingsBadge;
  const footerNotice = draft.footerNotice?.trim();

  return (
    <section
      className="cedros-data-card cedros-admin__section cedros-admin__plan-page"
      aria-labelledby={titleId}
    >
      <div className="cedros-admin__section-header">
        <h3 id={titleId} className="cedros-admin__section-title">
          Plan page
        </h3>
        <AutosaveStatusIndicator
          status={autosave.status}
          className={`cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${statusClass(autosave.status)}`}
        />
      </div>

      <div className="cedros-admin__preview">
        <span className="cedros-admin__preview-label">Buyers see</span>
        <div className="cedros-admin__preview-surface" aria-hidden="true">
          <p className="cedros-admin__preview-title">{previewTitle}</p>
          <p className="cedros-admin__preview-subtitle">{previewSubtitle}</p>
          <div className="cedros-admin__preview-badges">
            <span className="cedros-admin__preview-badge">{popularBadge}</span>
            <span className="cedros-admin__preview-badge">{annualBadge}</span>
          </div>
          {footerNotice ? (
            <p className="cedros-admin__preview-footer">{footerNotice}</p>
          ) : null}
        </div>
      </div>

      <div className="cedros-admin__form-row">
        <CopyField
          label="Heading"
          value={draft.pageTitle}
          onChange={(value) => onChange({ pageTitle: value })}
          placeholder={DEFAULT_SUBSCRIPTION_SETTINGS.pageTitle}
          disabled={disabled}
        />
        <CopyField
          label="Subheading"
          value={draft.pageSubtitle}
          onChange={(value) => onChange({ pageSubtitle: value })}
          placeholder={DEFAULT_SUBSCRIPTION_SETTINGS.pageSubtitle}
          disabled={disabled}
        />
      </div>

      <AdvancedDetails label="Badges and footer">
        <div className="cedros-admin__form-row">
          <CopyField
            label="Popular plan badge"
            value={draft.popularBadgeText}
            onChange={(value) => onChange({ popularBadgeText: value })}
            placeholder={DEFAULT_SUBSCRIPTION_SETTINGS.popularBadgeText}
            disabled={disabled}
          />
          <CopyField
            label="Annual savings badge"
            value={draft.annualSavingsBadge}
            onChange={(value) => onChange({ annualSavingsBadge: value })}
            placeholder={DEFAULT_SUBSCRIPTION_SETTINGS.annualSavingsBadge}
            disabled={disabled}
          />
        </div>
        <div className="cedros-admin__form-row">
          <CopyField
            label="Footer notice (optional)"
            value={draft.footerNotice}
            onChange={(value) => onChange({ footerNotice: value })}
            placeholder="For invoices and taxes, contact support."
            disabled={disabled}
          />
        </div>
      </AdvancedDetails>
    </section>
  );
}
