/**
 * Storefront Section for Admin Dashboard
 *
 * Configure product detail page settings, including related products display mode.
 * Organized into tabs: Catalog, Layouts, Product Pages, Checkout.
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { FormDropdown } from './Dropdown';
import { Toggle } from './Toggle';
import { useAutosave } from './useAutosave';
import { AutosaveIndicator } from './AutosaveIndicator';
import type { SectionProps, ProductPageSettings, RelatedProductsMode, CatalogFilterSettings, CatalogSortSettings, CheckoutDisplaySettings, ProductCardLayout, ImageCropPosition, LayoutSettings, ProductPageSectionSettings, InventorySettings, ShopPageSettings } from './types';

interface SettingsWithInventory extends ProductPageSettings {
  enabled: boolean;
  inventory: InventorySettings;
  shopPage: ShopPageSettings;
}

const DEFAULT_SETTINGS: SettingsWithInventory = {
  enabled: true,
  relatedProducts: {
    mode: 'most_recent',
    maxItems: 4,
    layout: {
      layout: 'large',
      imageCrop: 'center',
    },
  },
  catalog: {
    filters: {
      tags: true,
      priceRange: true,
      inStock: true,
    },
    sort: {
      featured: true,
      priceAsc: true,
      priceDesc: true,
    },
  },
  checkout: {
    promoCodes: true,
  },
  shopLayout: {
    layout: 'large',
    imageCrop: 'center',
  },
  categoryLayout: {
    layout: 'large',
    imageCrop: 'center',
  },
  sections: {
    showDescription: true,
    showSpecs: true,
    showShipping: true,
    showRelatedProducts: true,
  },
  inventory: {
    preCheckoutVerification: true,
    holdsEnabled: false,
    holdDurationMinutes: 15,
  },
  shopPage: {
    title: 'Shop',
    description: '',
  },
};

interface ModeOption {
  value: RelatedProductsMode;
  label: string;
  description: string;
  badge?: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: 'most_recent',
    label: 'Most Recent',
    description: 'Show the most recently added products (excluding current product).',
  },
  {
    value: 'by_category',
    label: 'By Category',
    description: 'Show products from the same category as the current product.',
  },
  {
    value: 'manual',
    label: 'Manual Selection',
    description: 'Specify related products per-product using relatedProductIds in metadata.',
  },
  {
    value: 'ai',
    label: 'AI Recommendations',
    description: 'Let AI analyze products and suggest the best matches. Requires AI to be configured in AI Settings.',
  },
];

interface LayoutOption {
  value: ProductCardLayout;
  label: string;
  description: string;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    value: 'large',
    label: 'Large',
    description: 'Portrait cards (4:5) with full product info, description, and tags.',
  },
  {
    value: 'square',
    label: 'Square',
    description: 'Square cards (1:1) showing title and price only.',
  },
  {
    value: 'compact',
    label: 'Compact',
    description: 'Compact cards (3:4) with smaller text to fit more products.',
  },
];

const CROP_OPTIONS: { value: ImageCropPosition; label: string }[] = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

type StorefrontTab = 'shop-page' | 'catalog' | 'layouts' | 'product-pages' | 'checkout';

const TABS: { id: StorefrontTab; label: string }[] = [
  { id: 'shop-page', label: 'Shop Page' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'layouts', label: 'Layouts' },
  { id: 'product-pages', label: 'Product Pages' },
  { id: 'checkout', label: 'Checkout' },
];

export function StorefrontSection({ serverUrl, apiKey, authManager }: SectionProps) {
  const [activeTab, setActiveTab] = useState<StorefrontTab>('shop-page');
  const [settings, setSettings] = useState<SettingsWithInventory>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch storefront settings
  const fetchSettings = useCallback(async () => {
    try {
      setFetchError(null);
      let data: { config: SettingsWithInventory };
      const path = '/admin/config/shop';

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<{ config: SettingsWithInventory }>(path);
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch settings: ${res.status}`);
        data = await res.json();
      }

      setSettings({ ...DEFAULT_SETTINGS, ...data.config });
    } catch {
      setSettings(DEFAULT_SETTINGS);
      setFetchError('Could not load saved settings. Showing defaults.');
    } finally {
      setIsLoading(false);
      // Delay marking initial load as done to prevent autosave trigger
      setTimeout(() => setIsInitialLoad(false), 100);
    }
  }, [serverUrl, apiKey, authManager]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save settings function for autosave
  const saveSettings = useCallback(async (data: SettingsWithInventory) => {
    const path = '/admin/config/shop';
    const body = JSON.stringify({ config: data });

    try {
      if (authManager?.isAuthenticated()) {
        await authManager.fetchWithAuth(path, { method: 'PUT', body });
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { method: 'PUT', headers, body });
        if (!res.ok) throw new Error(`Failed to save settings: ${res.status}`);
      }
    } catch {
      setFetchError('Failed to save storefront settings');
      throw new Error('Save failed');
    }
  }, [serverUrl, apiKey, authManager]);

  // Autosave with debouncing
  const { status: autosaveStatus, error: autosaveError } = useAutosave({
    data: settings,
    onSave: saveSettings,
    debounceMs: 1500,
    enabled: !isInitialLoad,
  });

  const updateMode = (mode: RelatedProductsMode) => {
    setSettings((s) => ({
      ...s,
      relatedProducts: { ...s.relatedProducts, mode },
    }));
  };

  const updateMaxItems = (maxItems: number) => {
    setSettings((s) => ({
      ...s,
      relatedProducts: { ...s.relatedProducts, maxItems },
    }));
  };

  const updateRelatedLayout = (key: keyof LayoutSettings, value: ProductCardLayout | ImageCropPosition) => {
    setSettings((s) => ({
      ...s,
      relatedProducts: {
        ...s.relatedProducts,
        layout: { ...s.relatedProducts.layout, [key]: value },
      },
    }));
  };

  const updateFilter = (key: keyof CatalogFilterSettings, value: boolean) => {
    setSettings((s) => ({
      ...s,
      catalog: {
        ...s.catalog,
        filters: { ...s.catalog.filters, [key]: value },
      },
    }));
  };

  const updateSort = (key: keyof CatalogSortSettings, value: boolean) => {
    // Ensure at least one sort option remains enabled
    const currentSort = settings.catalog.sort;
    const enabledCount = Object.values(currentSort).filter(Boolean).length;
    if (!value && enabledCount <= 1) return; // Don't allow disabling last option

    setSettings((s) => ({
      ...s,
      catalog: {
        ...s.catalog,
        sort: { ...s.catalog.sort, [key]: value },
      },
    }));
  };

  const updateCheckout = (key: keyof CheckoutDisplaySettings, value: boolean) => {
    setSettings((s) => ({
      ...s,
      checkout: { ...s.checkout, [key]: value },
    }));
  };

  const updateShopLayout = (key: keyof LayoutSettings, value: ProductCardLayout | ImageCropPosition) => {
    setSettings((s) => ({
      ...s,
      shopLayout: { ...s.shopLayout, [key]: value },
    }));
  };

  const updateCategoryLayout = (key: keyof LayoutSettings, value: ProductCardLayout | ImageCropPosition) => {
    setSettings((s) => ({
      ...s,
      categoryLayout: { ...s.categoryLayout, [key]: value },
    }));
  };

  const updateSection = (key: keyof ProductPageSectionSettings, value: boolean) => {
    setSettings((s) => ({
      ...s,
      sections: { ...s.sections, [key]: value },
    }));
  };

  const updateInventory = <K extends keyof InventorySettings>(key: K, value: InventorySettings[K]) => {
    setSettings((s) => ({
      ...s,
      inventory: { ...s.inventory, [key]: value },
    }));
  };

  const updateShopPage = <K extends keyof ShopPageSettings>(key: K, value: ShopPageSettings[K]) => {
    setSettings((s) => ({
      ...s,
      shopPage: { ...s.shopPage, [key]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="cedros-admin__section">
        <div className="cedros-admin__loading">{Icons.loading} Loading storefront settings...</div>
      </div>
    );
  }

  return (
    <div className="cedros-admin__storefront-settings">
      {/* Page Header */}
      <div className="cedros-admin__page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="cedros-admin__page-title">Storefront</h2>
          <p className="cedros-admin__page-description">
            Configure catalog filters, product layouts, and checkout settings.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.875rem', color: settings.enabled ? 'var(--cedros-admin-text, #171717)' : 'var(--cedros-admin-muted, #737373)' }}>
            {settings.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Toggle checked={settings.enabled} onChange={(checked) => setSettings((s) => ({ ...s, enabled: checked }))} />
        </div>
      </div>

      {!settings.enabled && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: 'var(--cedros-admin-warning-bg, #fef3c7)',
            border: '1px solid var(--cedros-admin-warning-border, #f59e0b)',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            color: 'var(--cedros-admin-warning-text, #92400e)',
          }}
        >
          The storefront is disabled. Enable it using the toggle above to activate your store.
        </div>
      )}

      {/* Tab Navigation */}
      <div className="cedros-admin__tabs cedros-admin__tabs--line" style={{ opacity: settings.enabled ? 1 : 0.5, pointerEvents: settings.enabled ? 'auto' : 'none' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`cedros-admin__tab ${activeTab === tab.id ? 'cedros-admin__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <AutosaveIndicator status={autosaveStatus} error={autosaveError} />
      </div>

      <ErrorBanner message={fetchError} onRetry={fetchSettings} />

      {/* Shop Page Tab */}
      {activeTab === 'shop-page' && (
        <div className="cedros-admin__section" style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Shop Page Content</h4>
          <p style={{ marginBottom: '1.5rem', fontSize: 14, opacity: 0.7 }}>
            Customize the title and description shown on your shop page.
          </p>

          <div className="cedros-admin__field" style={{ marginBottom: '1.5rem' }}>
            <label className="cedros-admin__field-label">Page Title</label>
            <input
              type="text"
              className="cedros-admin__input"
              value={settings.shopPage.title}
              onChange={(e) => updateShopPage('title', e.target.value)}
              placeholder="Shop"
            />
            <p style={{ margin: '0.25rem 0 0', fontSize: 12, opacity: 0.6 }}>
              The main heading displayed on your shop page.
            </p>
          </div>

          <div className="cedros-admin__field">
            <label className="cedros-admin__field-label">Page Description</label>
            <textarea
              className="cedros-admin__textarea"
              value={settings.shopPage.description}
              onChange={(e) => updateShopPage('description', e.target.value)}
              placeholder="Browse our collection of products..."
              rows={3}
              style={{ resize: 'vertical' }}
            />
            <p style={{ margin: '0.25rem 0 0', fontSize: 12, opacity: 0.6 }}>
              A short description or subtitle shown below the title. Leave empty to hide.
            </p>
          </div>
        </div>
      )}

      {/* Catalog Tab */}
      {activeTab === 'catalog' && (
        <div className="cedros-admin__section" style={{ marginTop: '1rem' }}>
          {/* Catalog Filters Section */}
          <div>
            <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Catalog Filters</h4>
            <p style={{ marginBottom: '1rem', fontSize: 14, opacity: 0.7 }}>
              Choose which filters appear in the shop and category page sidebars.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.catalog.filters.tags}
                  onChange={(checked) => updateFilter('tags', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Tags</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Filter products by tags (multi-select checkboxes)
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.catalog.filters.priceRange}
                  onChange={(checked) => updateFilter('priceRange', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Price Range</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Filter by minimum and maximum price
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.catalog.filters.inStock}
                  onChange={(checked) => updateFilter('inStock', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>In Stock</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Show only products that are in stock
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sort Options Section */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--cedros-admin-border, #e5e5e5)' }}>
            <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Sort Options</h4>
            <p style={{ marginBottom: '1rem', fontSize: 14, opacity: 0.7 }}>
              Choose which sort options appear in the shop and category pages. At least one must be enabled.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.catalog.sort.featured}
                  onChange={(checked) => updateSort('featured', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Featured</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Default sort order (as returned by backend)
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.catalog.sort.priceAsc}
                  onChange={(checked) => updateSort('priceAsc', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Price: Low to High</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Sort products by price ascending
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.catalog.sort.priceDesc}
                  onChange={(checked) => updateSort('priceDesc', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Price: High to Low</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Sort products by price descending
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layouts Tab */}
      {activeTab === 'layouts' && (
        <div className="cedros-admin__section" style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Product Layouts</h4>
          <p style={{ marginBottom: '1.5rem', fontSize: 14, opacity: 0.7 }}>
            Configure product card layouts for shop and category pages.
          </p>

          {/* Shop Page Layout */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontWeight: 500, marginBottom: '0.75rem' }}>Shop Page</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {LAYOUT_OPTIONS.map((option) => {
                const isSelected = settings.shopLayout.layout === option.value;
                return (
                  <label
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      border: `2px solid ${isSelected ? 'var(--cedros-admin-primary, #171717)' : 'var(--cedros-admin-border, #e5e5e5)'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--cedros-admin-bg-accent, #f5f5f5)' : undefined,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="shopLayout"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => updateShopLayout('layout', option.value)}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <span style={{ fontWeight: 500 }}>{option.label}</span>
                      <p style={{ margin: '0.125rem 0 0', fontSize: 12, opacity: 0.6 }}>
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            <FormDropdown
              value={settings.shopLayout.imageCrop}
              onChange={(val) => updateShopLayout('imageCrop', val as ImageCropPosition)}
              options={CROP_OPTIONS}
              label="Image Crop"
              style={{ maxWidth: 180 }}
            />
          </div>

          {/* Category Page Layout */}
          <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--cedros-admin-border, #e5e5e5)' }}>
            <div style={{ fontWeight: 500, marginBottom: '0.75rem' }}>Category Pages</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {LAYOUT_OPTIONS.map((option) => {
                const isSelected = settings.categoryLayout.layout === option.value;
                return (
                  <label
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      border: `2px solid ${isSelected ? 'var(--cedros-admin-primary, #171717)' : 'var(--cedros-admin-border, #e5e5e5)'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--cedros-admin-bg-accent, #f5f5f5)' : undefined,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="categoryLayout"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => updateCategoryLayout('layout', option.value)}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <span style={{ fontWeight: 500 }}>{option.label}</span>
                      <p style={{ margin: '0.125rem 0 0', fontSize: 12, opacity: 0.6 }}>
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            <FormDropdown
              value={settings.categoryLayout.imageCrop}
              onChange={(val) => updateCategoryLayout('imageCrop', val as ImageCropPosition)}
              options={CROP_OPTIONS}
              label="Image Crop"
              style={{ maxWidth: 180 }}
            />
          </div>
        </div>
      )}

      {/* Product Pages Tab */}
      {activeTab === 'product-pages' && (
        <div className="cedros-admin__section" style={{ marginTop: '1rem' }}>
          {/* Related Products Section */}
          <div>
            <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Related Products</h4>
            <p style={{ marginBottom: '1rem', fontSize: 14, opacity: 0.7 }}>
              Configure how related products are displayed on product detail pages.
            </p>

            {/* Mode Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {MODE_OPTIONS.map((option) => {
                const isSelected = settings.relatedProducts.mode === option.value;
                const isDisabled = option.badge === 'Coming Soon';
                return (
                  <label
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '1rem',
                      border: `2px solid ${isSelected ? 'var(--cedros-admin-primary, #171717)' : 'var(--cedros-admin-border, #e5e5e5)'}`,
                      borderRadius: 8,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.6 : 1,
                      background: isSelected ? 'var(--cedros-admin-bg-accent, #f5f5f5)' : undefined,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="relatedProductsMode"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => !isDisabled && updateMode(option.value)}
                      disabled={isDisabled}
                      style={{ marginTop: 2 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{option.label}</span>
                        {option.badge && (
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: '#6366f1',
                              color: '#fff',
                            }}
                          >
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '0.25rem 0 0', fontSize: 13, opacity: 0.75 }}>
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Manual Mode Note */}
            {settings.relatedProducts.mode === 'manual' && (
              <div
                style={{
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  background: 'var(--cedros-admin-bg-accent, #f5f5f5)',
                  borderRadius: 8,
                  border: '1px solid var(--cedros-admin-border, #e5e5e5)',
                }}
              >
                <strong style={{ fontSize: 14 }}>How to set related products:</strong>
                <p style={{ margin: '0.5rem 0 0', fontSize: 13, opacity: 0.8 }}>
                  When editing a product, add a <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: 3 }}>relatedProductIds</code> field
                  to its metadata containing a comma-separated list of product IDs.
                </p>
                <p style={{ margin: '0.5rem 0 0', fontSize: 13, opacity: 0.6 }}>
                  Example: <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: 3 }}>prod_123,prod_456,prod_789</code>
                </p>
              </div>
            )}

            {/* Max Items */}
            <div className="cedros-admin__field" style={{ maxWidth: 200 }}>
              <label className="cedros-admin__field-label">Max Related Products</label>
              <input
                type="number"
                className="cedros-admin__input"
                value={settings.relatedProducts.maxItems}
                onChange={(e) => updateMaxItems(Math.max(1, Math.min(12, parseInt(e.target.value) || 4)))}
                min={1}
                max={12}
              />
              <p style={{ margin: '0.25rem 0 0', fontSize: 12, opacity: 0.6 }}>
                How many related products to show (1-12)
              </p>
            </div>

            {/* Related Products Layout */}
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontWeight: 500, marginBottom: '0.75rem' }}>Display Layout</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {LAYOUT_OPTIONS.map((option) => {
                  const isSelected = settings.relatedProducts.layout.layout === option.value;
                  return (
                    <label
                      key={option.value}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        border: `2px solid ${isSelected ? 'var(--cedros-admin-primary, #171717)' : 'var(--cedros-admin-border, #e5e5e5)'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: isSelected ? 'var(--cedros-admin-bg-accent, #f5f5f5)' : undefined,
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <input
                        type="radio"
                        name="relatedLayout"
                        value={option.value}
                        checked={isSelected}
                        onChange={() => updateRelatedLayout('layout', option.value)}
                        style={{ marginTop: 2 }}
                      />
                      <div>
                        <span style={{ fontWeight: 500 }}>{option.label}</span>
                        <p style={{ margin: '0.125rem 0 0', fontSize: 12, opacity: 0.6 }}>
                          {option.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <FormDropdown
                value={settings.relatedProducts.layout.imageCrop}
                onChange={(val) => updateRelatedLayout('imageCrop', val as ImageCropPosition)}
                options={CROP_OPTIONS}
                label="Image Crop"
                style={{ maxWidth: 180 }}
              />
            </div>
          </div>

          {/* Product Page Sections */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--cedros-admin-border, #e5e5e5)' }}>
            <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Page Sections</h4>
            <p style={{ marginBottom: '1rem', fontSize: 14, opacity: 0.7 }}>
              Choose which sections appear on product detail pages.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.sections.showDescription}
                  onChange={(checked) => updateSection('showDescription', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Description</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Expandable description accordion
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.sections.showSpecs}
                  onChange={(checked) => updateSection('showSpecs', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Specifications</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Product attributes and details
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.sections.showShipping}
                  onChange={(checked) => updateSection('showShipping', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Shipping &amp; Returns</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Shipping and return policy information
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.sections.showRelatedProducts}
                  onChange={(checked) => updateSection('showRelatedProducts', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Related Products</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Product recommendations section
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Tab */}
      {activeTab === 'checkout' && (
        <div className="cedros-admin__section" style={{ marginTop: '1rem' }}>
          {/* Checkout Settings Section */}
          <div>
            <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Checkout Settings</h4>
            <p style={{ marginBottom: '1rem', fontSize: 14, opacity: 0.7 }}>
              Configure checkout and cart page features.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.checkout.promoCodes}
                  onChange={(checked) => updateCheckout('promoCodes', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Promo Codes</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Show promo/coupon code input on cart and checkout pages
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Settings Section */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--cedros-admin-border, #e5e5e5)' }}>
            <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Inventory Settings</h4>
            <p style={{ marginBottom: '1rem', fontSize: 14, opacity: 0.7 }}>
              Configure inventory verification and reservation behavior.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.inventory.preCheckoutVerification}
                  onChange={(checked) => updateInventory('preCheckoutVerification', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Pre-Checkout Verification</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Verify inventory availability before processing payment
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle
                  checked={settings.inventory.holdsEnabled}
                  onChange={(checked) => updateInventory('holdsEnabled', checked)}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>Inventory Holds</span>
                  <p style={{ margin: '0.125rem 0 0', fontSize: 13, opacity: 0.6 }}>
                    Reserve inventory when items are added to cart
                  </p>
                </div>
              </div>
            </div>

            {settings.inventory.holdsEnabled && (
              <div className="cedros-admin__field" style={{ maxWidth: 200, marginTop: '1rem' }}>
                <label className="cedros-admin__field-label">Hold Duration (minutes)</label>
                <input
                  type="number"
                  className="cedros-admin__input"
                  value={settings.inventory.holdDurationMinutes}
                  onChange={(e) => updateInventory('holdDurationMinutes', Math.max(5, Math.min(60, parseInt(e.target.value) || 15)))}
                  min={5}
                  max={60}
                />
                <p style={{ margin: '0.25rem 0 0', fontSize: 12, opacity: 0.6 }}>
                  How long to reserve inventory in carts (5-60 minutes)
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

