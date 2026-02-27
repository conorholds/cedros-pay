/**
 * Admin Config API Client
 *
 * Client for interacting with the server's /admin/config/* endpoints.
 * Uses Ed25519 authentication headers.
 */

/** Config category summary */
export interface ConfigCategory {
  category: string;
  keyCount: number;
  lastUpdated: string;
  hasSecrets: boolean;
}

/** List categories response */
export interface ListCategoriesResponse {
  categories: ConfigCategory[];
  count: number;
}

/** Get config response */
export interface GetConfigResponse {
  category: string;
  config: Record<string, unknown>;
  updatedAt: string;
  secretsRedacted: boolean;
}

/** Config history entry */
export interface ConfigHistoryEntry {
  id: string;
  configKey: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changedAt: string;
  changedBy: string;
}

/** History response */
export interface ConfigHistoryResponse {
  history: ConfigHistoryEntry[];
  count: number;
}

/** Validation response */
export interface ValidateConfigResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

import type { IAdminAuthManager } from './AdminAuthManager';

/** @deprecated Use IAdminAuthManager instead. Legacy auth used client-generated nonces vulnerable to replay. */
export interface AdminAuth {
  signerPublicKey: string;
  sign: (message: string) => Promise<string>;
}

/** Admin Config API client */
export class ConfigApiClient {
  constructor(
    private _serverUrl: string,
    private auth?: AdminAuth,
    private authManager?: IAdminAuthManager
  ) {}

  /** Server URL passed at construction (retained for API compatibility). */
  get serverUrl(): string { return this._serverUrl; }

  private async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Prefer authManager (new auth) over legacy auth
    if (this.authManager?.isAuthenticated()) {
      return this.authManager.fetchWithAuth<T>(path, options);
    }

    // Legacy AdminAuth is no longer supported — it used client-generated nonces
    // vulnerable to replay attacks. Require IAdminAuthManager.
    if (this.auth) {
      throw new Error(
        'Legacy AdminAuth is no longer supported due to replay vulnerability. Use IAdminAuthManager instead.'
      );
    }

    throw new Error(
      'Admin authentication required. Provide an IAdminAuthManager to ConfigApi.'
    );
  }

  /** List all config categories */
  async listCategories(limit = 100): Promise<ListCategoriesResponse> {
    return this.fetch(`/admin/config?limit=${limit}`);
  }

  /** Get config for a category */
  async getConfig(category: string, redactSecrets = true): Promise<GetConfigResponse> {
    return this.fetch(`/admin/config/${category}?redact_secrets=${redactSecrets}`);
  }

  /** Full update - replace entire category config */
  async updateConfig(
    category: string,
    config: Record<string, unknown>,
    description?: string
  ): Promise<void> {
    await this.fetch(`/admin/config/${category}`, {
      method: 'PUT',
      body: JSON.stringify({ config, description }),
    });
  }

  /** Partial update - update specific keys */
  async patchConfig(
    category: string,
    updates: Record<string, unknown>,
    description?: string
  ): Promise<void> {
    await this.fetch(`/admin/config/${category}`, {
      method: 'PATCH',
      body: JSON.stringify({ updates, description }),
    });
  }

  /** Batch update multiple categories */
  async batchUpdate(
    updates: Array<{
      category: string;
      configKey: string;
      value: unknown;
      description?: string;
    }>
  ): Promise<void> {
    await this.fetch('/admin/config/batch', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    });
  }

  /** Validate config before saving */
  async validateConfig(
    category: string,
    config: Record<string, unknown>
  ): Promise<ValidateConfigResponse> {
    return this.fetch('/admin/config/validate', {
      method: 'POST',
      body: JSON.stringify({ category, config }),
    });
  }

  /** Get config change history */
  async getHistory(category?: string, limit = 50): Promise<ConfigHistoryResponse> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (category) params.set('category', category);
    return this.fetch(`/admin/config/history?${params}`);
  }
}

/** Field metadata for special input types */
export interface FieldMeta {
  type?: 'dropdown' | 'number' | 'boolean' | 'token_mint' | 'toggle' | 'secret_array' | 'solana_address';
  options?: string[];
  unit?: string;
  /** Description text shown below the field label */
  description?: string;
  /** Hide this field from the UI */
  hidden?: boolean;
  /** Only show this field when another field has a truthy value */
  showWhen?: string;
}

/** Category metadata */
export interface CategoryMeta {
  label: string;
  description?: string;
  secrets: string[];
  icon: string;
  fields?: Record<string, FieldMeta>;
}

/** Known config categories and their metadata */
export const CONFIG_CATEGORIES: Record<string, CategoryMeta> = {
  server: {
    label: 'Server',
    secrets: [],
    icon: '🖥️',
    fields: {
      admin_metrics_api_key: { hidden: true }, // Moved to metrics tab
      cors_allowed_origins: { hidden: true }, // Moved to security tab
    },
  },
  security: {
    label: 'Security',
    description: 'Configure CORS, rate limiting, and other security settings',
    secrets: [],
    icon: '🔒',
    fields: {
      cors_allowed_origins: {
        description: 'List of allowed origins for CORS requests. Use ["*"] to allow all origins (not recommended for production).',
      },
    },
  },
  metrics: {
    label: 'Metrics',
    description: 'Configure metrics collection and API access',
    secrets: ['admin_metrics_api_key'],
    icon: '📊',
    fields: {
      admin_metrics_api_key: {
        description: 'API key for accessing the admin metrics endpoint. Keep this secret.',
      },
    },
  },
  logging: {
    label: 'Logging',
    secrets: [],
    icon: '📝',
    fields: {
      level: { type: 'dropdown', options: ['trace', 'debug', 'info', 'warn', 'error'] },
      format: { hidden: true }, // Developer setting
      environment: { hidden: true }, // Developer setting
    },
  },
  stripe: {
    label: 'Stripe',
    secrets: ['secret_key', 'webhook_secret'],
    icon: '💳',
    fields: {
      enabled: { hidden: true }, // Shown in header toggle
      secret_key: {
        description: 'Stripe Dashboard → Developers → API keys → Secret key. Use the test key (sk_test_...) for testing, or the live key (sk_live_...) for production.',
      },
      publishable_key: {
        description: 'Stripe Dashboard → Developers → API keys → Publishable key. Starts with pk_test_... or pk_live_...',
      },
      mode: {
        type: 'dropdown',
        options: ['test', 'live'],
        description: 'Use "test" mode with test API keys during development, then switch to "live" with live keys for real payments.',
      },
      webhook_url: {
        description: 'The full URL Stripe sends webhook events to. Default is your server URL + /webhook/stripe (e.g. https://example.com/webhook/stripe). Only change this if you\'ve customized the route in your cedros-pay server.',
      },
      webhook_secret: {
        description: 'Stripe Dashboard → Developers → Webhooks → "Create an event destination" → select events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed → Continue → choose "Webhook endpoint" → enter your server\'s webhook endpoint, e.g. https://example.com/webhook/stripe (your server URL + /webhook/stripe) → after creating, click the endpoint and "Click to reveal" the signing secret. Starts with whsec_...',
      },
      tax_rate_id: {
        description: 'Stripe Dashboard → More → Product catalog → Tax rates → "+ New" → set the percentage, region, and whether tax is inclusive or exclusive → Save → copy the tax rate ID from the detail page (starts with txr_...). Leave empty if you don\'t collect tax.',
      },
      success_url: { hidden: true }, // Library provides default pages
      cancel_url: { hidden: true }, // Library provides default pages
    },
  },
  x402: {
    label: 'X402 (Crypto)',
    secrets: ['server_wallets'],
    icon: '⚡',
    fields: {
      enabled: { hidden: true }, // Shown in header toggle
      payment_address: {
        type: 'solana_address',
        description: 'The Solana wallet address where payments are received. This is where customer funds are sent.',
      },
      token_mint: {
        type: 'token_mint',
        description: 'The SPL token used for payments. Most commonly USDC.',
      },
      token_decimals: {
        type: 'number',
        description: 'Number of decimal places for the token (e.g., USDC has 6 decimals).',
        hidden: true, // Managed by token_mint selector
      },
      custom_token_symbol: {
        description: 'Display symbol for your custom token (e.g., "MYTOKEN").',
        hidden: true, // Managed by token_mint selector
      },
      custom_token_icon: {
        description: 'URL to your token\'s icon image.',
        hidden: true, // Managed by token_mint selector
      },
      rpc_url: {
        description: 'Custom Solana RPC endpoint. Leave empty to use the default public RPC.',
      },
      gasless_enabled: {
        type: 'toggle',
        description: 'When enabled, your server pays transaction fees so customers don\'t need SOL.',
      },
      server_wallets: {
        type: 'secret_array',
        description: 'Server keypair(s) used to sign and pay for transactions. Required for gasless payments.',
        showWhen: 'gasless_enabled',
      },
      rounding_mode: {
        type: 'dropdown',
        options: ['nearest', 'up', 'down'],
        description: 'How to round fractional token amounts: nearest (default), up (always round up), or down (always round down).',
      },
      network: { hidden: true },
      ws_url: { hidden: true }, // Derived from rpc_url
      skip_preflight: { hidden: true }, // Always false; not a user decision
      commitment: { hidden: true }, // Internal Solana parameter
      compute_unit_limit: { hidden: true }, // Internal Solana parameter
      compute_unit_price: { hidden: true }, // Internal Solana parameter
    },
  },
  paywall: {
    label: 'Paywall',
    secrets: [],
    icon: '🚪',
    fields: {
      product_cache_ttl: { type: 'number', unit: 'seconds' },
    },
  },
  coupons: {
    label: 'Coupons',
    secrets: [],
    icon: '🎟️',
    fields: {
      cache_ttl: { type: 'number', unit: 'seconds' },
    },
  },
  subscriptions: {
    label: 'Subscriptions',
    secrets: [],
    icon: '🔄',
    fields: {
      grace_period_hours: { type: 'number', unit: 'hours' },
    },
  },
  callbacks: {
    label: 'Callbacks',
    secrets: ['hmac_secret'],
    icon: '🔔',
  },
  email: {
    label: 'Email',
    description: 'Email receipts for customers after purchase',
    secrets: ['smtp_password'],
    icon: '📧',
    fields: {
      enabled: { hidden: true }, // Shown in header toggle
      provider: {
        type: 'dropdown',
        options: ['sendgrid', 'mailgun', 'postmark', 'ses', 'resend', 'custom'],
        description: 'Email service provider.',
      },
      smtp_host: {
        description: 'SMTP server hostname.',
        showWhen: 'provider',
      },
      smtp_port: {
        type: 'number',
        description: 'SMTP server port (typically 587 for TLS).',
        showWhen: 'provider',
      },
      smtp_user: {
        description: 'SMTP authentication username or API key name.',
        showWhen: 'provider',
      },
      smtp_password: {
        description: 'SMTP password or API key.',
        showWhen: 'provider',
      },
      from_address: {
        description: 'Sender email address (e.g., orders@yourstore.com).',
      },
      from_name: {
        description: 'Sender display name (e.g., "Your Store").',
      },
    },
  },
  webhook: {
    label: 'Webhook',
    description: 'HTTP notifications when purchases occur',
    secrets: ['secret'],
    icon: '🔔',
    fields: {
      enabled: { hidden: true }, // Shown in header toggle
      url: {
        description: 'URL to receive POST notifications (e.g., https://api.yoursite.com/webhooks/orders).',
      },
      secret: {
        description: 'Shared secret for HMAC-SHA256 signature verification.',
      },
      retry_attempts: {
        type: 'number',
        description: 'Number of retry attempts on failure (default: 3).',
      },
    },
  },
  messaging: {
    label: 'Messaging',
    description: 'Email and webhook notifications for purchases',
    secrets: ['smtp_password', 'webhook_secret'],
    icon: '📬',
    fields: {
      // Email settings
      email_enabled: {
        type: 'boolean',
        description: 'Send order confirmation emails to customers.',
      },
      email_provider: {
        description: 'Email service provider (mailgun, sendgrid, postmark, ses, resend, custom).',
        showWhen: 'email_enabled',
      },
      smtp_host: {
        description: 'SMTP server hostname.',
        showWhen: 'email_enabled',
      },
      smtp_port: {
        type: 'number',
        description: 'SMTP server port (typically 587 for TLS).',
        showWhen: 'email_enabled',
      },
      smtp_username: {
        description: 'SMTP authentication username or API key.',
        showWhen: 'email_enabled',
      },
      smtp_password: {
        description: 'SMTP password or API key.',
        showWhen: 'email_enabled',
      },
      from_email: {
        description: 'Sender email address (e.g., orders@yourstore.com).',
        showWhen: 'email_enabled',
      },
      from_name: {
        description: 'Sender display name (e.g., "Your Store").',
        showWhen: 'email_enabled',
      },
      // Webhook settings
      webhook_enabled: {
        type: 'boolean',
        description: 'Send webhook notifications when purchases complete.',
      },
      webhook_url: {
        description: 'URL to receive POST notifications.',
        showWhen: 'webhook_enabled',
      },
      webhook_secret: {
        description: 'Shared secret for HMAC-SHA256 signature verification.',
        showWhen: 'webhook_enabled',
      },
      webhook_timeout: {
        type: 'number',
        description: 'Request timeout in seconds (default: 30).',
        showWhen: 'webhook_enabled',
      },
    },
  },
  monitoring: {
    label: 'Monitoring',
    secrets: [],
    icon: '📊',
    fields: {
      check_interval: { type: 'number', unit: 'seconds' },
      low_balance_threshold: { type: 'number', unit: 'SOL' },
    },
  },
  rate_limit: {
    label: 'Rate Limiting',
    secrets: [],
    icon: '⏱️',
  },
  circuit_breaker: {
    label: 'Circuit Breaker',
    secrets: [],
    icon: '🔌',
  },
  admin: {
    label: 'Admin Keys',
    secrets: [],
    icon: '👤',
  },
  api_keys: {
    label: 'API Keys',
    secrets: [],
    icon: '🔐',
  },
  cedros_login: {
    label: 'Cedros Login',
    secrets: ['api_key'],
    icon: '🔑',
    fields: {
      enabled: { hidden: true }, // Shown in header toggle
      credits_enabled: { hidden: true }, // Shown in header toggle when relevant
      base_url: { hidden: true }, // Deployment setting
      timeout: { hidden: true }, // Developer setting
      jwt_issuer: { hidden: true }, // Internal auth config
      jwt_audience: { hidden: true }, // Internal auth config
    },
  },
  shop: {
    label: 'Storefront',
    description: 'Product pages & display settings',
    secrets: [],
    icon: '🏪',
    fields: {
      enabled: { hidden: true }, // Shown in StorefrontSection header toggle
      'relatedProducts.mode': {
        type: 'dropdown',
        options: ['most_recent', 'by_category', 'manual', 'ai'],
      },
      'relatedProducts.maxItems': { type: 'number' },
    },
  },
};

/** Check if a field is a secret for a given category */
export function isSecretField(category: string, field: string): boolean {
  const cat = CONFIG_CATEGORIES[category];
  return cat?.secrets.includes(field) ?? false;
}

/** Placeholder for redacted secrets */
export const REDACTED_VALUE = '[REDACTED]';
