/**
 * Admin Dashboard - Products Section
 *
 * Product management interface with variations support for the admin panel.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { StatsBar } from './StatsBar';
import type {
  SectionProps,
  Product,
  StoreBillingConfig,
  StoreManagedProductKind,
  StorePolicyFulfillmentType,
} from './types';
import { ProductVariationsEditor } from './ProductVariationsEditor';
import { ComplianceRequirementsEditor } from './ComplianceRequirementsEditor';
import { NftMetadataPreview } from './NftMetadataPreview';
import { FormDropdown } from './Dropdown';
import type { ComplianceRequirements } from './complianceTypes';

export function ProductsSection({ serverUrl, apiKey, pageSize = 20, authManager }: SectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addProductError, setAddProductError] = useState<string | null>(null);
  const [editingVariationsProduct, setEditingVariationsProduct] = useState<Product | null>(null);
  const [nftPreviewProduct, setNftPreviewProduct] = useState<Product | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'id' | 'product' | 'type' | 'price' | 'status'; direction: 'asc' | 'desc' } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    id: '',
    title: '',
    slug: '',
    imageUrl: '',
    description: '',
    productType: 'one_time' as 'one_time' | 'pay_per_access' | 'subscription' | 'gift_card' | 'tokenized_asset',
    priceUsd: '' as '' | number,
    fiatCurrency: 'usd',
    cryptoToken: 'USDC',
    inventoryStatus: 'in_stock' as 'in_stock' | 'low' | 'out_of_stock' | 'backorder',
    compareAtUsd: '' as '' | number,
    tagsCsv: '',
    categoryIdsCsv: '',
    checkoutEmail: 'required' as 'none' | 'optional' | 'required',
    checkoutName: 'optional' as 'none' | 'optional' | 'required',
    checkoutPhone: 'none' as 'none' | 'optional' | 'required',
    checkoutShippingAddress: false,
    checkoutBillingAddress: false,
    fulfillmentType: 'shipping' as 'digital_download' | 'shipping' | 'service',
    storePolicyFulfillment: 'physical_goods' as StorePolicyFulfillmentType,
    storeManagedKind: 'none' as StoreManagedProductKind | 'none',
    appleProductId: '',
    googleProductId: '',
    googlePackageName: '',
    googleBasePlanId: '',
    googleOfferId: '',
    fulfillmentNotes: '',
    shippingCountriesCsv: '',
    inventoryQuantity: '' as '' | number,
    giftCardConfig: null as null | { faceValueCents: number; currency: string; secondaryMarket: boolean; expiresInDays: number | null },
    tokenizedAssetConfig: null as null | { assetClassCollectionId: string; backingValueCents: number; backingCurrency: string; assetIdentifier: string; tokensPerUnit: number; custodyProofUrl: string | null },
    complianceRequirements: null as ComplianceRequirements | null,
  });

  const buildCatalogMetadata = (p: typeof newProduct) => {
    const tags = p.tagsCsv
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const categoryIds = p.categoryIdsCsv
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const checkoutRequirements = {
      email: p.checkoutEmail,
      name: p.checkoutName,
      phone: p.checkoutPhone,
      shippingAddress: p.checkoutShippingAddress,
      billingAddress: p.checkoutBillingAddress,
    };

    // Derive shipping_profile from fulfillmentType for backwards compatibility
    const shippingProfile = p.fulfillmentType === 'shipping' ? 'physical' : 'digital';

    const metadata: Record<string, string> = {
      title: p.title,
      slug: p.slug || p.id,
      shipping_profile: shippingProfile,
      inventory_status: p.inventoryStatus,
      checkout_requirements: JSON.stringify(checkoutRequirements),
      fulfillment_type: p.fulfillmentType,
      store_policy_fulfillment_type: p.storePolicyFulfillment,
    };

    if (p.imageUrl) metadata.image_url = p.imageUrl;
    const compareAtCents = p.compareAtUsd ? Math.round(Number(p.compareAtUsd) * 100) : 0;
    if (compareAtCents) metadata.compare_at_amount_cents = String(compareAtCents);
    if (tags.length) metadata.tags = JSON.stringify(tags);
    if (categoryIds.length) metadata.category_ids = JSON.stringify(categoryIds);
    if (p.fulfillmentNotes) metadata.fulfillment_notes = p.fulfillmentNotes;

    const countries = p.shippingCountriesCsv
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (countries.length) {
      metadata.shippingCountries = countries.join(',');
      metadata.shipping_countries = countries.join(',');
    }

    return metadata;
  };

  const [assetCollections, setAssetCollections] = useState<Array<{ id: string; name: string }>>([]);

  const getProductTitle = (p: Product) => p.title || p.metadata?.title || p.description || p.id;
  const getProductImageUrl = (p: Product) => p.imageUrl || p.images?.[0]?.url || p.metadata?.image_url;
  const getStorePolicyFulfillment = (p: Product): StorePolicyFulfillmentType | undefined => {
    const value = p.metadata?.store_policy_fulfillment_type;
    if (
      value === 'digital_in_app' ||
      value === 'physical_goods' ||
      value === 'real_world_service' ||
      value === 'reader_content' ||
      value === 'other'
    ) {
      return value;
    }

    switch (p.fulfillment?.type) {
      case 'shipping':
        return 'physical_goods';
      case 'service':
        return 'real_world_service';
      case 'digital_download':
        return 'digital_in_app';
      default:
        return undefined;
    }
  };
  const formatStorePolicyFulfillment = (value?: StorePolicyFulfillmentType) => {
    switch (value) {
      case 'digital_in_app':
        return 'Digital in-app';
      case 'physical_goods':
        return 'Physical goods';
      case 'real_world_service':
        return 'Real-world service';
      case 'reader_content':
        return 'Reader content';
      case 'other':
        return 'Other';
      default:
        return 'Not set';
    }
  };
  const formatStoreManagedKind = (value?: StoreManagedProductKind) => {
    switch (value) {
      case 'consumable':
        return 'Consumable';
      case 'non_consumable':
        return 'Non-consumable';
      case 'auto_renewable_subscription':
        return 'Auto-renewing subscription';
      default:
        return 'External billing only';
    }
  };
  const buildStoreBillingPayload = (p: typeof newProduct): StoreBillingConfig | undefined => {
    if (p.storeManagedKind === 'none') {
      return undefined;
    }

    const trimmedAppleProductId = p.appleProductId.trim();
    const trimmedGoogleProductId = p.googleProductId.trim();
    const trimmedGooglePackageName = p.googlePackageName.trim();
    const trimmedGoogleBasePlanId = p.googleBasePlanId.trim();
    const trimmedGoogleOfferId = p.googleOfferId.trim();

    if (!trimmedAppleProductId && !trimmedGoogleProductId) {
      return undefined;
    }

    return {
      kind: p.storeManagedKind,
      apple: trimmedAppleProductId
        ? {
            productId: trimmedAppleProductId,
          }
        : undefined,
      google: trimmedGoogleProductId
        ? {
            productId: trimmedGoogleProductId,
            packageName: trimmedGooglePackageName || undefined,
            basePlanId: trimmedGoogleBasePlanId || undefined,
            offerId: trimmedGoogleOfferId || undefined,
          }
        : undefined,
    };
  };
  const getStoreSetupSummary = (p: Product) => {
    const parts: string[] = [];
    const policyType = getStorePolicyFulfillment(p);
    if (policyType) {
      parts.push(formatStorePolicyFulfillment(policyType));
    }
    if (p.storeBilling?.kind) {
      parts.push(formatStoreManagedKind(p.storeBilling.kind));
    }
    if (p.storeBilling?.apple?.productId) {
      parts.push(`Apple ${p.storeBilling.apple.productId}`);
    }
    if (p.storeBilling?.google?.productId) {
      parts.push(`Google ${p.storeBilling.google.productId}`);
    }
    return parts.join(' • ');
  };

  const fetchProducts = useCallback(async () => {
    try {
      setFetchError(null);
      let data: { products: Product[] };

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<{ products: Product[] }>(`/admin/products?limit=${pageSize}`);
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;

        const res = await fetch(`${serverUrl}/admin/products?limit=${pageSize}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
        data = await res.json();
      }

      setProducts(data.products || []);
    } catch {
      setProducts([]);
      setFetchError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, apiKey, pageSize, authManager]);

  useEffect(() => {
    fetchProducts();
    // Fetch asset class collections for the dropdown
    (async () => {
      try {
        let data: { collections: Array<{ id: string; name: string; tokenizationConfig?: unknown }> };
        if (authManager?.isAuthenticated()) {
          data = await authManager.fetchWithAuth('/admin/collections');
        } else {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (apiKey) headers['X-API-Key'] = apiKey;
          const res = await fetch(`${serverUrl}/admin/collections`, { headers });
          if (!res.ok) return;
          data = await res.json();
        }
        setAssetCollections((data.collections || []).filter(c => c.tokenizationConfig).map(c => ({ id: c.id, name: c.name })));
      } catch { /* non-critical — text input fallback still works */ }
    })();
  }, [fetchProducts, serverUrl, apiKey, authManager]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.id || !newProduct.description) return;

    setAddProductError(null);

    if (newProduct.fulfillmentType === 'shipping' && newProduct.checkoutShippingAddress) {
      const countries = newProduct.shippingCountriesCsv
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (!countries.length) {
        setAddProductError('Shipping countries are required when collecting shipping address. Example: US,CA');
        return;
      }
    }

    if (
      newProduct.storeManagedKind !== 'none' &&
      !newProduct.appleProductId.trim() &&
      !newProduct.googleProductId.trim()
    ) {
      setAddProductError('Add at least one Apple or Google store product ID for store-managed products.');
      return;
    }

    if (newProduct.googleBasePlanId.trim() && !newProduct.googleProductId.trim()) {
      setAddProductError('Google base plan ID requires a Google product ID.');
      return;
    }

    if (
      newProduct.storeManagedKind === 'auto_renewable_subscription' &&
      newProduct.googleProductId.trim() &&
      !newProduct.googleBasePlanId.trim()
    ) {
      setAddProductError('Google Play subscriptions require a base plan ID.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { productType } = newProduct;

      const inventoryQuantity =
        newProduct.inventoryQuantity === ''
          ? undefined
          : Number.isFinite(Number(newProduct.inventoryQuantity))
            ? Number(newProduct.inventoryQuantity)
            : undefined;

      // Convert USD to cents (fiat) and atomic units (crypto: USDC has 6 decimals)
      const priceUsdNum = Number(newProduct.priceUsd) || 0;
      const fiatAmountCents = Math.round(priceUsdNum * 100);
      const cryptoAtomicAmount = Math.round(priceUsdNum * 1_000_000);
      const tags = newProduct.tagsCsv
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const categoryIds = newProduct.categoryIdsCsv
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const checkoutRequirements = {
        email: newProduct.checkoutEmail,
        name: newProduct.checkoutName,
        phone: newProduct.checkoutPhone,
        shippingAddress: newProduct.checkoutShippingAddress,
        billingAddress: newProduct.checkoutBillingAddress,
      };
      const storeBilling = buildStoreBillingPayload(newProduct);
      const compareAtFiatAmountCents =
        newProduct.compareAtUsd === ''
          ? undefined
          : Math.round(Number(newProduct.compareAtUsd) * 100);

      const payload: Record<string, unknown> = {
        id: newProduct.id,
        title: newProduct.title || undefined,
        slug: newProduct.slug || undefined,
        description: newProduct.description,
        tags,
        categoryIds,
        images: newProduct.imageUrl
          ? [{ url: newProduct.imageUrl, alt: newProduct.title || newProduct.id }]
          : [],
        shippingProfile: newProduct.fulfillmentType === 'shipping' ? 'physical' : 'digital',
        checkoutRequirements,
        fulfillment: {
          type: newProduct.fulfillmentType,
          notes: newProduct.fulfillmentNotes || undefined,
        },
        fiatAmountCents,
        fiatCurrency: newProduct.fiatCurrency,
        compareAtFiatAmountCents,
        compareAtFiatCurrency: compareAtFiatAmountCents ? newProduct.fiatCurrency : undefined,
        cryptoAtomicAmount,
        cryptoToken: newProduct.cryptoToken,
        inventoryStatus:
          newProduct.fulfillmentType === 'shipping'
            ? newProduct.inventoryStatus
            : undefined,
        ...(inventoryQuantity !== undefined ? { inventoryQuantity } : {}),
        ...(storeBilling ? { storeBilling } : {}),
        metadata: {
          ...(productType ? { product_type: productType } : {}),
          ...buildCatalogMetadata(newProduct),
        },
      };

      if (productType === 'gift_card' && newProduct.giftCardConfig) {
        payload.giftCardConfig = newProduct.giftCardConfig;
      }

      if (productType === 'tokenized_asset' && newProduct.tokenizedAssetConfig) {
        payload.tokenizedAssetConfig = newProduct.tokenizedAssetConfig;
      }

      if (newProduct.complianceRequirements) {
        payload.complianceRequirements = newProduct.complianceRequirements;
      }

      if (authManager?.isAuthenticated()) {
        await authManager.fetchWithAuth('/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}/admin/products`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Failed to create product: ${res.status}`);
      }

      // Reset form and refresh list
      setNewProduct({
        id: '',
        title: '',
        slug: '',
        imageUrl: '',
        description: '',
        productType: 'one_time',
        priceUsd: '',
        fiatCurrency: 'usd',
        cryptoToken: 'USDC',
        inventoryStatus: 'in_stock',
        compareAtUsd: '',
        tagsCsv: '',
        categoryIdsCsv: '',
        checkoutEmail: 'required',
        checkoutName: 'optional',
        checkoutPhone: 'none',
        checkoutShippingAddress: false,
        checkoutBillingAddress: false,
        fulfillmentType: 'shipping',
        storePolicyFulfillment: 'physical_goods',
        storeManagedKind: 'none',
        appleProductId: '',
        googleProductId: '',
        googlePackageName: '',
        googleBasePlanId: '',
        googleOfferId: '',
        fulfillmentNotes: '',
        shippingCountriesCsv: '',
        inventoryQuantity: '',
        giftCardConfig: null,
        tokenizedAssetConfig: null,
        complianceRequirements: null,
      });
      setShowAddForm(false);
      fetchProducts();
    } catch (err) {
      setAddProductError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatProductType = (value?: string) => {
    switch (value) {
      case 'subscription':
        return 'Subscription';
      case 'pay_per_access':
        return 'Pay per access';
      case 'one_time':
        return 'One-time purchase';
      case 'gift_card':
        return 'Gift card';
      default:
        return 'One-time purchase';
    }
  };
  const showStoreBillingFields =
    newProduct.storePolicyFulfillment === 'digital_in_app' ||
    newProduct.storePolicyFulfillment === 'reader_content' ||
    newProduct.storePolicyFulfillment === 'other' ||
    newProduct.productType === 'subscription' ||
    newProduct.storeManagedKind !== 'none';

  // Memoize expensive calculations to prevent unnecessary re-renders
  const stats = useMemo(() => {
    const activeCount = products.filter(p => p.active).length;
    // Count SKUs: each product is 1 SKU, plus count variations if present
    const totalSkus = products.reduce((sum, p) => {
      const variationCount = p.variations?.length ?? 0;
      return sum + (variationCount > 0 ? variationCount : 1);
    }, 0);
    return { activeCount, totalSkus };
  }, [products]);

  const toggleSort = (key: 'id' | 'product' | 'type' | 'price' | 'status') => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const getSortIcon = (key: 'id' | 'product' | 'type' | 'price' | 'status') => {
    if (!sortConfig || sortConfig.key !== key) {
      return <span className="cedros-admin__sort-icon cedros-admin__sort-icon--idle">{Icons.chevronUp}</span>;
    }
    return (
      <span className="cedros-admin__sort-icon">
        {sortConfig.direction === 'asc' ? Icons.chevronUp : Icons.chevronDown}
      </span>
    );
  };

  const sortedProducts = useMemo(() => {
    if (!sortConfig) return products;
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    const getValue = (product: Product) => {
      switch (sortConfig.key) {
        case 'product':
          return getProductTitle(product);
        case 'type':
          return formatProductType(product.metadata?.product_type);
        case 'price':
          return product.fiatAmountCents ?? 0;
        case 'status':
          return product.active ? 1 : 0;
        case 'id':
        default:
          return product.id;
      }
    };
    return [...products].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' }) * direction;
    });
  }, [products, sortConfig]);

  return (
    <div className="cedros-admin__page">
      <ErrorBanner message={fetchError} onRetry={fetchProducts} />
      {/* Stats Bar */}
      <StatsBar
        stats={[
          { label: 'Total Products', value: products.length },
          { label: 'Active', value: stats.activeCount, variant: stats.activeCount > 0 ? 'success' : 'muted' },
          { label: 'Total SKUs', value: stats.totalSkus },
        ]}
        isLoading={isLoading}
      />

      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Paywall Products</h3>
        <button
          className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--action"
          onClick={() => {
            setAddProductError(null);
            setShowAddForm(!showAddForm);
          }}
        >
          {showAddForm ? Icons.close : Icons.plus}
          {showAddForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddProduct} className="cedros-admin__add-form">
          {addProductError && (
            <div style={{ marginBottom: '0.75rem', color: '#B42318', fontWeight: 600 }}>
              {addProductError}
            </div>
          )}
          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Product ID</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newProduct.id}
                onChange={(e) => setNewProduct(p => ({ ...p, id: e.target.value }))}
                placeholder="e.g., premium-article"
                required
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Product name</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newProduct.title}
                onChange={(e) => setNewProduct(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Cedros Hoodie"
              />
            </div>
          </div>

          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Slug</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newProduct.slug}
                onChange={(e) => setNewProduct(p => ({ ...p, slug: e.target.value }))}
                placeholder="e.g., cedros-hoodie (defaults to ID)"
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Primary image URL</label>
              <input
                type="url"
                className="cedros-admin__input"
                value={newProduct.imageUrl}
                onChange={(e) => setNewProduct(p => ({ ...p, imageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Short description</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newProduct.description}
                onChange={(e) => setNewProduct(p => ({ ...p, description: e.target.value }))}
                placeholder="e.g., Midweight fleece with relaxed fit"
                required
              />
            </div>
          </div>
          <div className="cedros-admin__form-row">
            <FormDropdown
              value={newProduct.productType}
              onChange={(val) => setNewProduct(p => ({
                ...p,
                productType: val as 'one_time' | 'pay_per_access' | 'subscription' | 'gift_card' | 'tokenized_asset',
                storeManagedKind:
                  val === 'subscription'
                    ? 'auto_renewable_subscription'
                    : p.storeManagedKind === 'auto_renewable_subscription'
                      ? 'non_consumable'
                      : p.storeManagedKind,
                giftCardConfig: val === 'gift_card'
                  ? (p.giftCardConfig ?? { faceValueCents: 0, currency: 'usd', secondaryMarket: false, expiresInDays: null })
                  : null,
                tokenizedAssetConfig: val === 'tokenized_asset'
                  ? (p.tokenizedAssetConfig ?? { assetClassCollectionId: '', backingValueCents: 0, backingCurrency: 'usd', assetIdentifier: '', tokensPerUnit: 1, custodyProofUrl: null })
                  : null,
              }))}
              options={[
                { value: 'one_time', label: 'One-time purchase' },
                { value: 'pay_per_access', label: 'Pay per access' },
                { value: 'subscription', label: 'Subscription' },
                { value: 'gift_card', label: 'Gift card' },
                { value: 'tokenized_asset', label: 'Tokenized asset' },
              ]}
              label="Product Type"
            />
            <FormDropdown
              value={newProduct.fulfillmentType}
              onChange={(val) => {
                const fulfillment = val as 'shipping' | 'digital_download' | 'service';
                setNewProduct(p => ({
                  ...p,
                  fulfillmentType: fulfillment,
                  storePolicyFulfillment:
                    fulfillment === 'shipping'
                      ? 'physical_goods'
                      : fulfillment === 'service'
                        ? 'real_world_service'
                        : 'digital_in_app',
                  storeManagedKind:
                    fulfillment === 'shipping' || fulfillment === 'service'
                      ? 'none'
                      : p.productType === 'subscription'
                        ? 'auto_renewable_subscription'
                        : p.storeManagedKind === 'none'
                          ? 'non_consumable'
                          : p.storeManagedKind,
                  checkoutShippingAddress: fulfillment === 'shipping' ? p.checkoutShippingAddress : false,
                }));
              }}
              options={[
                { value: 'shipping', label: 'Physical (shipped)' },
                { value: 'digital_download', label: 'Digital download' },
                { value: 'service', label: 'Service' },
              ]}
              label="Fulfillment"
            />
          </div>

          <div
            style={{
              padding: '0.9rem 1rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--cedros-admin-border, #e5e7eb)',
              background: 'var(--cedros-admin-surface, #ffffff)',
              marginBottom: '1rem',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Store policy and app billing</div>
            <div style={{ fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.8 }}>
              This controls how Cedros routes payments across the web, Apple App Store, and Google Play. For digital app functionality, choose the explicit store policy classification here instead of relying on generic product type labels.
            </div>
          </div>

          <div className="cedros-admin__form-row">
            <FormDropdown
              value={newProduct.storePolicyFulfillment}
              onChange={(val) =>
                setNewProduct((p) => ({
                  ...p,
                  storePolicyFulfillment: val as StorePolicyFulfillmentType,
                  storeManagedKind:
                    val === 'physical_goods' || val === 'real_world_service'
                      ? 'none'
                      : p.storeManagedKind,
                }))
              }
              options={[
                { value: 'digital_in_app', label: 'Digital in-app' },
                { value: 'physical_goods', label: 'Physical goods' },
                { value: 'real_world_service', label: 'Real-world service' },
                { value: 'reader_content', label: 'Reader content' },
                { value: 'other', label: 'Other / review manually' },
              ]}
              label="Store policy classification"
            />
            <FormDropdown
              value={newProduct.storeManagedKind}
              onChange={(val) =>
                setNewProduct((p) => ({
                  ...p,
                  storeManagedKind: val as StoreManagedProductKind | 'none',
                }))
              }
              options={[
                { value: 'none', label: 'External billing only' },
                { value: 'consumable', label: 'Consumable' },
                { value: 'non_consumable', label: 'Non-consumable' },
                { value: 'auto_renewable_subscription', label: 'Auto-renewing subscription' },
              ]}
              label="Store-managed product kind"
            />
          </div>

          {showStoreBillingFields && (
            <>
              <div className="cedros-admin__form-row">
                <div className="cedros-admin__field">
                  <label className="cedros-admin__field-label">Apple product ID</label>
                  <input
                    type="text"
                    className="cedros-admin__input"
                    value={newProduct.appleProductId}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, appleProductId: e.target.value }))
                    }
                    placeholder="e.g., com.cedros.pro.monthly"
                  />
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                    Create the matching product in App Store Connect and paste the product ID here.
                  </div>
                </div>
                <div className="cedros-admin__field">
                  <label className="cedros-admin__field-label">Google product ID</label>
                  <input
                    type="text"
                    className="cedros-admin__input"
                    value={newProduct.googleProductId}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, googleProductId: e.target.value }))
                    }
                    placeholder="e.g., pro_monthly"
                  />
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                    Create the matching one-time product or subscription in Google Play Console.
                  </div>
                </div>
              </div>

              <div className="cedros-admin__form-row">
                <div className="cedros-admin__field">
                  <label className="cedros-admin__field-label">Google package name</label>
                  <input
                    type="text"
                    className="cedros-admin__input"
                    value={newProduct.googlePackageName}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, googlePackageName: e.target.value }))
                    }
                    placeholder="e.g., com.cedros.app"
                  />
                </div>
                <div className="cedros-admin__field">
                  <label className="cedros-admin__field-label">Google base plan ID</label>
                  <input
                    type="text"
                    className="cedros-admin__input"
                    value={newProduct.googleBasePlanId}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, googleBasePlanId: e.target.value }))
                    }
                    placeholder="Required for Google subscriptions"
                  />
                </div>
                <div className="cedros-admin__field">
                  <label className="cedros-admin__field-label">Google offer ID</label>
                  <input
                    type="text"
                    className="cedros-admin__input"
                    value={newProduct.googleOfferId}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, googleOfferId: e.target.value }))
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
            </>
          )}

          {newProduct.productType === 'gift_card' && (<>
          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Gift card face value (USD cents)</label>
              <input
                type="number"
                className="cedros-admin__input"
                value={newProduct.giftCardConfig?.faceValueCents ?? ''}
                onChange={(e) => setNewProduct(p => ({
                  ...p,
                  giftCardConfig: {
                    faceValueCents: parseInt(e.target.value) || 0,
                    currency: p.giftCardConfig?.currency ?? 'usd',
                    secondaryMarket: p.giftCardConfig?.secondaryMarket ?? false,
                    expiresInDays: p.giftCardConfig?.expiresInDays ?? null,
                  },
                }))}
                placeholder="e.g., 5000 for $50.00"
                min="1"
                required
              />
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                Face value in cents (e.g. 5000 = $50.00). Must be greater than 0.
              </div>
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Gift card currency</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newProduct.giftCardConfig?.currency ?? ''}
                onChange={(e) => setNewProduct(p => ({
                  ...p,
                  giftCardConfig: {
                    faceValueCents: p.giftCardConfig?.faceValueCents ?? 0,
                    currency: e.target.value.toLowerCase().slice(0, 3),
                    secondaryMarket: p.giftCardConfig?.secondaryMarket ?? false,
                    expiresInDays: p.giftCardConfig?.expiresInDays ?? null,
                  },
                }))}
                placeholder="usd"
                maxLength={3}
                required
              />
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                ISO 4217 3-letter currency code (e.g. usd, eur, gbp).
              </div>
            </div>
          </div>
          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Expiration (days)</label>
              <input
                type="number"
                className="cedros-admin__input"
                value={newProduct.giftCardConfig?.expiresInDays ?? ''}
                onChange={(e) => setNewProduct(p => ({
                  ...p,
                  giftCardConfig: {
                    faceValueCents: p.giftCardConfig?.faceValueCents ?? 0,
                    currency: p.giftCardConfig?.currency ?? 'usd',
                    secondaryMarket: p.giftCardConfig?.secondaryMarket ?? false,
                    expiresInDays: e.target.value === '' ? null : parseInt(e.target.value) || 0,
                  },
                }))}
                placeholder="Leave blank for no expiry"
                min="0"
              />
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                Number of days until gift card expires. Leave blank for no expiry.
              </div>
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Secondary market (Token-22)</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={newProduct.giftCardConfig?.secondaryMarket ?? false}
                  onChange={(e) => setNewProduct(p => ({
                    ...p,
                    giftCardConfig: {
                      faceValueCents: p.giftCardConfig?.faceValueCents ?? 0,
                      currency: p.giftCardConfig?.currency ?? 'usd',
                      secondaryMarket: e.target.checked,
                      expiresInDays: p.giftCardConfig?.expiresInDays ?? null,
                    },
                  }))}
                />
                Enable Token-22 secondary market trading
              </label>
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                Mints store credit tokens to recipient&apos;s embedded wallet for peer-to-peer trading with transfer fees.
              </div>
            </div>
          </div>
          </>)}

          {newProduct.productType === 'tokenized_asset' && (<>
          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Asset class collection</label>
              {assetCollections.length > 0 ? (
                <select
                  className="cedros-admin__input"
                  value={newProduct.tokenizedAssetConfig?.assetClassCollectionId ?? ''}
                  onChange={(e) => setNewProduct(p => ({
                    ...p,
                    tokenizedAssetConfig: { ...p.tokenizedAssetConfig!, assetClassCollectionId: e.target.value },
                  }))}
                  required
                >
                  <option value="">Select asset class...</option>
                  {assetCollections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  className="cedros-admin__input"
                  value={newProduct.tokenizedAssetConfig?.assetClassCollectionId ?? ''}
                  onChange={(e) => setNewProduct(p => ({
                    ...p,
                    tokenizedAssetConfig: { ...p.tokenizedAssetConfig!, assetClassCollectionId: e.target.value },
                  }))}
                  placeholder="Collection ID of the asset class"
                  required
                />
              )}
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Backing value (cents)</label>
              <input
                type="number"
                className="cedros-admin__input"
                value={newProduct.tokenizedAssetConfig?.backingValueCents ?? 0}
                onChange={(e) => setNewProduct(p => ({
                  ...p,
                  tokenizedAssetConfig: { ...p.tokenizedAssetConfig!, backingValueCents: Number(e.target.value) },
                }))}
                min={0}
              />
            </div>
          </div>
          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Backing currency</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newProduct.tokenizedAssetConfig?.backingCurrency ?? 'usd'}
                onChange={(e) => setNewProduct(p => ({
                  ...p,
                  tokenizedAssetConfig: { ...p.tokenizedAssetConfig!, backingCurrency: e.target.value },
                }))}
                placeholder="usd"
                maxLength={3}
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Asset identifier</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newProduct.tokenizedAssetConfig?.assetIdentifier ?? ''}
                onChange={(e) => setNewProduct(p => ({
                  ...p,
                  tokenizedAssetConfig: { ...p.tokenizedAssetConfig!, assetIdentifier: e.target.value },
                }))}
                placeholder="e.g., ISIN, lot number"
              />
            </div>
          </div>
          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Tokens per unit</label>
              <input
                type="number"
                className="cedros-admin__input"
                value={newProduct.tokenizedAssetConfig?.tokensPerUnit ?? 1}
                onChange={(e) => setNewProduct(p => ({
                  ...p,
                  tokenizedAssetConfig: { ...p.tokenizedAssetConfig!, tokensPerUnit: Number(e.target.value) },
                }))}
                min={1}
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Custody proof URL</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newProduct.tokenizedAssetConfig?.custodyProofUrl ?? ''}
                onChange={(e) => setNewProduct(p => ({
                  ...p,
                  tokenizedAssetConfig: { ...p.tokenizedAssetConfig!, custodyProofUrl: e.target.value || null },
                }))}
                placeholder="https://..."
              />
            </div>
          </div>
          </>)}

          {newProduct.fulfillmentType === 'shipping' && (
          <div className="cedros-admin__form-row">
            <FormDropdown
              value={newProduct.inventoryStatus}
              onChange={(val) =>
                setNewProduct(p => ({
                  ...p,
                  inventoryStatus: val as 'in_stock' | 'low' | 'out_of_stock' | 'backorder',
                }))
              }
              options={[
                { value: 'in_stock', label: 'In stock' },
                { value: 'low', label: 'Low' },
                { value: 'out_of_stock', label: 'Out of stock' },
                { value: 'backorder', label: 'Backorder' },
              ]}
              label="Inventory status"
            />
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Inventory quantity (tracked)</label>
              <input
                type="number"
                className="cedros-admin__input"
                value={newProduct.inventoryQuantity}
                onChange={(e) =>
                  setNewProduct((p) => ({
                    ...p,
                    inventoryQuantity: e.target.value === '' ? '' : parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="Leave blank for untracked"
                min="0"
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Compare-at price (USD)</label>
              <input
                type="number"
                className="cedros-admin__input"
                value={newProduct.compareAtUsd === '' ? '' : newProduct.compareAtUsd}
                onChange={(e) => setNewProduct(p => ({ ...p, compareAtUsd: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
                placeholder="e.g., 78.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          )}
          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Price (USD)</label>
              <input
                type="number"
                className="cedros-admin__input"
                value={newProduct.priceUsd === '' ? '' : newProduct.priceUsd}
                onChange={(e) => setNewProduct(p => ({ ...p, priceUsd: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
                placeholder="e.g., 5.00"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Tags (comma-separated)</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newProduct.tagsCsv}
                onChange={(e) => setNewProduct(p => ({ ...p, tagsCsv: e.target.value }))}
                placeholder="e.g., core, new, gift"
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Category IDs (comma-separated)</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newProduct.categoryIdsCsv}
                onChange={(e) => setNewProduct(p => ({ ...p, categoryIdsCsv: e.target.value }))}
                placeholder="e.g., cat_apparel, cat_accessories"
              />
            </div>
          </div>

          <div className="cedros-admin__form-row">
            <FormDropdown
              value={newProduct.checkoutEmail}
              onChange={(val) => setNewProduct(p => ({ ...p, checkoutEmail: val as 'none' | 'optional' | 'required' }))}
              options={[
                { value: 'none', label: 'None' },
                { value: 'optional', label: 'Optional' },
                { value: 'required', label: 'Required' },
              ]}
              label="Checkout: Email"
            />
            <FormDropdown
              value={newProduct.checkoutName}
              onChange={(val) => setNewProduct(p => ({ ...p, checkoutName: val as 'none' | 'optional' | 'required' }))}
              options={[
                { value: 'none', label: 'None' },
                { value: 'optional', label: 'Optional' },
                { value: 'required', label: 'Required' },
              ]}
              label="Checkout: Name"
            />
            <FormDropdown
              value={newProduct.checkoutPhone}
              onChange={(val) => setNewProduct(p => ({ ...p, checkoutPhone: val as 'none' | 'optional' | 'required' }))}
              options={[
                { value: 'none', label: 'None' },
                { value: 'optional', label: 'Optional' },
                { value: 'required', label: 'Required' },
              ]}
              label="Checkout: Phone"
            />
          </div>

          <div className="cedros-admin__form-row">
            {newProduct.fulfillmentType === 'shipping' && (
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Checkout: Shipping address</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={newProduct.checkoutShippingAddress}
                  onChange={(e) => setNewProduct((p) => ({ ...p, checkoutShippingAddress: e.target.checked }))}
                />
                Collect shipping address
              </label>
            </div>
            )}
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Checkout: Billing address</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={newProduct.checkoutBillingAddress}
                  onChange={(e) => setNewProduct((p) => ({ ...p, checkoutBillingAddress: e.target.checked }))}
                />
                Collect billing address
              </label>
            </div>
          </div>

          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Fulfillment notes</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newProduct.fulfillmentNotes}
                onChange={(e) => setNewProduct(p => ({ ...p, fulfillmentNotes: e.target.value }))}
                placeholder={newProduct.fulfillmentType === 'shipping' ? 'e.g., Ships within 3-5 business days' : 'e.g., Downloadable from your account after purchase'}
              />
            </div>
          </div>

          {newProduct.fulfillmentType === 'shipping' && newProduct.checkoutShippingAddress && (
          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Shipping countries</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newProduct.shippingCountriesCsv}
                onChange={(e) => setNewProduct(p => ({ ...p, shippingCountriesCsv: e.target.value }))}
                placeholder="e.g., US,CA"
              />
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                ISO 2-letter country codes, comma-separated. Required for shipping address collection.
              </div>
            </div>
          </div>
          )}
          <ComplianceRequirementsEditor
            value={newProduct.complianceRequirements}
            onChange={(val) => setNewProduct(p => ({ ...p, complianceRequirements: val }))}
          />

          <div className="cedros-admin__form-actions">
            <button type="submit" className="cedros-admin__button cedros-admin__button--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading products...</div>
      ) : (
        <div className="cedros-admin__table-container">
          <table className="cedros-admin__table">
            <thead>
              <tr>
                <th aria-sort={sortConfig?.key === 'id' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('id')}>
                    ID
                    {getSortIcon('id')}
                  </button>
                </th>
                <th aria-sort={sortConfig?.key === 'product' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('product')}>
                    Product
                    {getSortIcon('product')}
                  </button>
                </th>
                <th aria-sort={sortConfig?.key === 'type' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('type')}>
                    Type
                    {getSortIcon('type')}
                  </button>
                </th>
                <th aria-sort={sortConfig?.key === 'price' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('price')}>
                    Price
                    {getSortIcon('price')}
                  </button>
                </th>
                <th aria-sort={sortConfig?.key === 'status' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('status')}>
                    Status
                    {getSortIcon('status')}
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((product) => (
                <tr key={product.id}>
                  <td><code>{product.id}</code></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getProductImageUrl(product) ? (
                        <img
                          src={getProductImageUrl(product)}
                          alt=""
                          style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(0,0,0,0.06)' }} />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{getProductTitle(product)}</span>
                        <span style={{ opacity: 0.8 }}>{product.description}</span>
                        {getStoreSetupSummary(product) ? (
                          <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>
                            {getStoreSetupSummary(product)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td>{formatProductType(product.metadata?.product_type)}</td>
                  <td>{formatPrice(product.fiatAmountCents)}</td>
                  <td>
                    <span className={`cedros-admin__badge ${product.active ? 'cedros-admin__badge--success' : 'cedros-admin__badge--muted'}`}>
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        className="cedros-admin__button cedros-admin__button--ghost"
                        onClick={() => setEditingVariationsProduct(product)}
                      >
                        Variations
                      </button>
                      {product.metadata?.product_type === 'tokenized_asset' && (
                        <button
                          className="cedros-admin__button cedros-admin__button--ghost"
                          onClick={() => setNftPreviewProduct(product)}
                        >
                          NFT
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Variations Editor Modal */}
      {editingVariationsProduct && (
        <div className="cedros-admin__modal-overlay" onClick={() => setEditingVariationsProduct(null)}>
          <div
            className="cedros-admin__modal cedros-admin__modal--lg"
            onClick={(e) => e.stopPropagation()}
          >
            <ProductVariationsEditor
              serverUrl={serverUrl}
              productId={editingVariationsProduct.id}
              productTitle={getProductTitle(editingVariationsProduct)}
              defaultPrice={editingVariationsProduct.fiatAmountCents / 100}
              apiKey={apiKey}
              authManager={authManager}
              onClose={() => setEditingVariationsProduct(null)}
            />
          </div>
        </div>
      )}

      {/* NFT Metadata Preview Modal */}
      {nftPreviewProduct && (
        <div className="cedros-admin__modal-overlay" onClick={() => setNftPreviewProduct(null)}>
          <div
            className="cedros-admin__modal cedros-admin__modal--lg"
            onClick={(e) => e.stopPropagation()}
          >
            <NftMetadataPreview
              serverUrl={serverUrl}
              productId={nftPreviewProduct.id}
              productTitle={getProductTitle(nftPreviewProduct)}
              apiKey={apiKey}
              authManager={authManager}
              onClose={() => setNftPreviewProduct(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
