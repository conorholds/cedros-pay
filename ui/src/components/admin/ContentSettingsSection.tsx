import { useCallback, useEffect, useMemo, useState } from 'react';
import { type CedrosAutosaveState } from '../../autosave';
import { ErrorBanner } from './ErrorBanner';
import { LoadingState } from './LoadingState';
import { validateSolanaAddress } from './TokenMintSelector';
import { TippingCard } from './TippingCard';
import { ArticlePaywallCard } from './ArticlePaywallCard';
import { GatedMediaCard } from './GatedMediaCard';
import { ConfigApiClient } from './configApi';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import { useAutosave } from './useAutosave';
import {
  DEFAULT_MONETIZATION_SETTINGS,
  DEFAULT_TIPPING_SETTINGS,
  SiteSettingsApiClient,
  normalizeMonetizationSettings,
  type MonetizationSettings,
  type TippingSettings,
} from './contentSettingsApi';
import type { SectionProps } from './types';
import { STABLECOIN_METADATA } from '../../utils/tokenMintValidator';

interface ContentSettingsSectionProps extends SectionProps {
  showPageHeader?: boolean;
}

interface CryptoTipSource {
  enabled: boolean;
  paymentAddress: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenIcon: string;
}

function hasMediaPayReference(settings: MonetizationSettings): boolean {
  return Boolean(
    settings.mediaPayProductId.trim() || settings.mediaRequiredEntitlementId.trim()
  );
}

/** Mirrors the server cross-field rule for locked/preview media. */
function validateMediaMonetization(settings: MonetizationSettings) {
  if (!settings.mediaEnabled || settings.mediaDefaultAccessMode === 'public') {
    return;
  }
  if (!hasMediaPayReference(settings)) {
    throw new Error('Add a product or entitlement that unlocks your media before saving.');
  }
}

function stringConfigValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberConfigValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function resolveCryptoTipSource(config: Record<string, unknown>): CryptoTipSource {
  const tokenMint = stringConfigValue(config.token_mint);
  const knownToken = STABLECOIN_METADATA[tokenMint];
  const configuredSymbol =
    stringConfigValue(config.token_symbol) || stringConfigValue(config.custom_token_symbol);

  return {
    enabled: config.enabled === true,
    paymentAddress: stringConfigValue(config.payment_address),
    tokenMint,
    tokenSymbol: knownToken?.symbol ?? configuredSymbol,
    tokenDecimals: knownToken?.decimals ?? numberConfigValue(config.token_decimals, 6),
    tokenIcon: knownToken?.icon ?? stringConfigValue(config.custom_token_icon),
  };
}

function isValidConfiguredAddress(value: string): boolean {
  return value !== '' && validateSolanaAddress(value).valid;
}

function hasCryptoTipDestination(source: CryptoTipSource | null): source is CryptoTipSource {
  return Boolean(
    source?.enabled &&
      isValidConfiguredAddress(source.paymentAddress) &&
      isValidConfiguredAddress(source.tokenMint)
  );
}

function derivedTipCurrencies(source: CryptoTipSource): Array<Record<string, unknown>> {
  const symbol = source.tokenSymbol || 'TOKEN';
  return [
    {
      symbol,
      decimals: source.tokenDecimals,
      logo: source.tokenIcon,
      mint: source.tokenMint,
    },
  ];
}

function applyCryptoTippingSource(
  settings: TippingSettings,
  source: CryptoTipSource | null
): TippingSettings {
  if (!hasCryptoTipDestination(source)) {
    return { ...settings, enabled: false, allowPerPostRecipient: false };
  }

  return {
    ...settings,
    recipient: source.paymentAddress,
    currencies: derivedTipCurrencies(source),
    allowPerPostRecipient: false,
  };
}

function validateTipping(settings: TippingSettings, source: CryptoTipSource | null) {
  if (!settings.enabled) return;
  if (!source?.enabled) {
    throw new Error('Turn on Crypto before turning tipping on.');
  }
  if (!hasCryptoTipDestination(source)) {
    throw new Error('Add a payout wallet and payment token in Crypto before turning tipping on.');
  }
}

export function ContentSettingsSection({
  serverUrl,
  authManager,
  showPageHeader = true,
}: ContentSettingsSectionProps) {
  const isEmbedded = !showPageHeader;
  const client = useMemo(() => new SiteSettingsApiClient(authManager), [authManager]);
  const configClient = useMemo(
    () => new ConfigApiClient(serverUrl, authManager),
    [authManager, serverUrl]
  );
  const [tipping, setTipping] = useState<TippingSettings>(DEFAULT_TIPPING_SETTINGS);
  const [monetization, setMonetization] = useState<MonetizationSettings>(
    DEFAULT_MONETIZATION_SETTINGS
  );
  const [cryptoTipSource, setCryptoTipSource] = useState<CryptoTipSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Article paywall and Gated media share one stored object behind a single save,
  // so we remember which card was last edited to show its autosave status only.
  const [monSource, setMonSource] = useState<'article' | 'media' | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSaveError(null);
    try {
      const [tips, paywall, crypto] = await Promise.all([
        client.getTipping(),
        client.getMonetization(),
        configClient.getConfig('x402'),
      ]);
      const tipSource = resolveCryptoTipSource(crypto.config);
      setCryptoTipSource(tipSource);
      setTipping(applyCryptoTippingSource(tips.settings, tipSource));
      setMonetization(normalizeMonetizationSettings(paywall.settings));
      setHasLoaded(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load content monetization settings'
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, configClient]);

  useEffect(() => {
    load();
  }, [load]);

  const updateTipping = useCallback((patch: Partial<TippingSettings>) => {
    setTipping((current) => ({ ...current, ...patch }));
  }, []);

  const updateMonetization = useCallback((patch: Partial<MonetizationSettings>) => {
    setMonetization((current) => ({ ...current, ...patch }));
  }, []);

  const updateArticle = useCallback(
    (patch: Partial<MonetizationSettings>) => {
      setMonSource('article');
      updateMonetization(patch);
    },
    [updateMonetization]
  );

  const updateMedia = useCallback(
    (patch: Partial<MonetizationSettings>) => {
      setMonSource('media');
      updateMonetization(patch);
    },
    [updateMonetization]
  );

  const saveTipping = useCallback(async () => {
    setSaveError(null);
    const nextSettings = applyCryptoTippingSource(tipping, cryptoTipSource);
    try {
      validateTipping(nextSettings, cryptoTipSource);
      await client.updateTipping(nextSettings);
      setTipping(nextSettings);
      return { canonicalDraftKey: JSON.stringify(nextSettings) };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save tipping settings';
      setSaveError(message);
      throw new Error(message);
    }
  }, [client, cryptoTipSource, tipping]);

  const saveMonetization = useCallback(async () => {
    setSaveError(null);
    const requiresLogin =
      monetization.mediaEnabled && monetization.mediaDefaultAccessMode !== 'public';
    const nextSettings: MonetizationSettings = {
      ...monetization,
      // One fixed-point unlock price (defaultPrice) for every rail; the legacy
      // per-rail credits price is retired.
      creditsPerArticle: null,
      mediaRequiresLogin: requiresLogin ? true : monetization.mediaRequiresLogin,
    };
    try {
      validateMediaMonetization(nextSettings);
      await client.updateMonetization(nextSettings);
      setMonetization(nextSettings);
      return { canonicalDraftKey: JSON.stringify(nextSettings) };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save paywall defaults';
      setSaveError(message);
      throw new Error(message);
    }
  }, [client, monetization]);

  const tippingStatus = useAutosave(JSON.stringify(tipping), saveTipping, {
    ready: hasLoaded && !isLoading,
    delayMs: 600,
    resourceType: 'content-tipping-defaults',
    resourceId: 'site-settings/tipping',
    extensionId: 'cedros-pay',
  });
  const monetizationStatus = useAutosave(JSON.stringify(monetization), saveMonetization, {
    ready: hasLoaded && !isLoading,
    delayMs: 600,
    resourceType: 'content-monetization-defaults',
    resourceId: 'site-settings/monetization',
    extensionId: 'cedros-pay',
  });

  const articleStatus: CedrosAutosaveState =
    monSource === 'article' ? monetizationStatus : 'idle';
  const mediaStatus: CedrosAutosaveState =
    monSource === 'media' ? monetizationStatus : 'idle';

  useBackgroundRefresh(load, { enabled: !!error, intervalMs: 15000 });

  if (isLoading && !hasLoaded) {
    return (
      <div className="cedros-data-card cedros-admin__section">
        <LoadingState label="Loading content monetization settings…" />
      </div>
    );
  }

  if (!hasLoaded && error) {
    return (
      <div className="cedros-data-card cedros-admin__section">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div
      className={`cedros-admin__content-settings ${isEmbedded ? 'cedros-admin__content-settings--embedded' : ''}`}
    >
      {showPageHeader && (
        <div className="cedros-admin__page-header">
          <div>
            <h2 className="cedros-admin__page-title">Content</h2>
            <p className="cedros-admin__page-description">
              Set publisher-wide defaults for tips, paywalled posts, and locked media. These
              apply to new content — you can still override any single post.
            </p>
          </div>
        </div>
      )}

      <ErrorBanner message={error ?? saveError} onRetry={error ? load : undefined} />

      <div className="cedros-admin__content-settings-grid">
        <TippingCard
          tipping={tipping}
          onChange={updateTipping}
          status={tippingStatus}
          cryptoReady={hasCryptoTipDestination(cryptoTipSource)}
          cryptoEnabled={cryptoTipSource?.enabled === true}
        />
        <ArticlePaywallCard
          monetization={monetization}
          onChange={updateArticle}
          status={articleStatus}
        />
        <GatedMediaCard
          monetization={monetization}
          onChange={updateMedia}
          status={mediaStatus}
        />
      </div>
    </div>
  );
}

export default ContentSettingsSection;
