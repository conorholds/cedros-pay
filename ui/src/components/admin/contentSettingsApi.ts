import type { IAdminAuthManager } from './AdminAuthManager';

export type SiteSettingsKind = 'tipping' | 'monetization';

export interface TippingSettings {
  enabled: boolean;
  recipient: string;
  currencies: Array<Record<string, unknown>>;
  presets: number[];
  label: string;
  description: string;
  allowPerPostRecipient: boolean;
}

/** Article unlock price in fixed-point integer minor units (e.g. cents). Never float dollars. */
export interface ArticlePrice {
  amountCents: number;
  currency: string;
}

export const DEFAULT_PRICE_CURRENCY = 'USD';

/** Read the integer minor-unit price, or null. Truncates to stay integer. */
export function readPriceCents(price: ArticlePrice | null): number | null {
  return price && Number.isFinite(price.amountCents) ? Math.trunc(price.amountCents) : null;
}

export function readPriceCurrency(price: ArticlePrice | null): string {
  return price && typeof price.currency === 'string' && price.currency.trim()
    ? price.currency
    : DEFAULT_PRICE_CURRENCY;
}

/** Build a price from integer minor units; null clears it. */
export function makePrice(amountCents: number | null, currency: string): ArticlePrice | null {
  return amountCents == null
    ? null
    : { amountCents: Math.trunc(amountCents), currency: currency || DEFAULT_PRICE_CURRENCY };
}

/**
 * Coerce any stored price into fixed-point `{ amountCents, currency }`.
 * Accepts the canonical `amountCents` shape and migrates legacy float-dollar
 * `{ amount }` data (× 100, rounded to the nearest cent) so old configs keep working.
 */
export function normalizeArticlePrice(price: unknown): ArticlePrice | null {
  if (!price || typeof price !== 'object') return null;
  const record = price as Record<string, unknown>;
  const currency =
    typeof record.currency === 'string' && record.currency.trim()
      ? record.currency
      : DEFAULT_PRICE_CURRENCY;
  if (typeof record.amountCents === 'number' && Number.isFinite(record.amountCents)) {
    return { amountCents: Math.trunc(record.amountCents), currency };
  }
  if (typeof record.amount === 'number' && Number.isFinite(record.amount)) {
    return { amountCents: Math.round(record.amount * 100), currency };
  }
  return null;
}

export interface MonetizationSettings {
  enabled: boolean;
  defaultAccessMode: string;
  defaultPreviewParagraphs: number;
  defaultPrice: ArticlePrice | null;
  acceptedPaymentMethods: string[];
  subscriptionProductId: string;
  /** @deprecated The unlock price is `defaultPrice` (one price for every rail). Always sent null. */
  creditsPerArticle: number | null;
  freeReadsPerMonth: number;
  lockedMessage: string;
  /** Whether Data-owned media access rules should use Pay-backed defaults. */
  mediaEnabled: boolean;
  /** Default Data media access mode for new rules: public, preview, or locked. */
  mediaDefaultAccessMode: string;
  /** Default preview behavior for locked or preview media assets. */
  mediaPreviewPolicy: {
    kind: string;
    assetId?: string | null;
    variantKind?: string | null;
  };
  /** Pay catalog product that grants media access when purchased. */
  mediaPayProductId: string;
  /** Explicit entitlement id that can unlock matching media rules. */
  mediaRequiredEntitlementId: string;
  /** Locked or preview media must require a durable Cedros Login identity. */
  mediaRequiresLogin: boolean;
  /** Buyer-facing copy shown before a media entitlement is granted. */
  mediaLockedMessage: string;
}

export interface SiteSettingsResponse<TSettings> {
  kind: SiteSettingsKind;
  key: string;
  settings: TSettings;
  updatedAt: string | null;
}

export interface SiteSettingsUpdateResponse<TSettings> extends SiteSettingsResponse<TSettings> {
  updated: boolean;
}

export const DEFAULT_TIPPING_SETTINGS: TippingSettings = {
  enabled: false,
  recipient: '',
  currencies: [],
  presets: [],
  label: 'Tip',
  description: '',
  allowPerPostRecipient: false,
};

export const DEFAULT_MONETIZATION_SETTINGS: MonetizationSettings = {
  enabled: false,
  defaultAccessMode: 'free',
  defaultPreviewParagraphs: 2,
  defaultPrice: null,
  acceptedPaymentMethods: [],
  subscriptionProductId: '',
  creditsPerArticle: null,
  freeReadsPerMonth: 0,
  lockedMessage: 'Subscribe or purchase access to continue reading.',
  mediaEnabled: false,
  mediaDefaultAccessMode: 'public',
  mediaPreviewPolicy: {
    kind: 'thumbnail',
    assetId: null,
    variantKind: null,
  },
  mediaPayProductId: '',
  mediaRequiredEntitlementId: '',
  mediaRequiresLogin: true,
  mediaLockedMessage: 'Sign in and purchase access to view this media.',
};

/** Fill missing media defaults when older hosts return a partial settings payload. */
export function normalizeMonetizationSettings(
  settings: Partial<MonetizationSettings>
): MonetizationSettings {
  return {
    ...DEFAULT_MONETIZATION_SETTINGS,
    ...settings,
    defaultPrice: normalizeArticlePrice(settings.defaultPrice),
    mediaPreviewPolicy: {
      ...DEFAULT_MONETIZATION_SETTINGS.mediaPreviewPolicy,
      ...(settings.mediaPreviewPolicy ?? {}),
    },
  };
}

export class SiteSettingsApiClient {
  constructor(private authManager?: IAdminAuthManager) {}

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (this.authManager?.isAuthenticated()) {
      return this.authManager.fetchWithAuth<T>(path, options);
    }
    throw new Error('Admin authentication required.');
  }

  async getTipping(): Promise<SiteSettingsResponse<TippingSettings>> {
    return this.fetch('/admin/site-settings/tipping');
  }

  async updateTipping(
    settings: TippingSettings
  ): Promise<SiteSettingsUpdateResponse<TippingSettings>> {
    return this.fetch('/admin/site-settings/tipping', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  }

  async getMonetization(): Promise<SiteSettingsResponse<MonetizationSettings>> {
    return this.fetch('/admin/site-settings/monetization');
  }

  async updateMonetization(
    settings: MonetizationSettings
  ): Promise<SiteSettingsUpdateResponse<MonetizationSettings>> {
    return this.fetch('/admin/site-settings/monetization', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  }
}
