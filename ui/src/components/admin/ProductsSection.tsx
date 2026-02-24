/**
 * Admin Dashboard - Products Section
 *
 * Product management interface with variations support for the admin panel.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { StatsBar } from './StatsBar';
import type { SectionProps, Product } from './types';
import { ProductVariationsEditor } from './ProductVariationsEditor';
import { FormDropdown } from './Dropdown';

export function ProductsSection({ serverUrl, apiKey, pageSize = 20, authManager }: SectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addProductError, setAddProductError] = useState<string | null>(null);
  const [editingVariationsProduct, setEditingVariationsProduct] = useState<Product | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'id' | 'product' | 'type' | 'price' | 'status'; direction: 'asc' | 'desc' } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    id: '',
    title: '',
    slug: '',
    imageUrl: '',
    description: '',
    productType: 'one_time' as 'one_time' | 'pay_per_access' | 'subscription',
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
    fulfillmentNotes: '',
    shippingCountriesCsv: '',
    inventoryQuantity: '' as '' | number,
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

  const getProductTitle = (p: Product) => p.metadata?.title || p.description || p.id;
  const getProductImageUrl = (p: Product) => p.metadata?.image_url;

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
  }, [fetchProducts]);

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

      const payload = {
        id: newProduct.id,
        description: newProduct.description,
        fiatAmountCents,
        fiatCurrency: newProduct.fiatCurrency,
        cryptoAtomicAmount,
        cryptoToken: newProduct.cryptoToken,
        ...(inventoryQuantity !== undefined ? { inventoryQuantity } : {}),
        metadata: {
          ...(productType ? { product_type: productType } : {}),
          ...buildCatalogMetadata(newProduct),
        },
      };

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
        fulfillmentNotes: '',
        shippingCountriesCsv: '',
        inventoryQuantity: '',
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
      default:
        return 'One-time purchase';
    }
  };

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
              onChange={(val) => setNewProduct(p => ({ ...p, productType: val as 'one_time' | 'pay_per_access' | 'subscription' }))}
              options={[
                { value: 'one_time', label: 'One-time purchase' },
                { value: 'pay_per_access', label: 'Pay per access' },
                { value: 'subscription', label: 'Subscription' },
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
    </div>
  );
}
