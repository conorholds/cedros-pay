import { InfoLine, SelectField, TextAreaField, TextField } from './contentSettingsFields';
import { AdvancedDetails, ContentCard } from './contentSettingsLayout';
import { MEDIA_ACCESS_OPTIONS, MEDIA_PREVIEW_OPTIONS } from './contentSettingsOptions';
import type { AutosaveStatus } from './useAutosave';
import type { MonetizationSettings } from './contentSettingsApi';

export function GatedMediaCard({
  monetization,
  onChange,
  status,
}: {
  monetization: MonetizationSettings;
  onChange: (patch: Partial<MonetizationSettings>) => void;
  status: AutosaveStatus;
}) {
  const access = monetization.mediaDefaultAccessMode;
  const isPublic = access === 'public';
  const isPreview = access === 'preview';
  const policy = monetization.mediaPreviewPolicy;

  const setPolicy = (patch: Partial<MonetizationSettings['mediaPreviewPolicy']>) =>
    onChange({ mediaPreviewPolicy: { ...policy, ...patch } });

  return (
    <ContentCard
      title="Gated media"
      description="Lock images, video, and downloads by default, and choose what unlocks them."
      enabled={monetization.mediaEnabled}
      onToggleEnabled={(mediaEnabled) => onChange({ mediaEnabled })}
      offNote="Gated media is turned off. Turn it on to set defaults — your images, video, and downloads stay public until you do."
      status={status}
    >
      <SelectField
        label="Default media access"
        description="How new images, video, and downloads start out. ‘Public’ shows them to everyone, ‘Preview only’ shows a teaser, and ‘Locked’ hides them until unlocked."
        value={access}
        options={MEDIA_ACCESS_OPTIONS}
        onChange={(mediaDefaultAccessMode) => onChange({ mediaDefaultAccessMode })}
      />

      {!isPublic && (
        <>
          {isPreview && (
            <SelectField
              label="What the preview shows"
              description="The teaser readers see before they unlock."
              value={policy.kind}
              options={MEDIA_PREVIEW_OPTIONS}
              onChange={(kind) => setPolicy({ kind })}
            />
          )}

          <div className="cedros-admin__form-row">
            <TextField
              label="Product that unlocks media"
              description="Buying this Pay product unlocks your gated media. Set this or an entitlement — at least one is required."
              placeholder="Paste a Pay product ID"
              value={monetization.mediaPayProductId}
              onChange={(mediaPayProductId) => onChange({ mediaPayProductId })}
            />
            <TextField
              label="Or an entitlement that unlocks media"
              description="Readers who already hold this entitlement get access without buying."
              placeholder="Paste an entitlement ID"
              value={monetization.mediaRequiredEntitlementId}
              onChange={(mediaRequiredEntitlementId) =>
                onChange({ mediaRequiredEntitlementId })
              }
            />
          </div>

          <TextAreaField
            label="Locked media message"
            description="What readers see over locked media before they unlock it."
            placeholder="Sign in and buy access to view this."
            value={monetization.mediaLockedMessage}
            onChange={(mediaLockedMessage) => onChange({ mediaLockedMessage })}
            rows={3}
          />

          <InfoLine label="Sign-in required">
            Locked and preview media need a signed-in Cedros Login identity so access reaches the
            right reader. Cedros handles this for you whenever media isn’t public.
          </InfoLine>

          {isPreview && (
            <AdvancedDetails>
              <div className="cedros-admin__form-row">
                <TextField
                  label="Specific preview asset"
                  description="Point the preview at a particular uploaded asset instead of an auto-generated one. Leave blank to auto-generate."
                  placeholder="Leave blank to auto-generate"
                  value={policy.assetId ?? ''}
                  onChange={(assetId) =>
                    setPolicy({ assetId: assetId.trim() ? assetId : null })
                  }
                />
                <TextField
                  label="Preview variant"
                  description="Names a specific rendition of the preview asset. Leave blank unless Cedros support gave you one."
                  placeholder="Leave blank to auto-generate"
                  value={policy.variantKind ?? ''}
                  onChange={(variantKind) =>
                    setPolicy({ variantKind: variantKind.trim() ? variantKind : null })
                  }
                />
              </div>
            </AdvancedDetails>
          )}
        </>
      )}
    </ContentCard>
  );
}
