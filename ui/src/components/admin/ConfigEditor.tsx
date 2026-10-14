/**
 * Config Editor
 *
 * Presentational form for one config category. Field order, grouping,
 * advanced sectioning, and copy come from configMetadata. State lives in
 * the parent (SingleCategorySettings): values in, onChange out.
 */

import { useMemo, useState } from 'react';
import {
  CONFIG_CATEGORIES,
  getClientFieldWarnings,
  resolveFieldMeta,
  type EndpointMeta,
  type FieldGroupMeta,
} from './configMetadata';
import { ConfigField } from './ConfigField';
import { Switch } from './Switch';
import { Icons } from './icons';
import { STABLECOIN_METADATA } from '../../utils/tokenMintValidator';
import { AdvancedDetails } from './contentSettingsLayout';
import { AnimatedDisclosure } from './AnimatedDisclosure';

export interface ConfigEditorProps {
  category: string;
  values: Record<string, unknown>;
  /** Values as loaded from the server (secrets redacted). */
  originalConfig: Record<string, unknown>;
  /** Base URL used to display endpoint URLs (webhooks, notifications). */
  serverUrl?: string;
  disabled?: boolean;
  onChange: (key: string, value: unknown) => void;
}

function EndpointRow({ endpoint, serverUrl }: { endpoint: EndpointMeta; serverUrl: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${serverUrl.replace(/\/$/, '')}${endpoint.path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (e.g. insecure context); leave the URL selectable.
    }
  };

  return (
    <div className="cedros-data-field cedros-admin__field cedros-admin__endpoint">
      <span className="cedros-data-label cedros-admin__field-label">{endpoint.label}</span>
      <div className="cedros-admin__endpoint-row">
        <code className="cedros-admin__endpoint-url">{url}</code>
        <button
          type="button"
          className="cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-data-btn--sm cedros-admin__button--sm"
          onClick={copy}
        >
          {copied ? Icons.check : Icons.copy}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {endpoint.description && (
        <div className="cedros-admin__field-description">{endpoint.description}</div>
      )}
    </div>
  );
}

export function ConfigEditor({
  category,
  values,
  originalConfig,
  serverUrl,
  disabled = false,
  onChange,
}: ConfigEditorProps) {
  const catMeta = CONFIG_CATEGORIES[category];
  const warnings = useMemo(() => getClientFieldWarnings(category, values), [category, values]);

  // Display order: metadata declaration order first, then any unlisted keys.
  const orderedKeys = useMemo(() => {
    const metaKeys = Object.keys(catMeta?.fields ?? {});
    const valueKeys = Object.keys(values);
    return [
      ...metaKeys.filter((key) => valueKeys.includes(key)),
      ...valueKeys.filter((key) => !metaKeys.includes(key)),
    ];
  }, [catMeta, values]);

  const isVisible = (key: string): boolean => {
    const meta = resolveFieldMeta(category, key, originalConfig[key] ?? values[key]);
    if (meta.hidden) return false;
    if (meta.showWhen && !values[meta.showWhen]) return false;
    // Hide token_decimals when a known stablecoin manages it
    if (key === 'token_decimals') {
      const tokenMint = values['token_mint'] as string | undefined;
      if (tokenMint && STABLECOIN_METADATA[tokenMint]) return false;
    }
    return true;
  };

  const visibleKeys = orderedKeys.filter(isVisible);
  const metaFor = (key: string) =>
    resolveFieldMeta(category, key, originalConfig[key] ?? values[key]);

  const mainKeys = visibleKeys.filter((key) => {
    const meta = metaFor(key);
    return !meta.group && !meta.advanced;
  });
  const advancedKeys = visibleKeys.filter((key) => {
    const meta = metaFor(key);
    return !meta.group && meta.advanced;
  });
  const groupKeys = (groupId: string) =>
    visibleKeys.filter((key) => metaFor(key).group === groupId);

  const endpoints = catMeta?.endpoints ?? [];
  const ungroupedEndpoints = endpoints.filter((endpoint) => !endpoint.group);

  const renderField = (key: string) => (
    <ConfigField
      key={key}
      fieldKey={key}
      value={values[key]}
      meta={metaFor(key)}
      values={values}
      originalValue={originalConfig[key]}
      disabled={disabled}
      warning={warnings[key]}
      onChange={onChange}
    />
  );

  const renderGroup = (group: FieldGroupMeta) => {
    const keys = groupKeys(group.id);
    const groupEndpoints = endpoints.filter((endpoint) => endpoint.group === group.id);
    if (keys.length === 0 && groupEndpoints.length === 0 && !group.toggleField) return null;
    const isOn = group.toggleField ? Boolean(values[group.toggleField]) : true;

    return (
      <section key={group.id} className="cedros-data-card cedros-admin__field-group">
        <div className="cedros-data-card__header cedros-admin__field-group-header">
          <div className="cedros-admin__field-group-heading">
            <h4 className="cedros-data-card__title cedros-admin__field-group-title">{group.title}</h4>
            {group.description && (
              <p className="cedros-admin__field-group-description">{group.description}</p>
            )}
          </div>
          {group.toggleField && (
            <Switch
              checked={isOn}
              onCheckedChange={(checked) => onChange(group.toggleField!, checked)}
              disabled={disabled}
              aria-label={`Enable ${group.title}`}
            />
          )}
        </div>
        {(keys.length > 0 || groupEndpoints.length > 0) && (
          <AnimatedDisclosure open={isOn}>
            <div className="cedros-admin__field-group-body">
              {serverUrl &&
                groupEndpoints.map((endpoint) => (
                  <EndpointRow key={endpoint.path} endpoint={endpoint} serverUrl={serverUrl} />
                ))}
              {keys.map(renderField)}
            </div>
          </AnimatedDisclosure>
        )}
      </section>
    );
  };

  return (
    <div className="cedros-admin__config-editor">
      <div className="cedros-admin__config-fields">
        {mainKeys.map(renderField)}
        {serverUrl &&
          ungroupedEndpoints.map((endpoint) => (
            <EndpointRow key={endpoint.path} endpoint={endpoint} serverUrl={serverUrl} />
          ))}
        {(catMeta?.groups ?? []).map(renderGroup)}
        {advancedKeys.length > 0 && (
          <AdvancedDetails>{advancedKeys.map(renderField)}</AdvancedDetails>
        )}
      </div>
    </div>
  );
}
