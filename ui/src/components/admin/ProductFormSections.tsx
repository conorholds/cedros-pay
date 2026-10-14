/**
 * The body of the Add product page: friendly, grouped sections that progressively
 * reveal fields based on what the seller is creating. Defaults cover the common
 * case (a one-time digital product), so a simple product needs only a name,
 * description, and price; physical/in-app options appear only when relevant.
 */

import { AdvancedDetails } from './contentSettingsLayout';
import {
  InfoLine,
  MoneyField,
  NumberField,
  TextAreaField,
  TextField,
  ToggleField,
} from './contentSettingsFields';
import {
  CountriesField,
  FieldGroup,
  ImageField,
  RadioGroupField,
  TagsField,
} from './productFormControls';
import { ProductAppBillingSection } from './ProductAppBillingSection';
import {
  DEFAULT_COMMERCE_FEATURE_FLAGS,
  type CommerceFeatureFlags,
} from './commerceFeatureSettings';
import type {
  CheckoutRequirement,
  FulfillmentType,
  NewProductForm,
  NewProductUpdater,
} from './ProductAddFormTypes';
import type { AdminProductType } from './productDisplay';

export interface ProductSectionProps {
  product: NewProductForm;
  update: NewProductUpdater;
  /** Whether the product ID can be changed (true on create, false on edit). */
  idEditable: boolean;
  onTitleChange: (title: string) => void;
  onIdChange: (id: string) => void;
  onFulfillmentChange: (type: FulfillmentType) => void;
  onProductTypeChange: (type: AdminProductType) => void;
  onSellInAppChange: (on: boolean) => void;
  onBrowseMedia: () => void;
  canBrowseMedia: boolean;
  features?: CommerceFeatureFlags;
}

const SALES_TYPE_OPTIONS = [
  { value: 'one_time', label: 'One-time purchase' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'pay_per_access', label: 'Pay per access' },
] as const;

const DELIVERY_OPTIONS = [
  { value: 'digital_download', label: 'Digital' },
  { value: 'shipping', label: 'Physical' },
  { value: 'service', label: 'Service' },
] as const;

const REQUIREMENT_OPTIONS = [
  { value: 'none', label: 'Don’t ask' },
  { value: 'optional', label: 'Optional' },
  { value: 'required', label: 'Required' },
] as const;

export function ProductFormSections(props: ProductSectionProps) {
  const { product, features = DEFAULT_COMMERCE_FEATURE_FLAGS } = props;
  const isPhysical = product.fulfillmentType === 'shipping';
  const isDigital = product.fulfillmentType === 'digital_download';

  return (
    <>
      <DetailsSection {...props} />
      <PricingSection {...props} />
      <TypeAndDeliverySection {...props} />
      {isPhysical && <ShippingAndInventorySection {...props} inventoryEnabled={features.inventory} />}
      <CustomerInfoSection {...props} />
      {isDigital && (
        <ProductAppBillingSection
          product={product}
          update={props.update}
          onSellInAppChange={props.onSellInAppChange}
          subscriptionsEnabled={features.subscriptions}
        />
      )}
      <AdvancedSection {...props} />
    </>
  );
}

function DetailsSection({
  product,
  update,
  onTitleChange,
  onBrowseMedia,
  canBrowseMedia,
}: ProductSectionProps) {
  return (
    <FieldGroup title="Details" description="What you’re selling and how it shows up to customers.">
      <div className="cedros-admin__product-form-grid cedros-admin__product-form-grid--details">
        <TextField
          label="Name"
          value={product.title}
          onChange={onTitleChange}
          placeholder="e.g. Midweight Fleece Hoodie"
        />
        <ToggleField
          label="Available for sale"
          checked={product.active}
          onChange={(checked) => update('active', checked)}
          description="Turn off to keep this product as a draft."
          trailing
        />
      </div>
      <TextAreaField
        label="Description"
        value={product.description}
        onChange={(value) => update('description', value)}
        rows={3}
        placeholder="A short, plain-language summary customers see on the product and at checkout."
      />
      <ImageField
        value={product.imageUrl}
        onChange={(value) => update('imageUrl', value)}
        onBrowse={onBrowseMedia}
        canBrowse={canBrowseMedia}
      />
    </FieldGroup>
  );
}

function PricingSection({ product, update }: ProductSectionProps) {
  return (
    <FieldGroup
      title="Pricing"
      description="What customers pay. They can check out with card, crypto, or credits."
    >
      <div className="cedros-admin__form-row">
        <MoneyField
          label="Price"
          amountCents={product.priceCents}
          currency="USD"
          onChange={(value) => update('priceCents', value)}
          placeholder="0.00"
          description="The standard price customers pay."
        />
        <MoneyField
          label="Original price"
          amountCents={product.compareAtCents}
          currency="USD"
          onChange={(value) => update('compareAtCents', value)}
          placeholder="Optional"
          description="Shown struck through next to your price to highlight a discount."
        />
      </div>
    </FieldGroup>
  );
}

function TypeAndDeliverySection({
  product,
  features = DEFAULT_COMMERCE_FEATURE_FLAGS,
  onProductTypeChange,
  onFulfillmentChange,
}: ProductSectionProps) {
  const salesTypeOptions = SALES_TYPE_OPTIONS.filter(
    (option) => features.subscriptions || option.value !== 'subscription'
  );
  const deliveryOptions = DELIVERY_OPTIONS.filter(
    (option) =>
      features.shipping || option.value !== 'shipping' || product.fulfillmentType === 'shipping'
  );
  let deliveryDescription =
    'Digital can be sold in mobile apps; services are booked or delivered in person.';
  if (features.shipping) {
    deliveryDescription = features.inventory
      ? 'Physical adds shipping and inventory; digital can be sold in mobile apps; services are booked or delivered in person and skip shipping.'
      : 'Physical adds shipping; digital can be sold in mobile apps; services are booked or delivered in person and skip shipping.';
  }

  return (
    <FieldGroup
      title="How you sell it"
      description="How customers receive what they bought and how they pay for it."
    >
      <div className="cedros-admin__product-form-grid">
        <RadioGroupField<FulfillmentType>
          label="Delivery"
          value={product.fulfillmentType}
          onChange={onFulfillmentChange}
          options={deliveryOptions}
          description={deliveryDescription}
        />
        <RadioGroupField<AdminProductType>
          label="Sales type"
          value={product.productType}
          onChange={onProductTypeChange}
          options={salesTypeOptions}
          description="Configure subscription and pay-per-access details after creating the product."
        />
      </div>
    </FieldGroup>
  );
}

function ShippingAndInventorySection({
  inventoryEnabled,
  product,
  update,
}: ProductSectionProps & { inventoryEnabled: boolean }) {
  return (
    <FieldGroup
      title={inventoryEnabled ? 'Shipping and inventory' : 'Shipping'}
      description={inventoryEnabled ? 'Stock levels and where you ship.' : 'Where you ship.'}
    >
      {inventoryEnabled && (
        <>
          <ToggleField
            label="Track inventory"
            checked={product.trackInventory}
            onChange={(checked) => update('trackInventory', checked)}
            description="Count down available stock as orders come in. Manage ongoing levels on the Inventory tab."
          />
          {product.trackInventory && (
            <NumberField
              label="Quantity in stock"
              value={product.inventoryQuantity}
              onChange={(value) => update('inventoryQuantity', value)}
              nullable
              min={0}
              placeholder="0"
            />
          )}
        </>
      )}
      <CountriesField
        label="Ships to"
        value={product.shippingCountries}
        onChange={(value) => update('shippingCountries', value)}
        description="Add each country you ship to. A shipping address is collected at checkout."
      />
    </FieldGroup>
  );
}

function CustomerInfoSection({ product, update }: ProductSectionProps) {
  return (
    <FieldGroup
      title="Customer information"
      description="What to ask buyers for at checkout. Keep it to what you’ll actually use."
    >
      <div className="cedros-admin__product-form-grid">
        <RadioGroupField<CheckoutRequirement>
          label="Email address"
          value={product.checkoutEmail}
          onChange={(value) => update('checkoutEmail', value)}
          options={REQUIREMENT_OPTIONS}
          description="Needed to send receipts and order updates."
        />
        <RadioGroupField<CheckoutRequirement>
          label="Full name"
          value={product.checkoutName}
          onChange={(value) => update('checkoutName', value)}
          options={REQUIREMENT_OPTIONS}
          description="Useful for receipts and support. Recommended for anything you ship."
        />
        <RadioGroupField<CheckoutRequirement>
          label="Phone number"
          value={product.checkoutPhone}
          onChange={(value) => update('checkoutPhone', value)}
          options={REQUIREMENT_OPTIONS}
          description="Only ask if you’ll use it for delivery or support."
        />
      </div>
    </FieldGroup>
  );
}

function AdvancedSection({
  product,
  update,
  onIdChange,
  idEditable,
  features = DEFAULT_COMMERCE_FEATURE_FLAGS,
}: ProductSectionProps) {
  const categoryDescription = features.coupons
    ? 'Category IDs this product belongs to. Used for storefront grouping and category-wide coupons.'
    : 'Category IDs this product belongs to. Used for storefront grouping.';

  return (
    <AdvancedDetails>
      {idEditable ? (
        <TextField
          label="Product ID"
          value={product.id}
          onChange={onIdChange}
          placeholder="e.g. midweight-fleece-hoodie"
          description="Stable internal identity used in reports and integrations. It does not define the storefront URL."
        />
      ) : (
        <InfoLine label="Product ID">{product.id}</InfoLine>
      )}
      <TextField
        label="Storefront URL slug"
        value={product.slug}
        onChange={(value) => update('slug', value)}
        placeholder="e.g. midweight-fleece-hoodie"
        description="The host storefront uses this route identity. Changing it requires Core or Shop to redirect the previous slug."
      />
      <TagsField
        label="Tags"
        value={product.tags}
        onChange={(value) => update('tags', value)}
        placeholder="Add a tag, e.g. apparel"
        description="Optional labels for grouping and filtering products."
      />
      <TagsField
        label="Categories"
        value={product.categoryIds}
        onChange={(value) => update('categoryIds', value)}
        placeholder="Add a category ID, e.g. cat_apparel"
        description={categoryDescription}
      />
      <TextField
        label="SEO title"
        value={product.seoTitle}
        onChange={(value) => update('seoTitle', value)}
        placeholder="Defaults to the product name"
        description="The title search engines and link previews show."
      />
      <TextAreaField
        label="SEO description"
        value={product.seoDescription}
        onChange={(value) => update('seoDescription', value)}
        rows={2}
        placeholder="Defaults to the description"
      />
      <TextField
        label="Fulfillment note"
        value={product.fulfillmentNotes}
        onChange={(value) => update('fulfillmentNotes', value)}
        placeholder={fulfillmentNotePlaceholder(product.fulfillmentType)}
        description="A short delivery note shown to the customer after they buy."
      />
      <ToggleField
        label="Collect a billing address"
        checked={product.checkoutBillingAddress}
        onChange={(checked) => update('checkoutBillingAddress', checked)}
        description="Card payments already collect one. Turn this on if you also accept crypto or credits and need a billing address."
      />
    </AdvancedDetails>
  );
}

function fulfillmentNotePlaceholder(type: FulfillmentType): string {
  switch (type) {
    case 'shipping':
      return 'e.g. Ships within 3–5 business days';
    case 'service':
      return 'e.g. We’ll reach out to schedule within 1 business day';
    default:
      return 'e.g. Access is granted instantly after purchase';
  }
}
