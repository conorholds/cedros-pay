/**
 * In-app purchase setup, shown only for digital products. Off by default:
 * most sellers route digital payments through the web, and Apple/Google
 * in-app purchase is opt-in and needs store-side product IDs to work.
 */

import { AdvancedDetails } from './contentSettingsLayout';
import { SelectField, TextField, ToggleField } from './contentSettingsFields';
import { FieldGroup, SegmentedField } from './productFormControls';
import type { NewProductForm, NewProductUpdater } from './ProductAddFormTypes';
import type { StoreManagedProductKind, StorePolicyFulfillmentType } from './types';

const STORE_KIND_OPTIONS = [
  { value: 'non_consumable', label: 'Unlock once' },
  { value: 'consumable', label: 'Used up (e.g. coins or credits)' },
  { value: 'auto_renewable_subscription', label: 'Renews automatically' },
] as const;

const STORE_CATEGORY_OPTIONS = [
  { value: 'digital_in_app', label: 'Digital content' },
  { value: 'reader_content', label: 'Books, news, or media' },
  { value: 'other', label: 'Something else' },
];

export function ProductAppBillingSection({
  subscriptionsEnabled = true,
  product,
  update,
  onSellInAppChange,
}: {
  subscriptionsEnabled?: boolean;
  product: NewProductForm;
  update: NewProductUpdater;
  onSellInAppChange: (on: boolean) => void;
}) {
  const storeKindOptions = STORE_KIND_OPTIONS.filter(
    (option) => subscriptionsEnabled || option.value !== 'auto_renewable_subscription'
  );

  return (
    <FieldGroup
      title="In-app purchases"
      description="Apple and Google require digital goods sold inside iOS and Android apps to use their in-app purchase systems. Turn this on and link your store products if you sell in those apps. Web checkout keeps working either way."
    >
      <ToggleField
        label="Sell this through the App Store and Google Play"
        checked={product.sellInApp}
        onChange={onSellInAppChange}
      />

      {product.sellInApp && (
        <>
          <SegmentedField<StoreManagedProductKind>
            label="What the customer gets"
            value={product.storeManagedKind === 'none' ? 'non_consumable' : product.storeManagedKind}
            onChange={(value) => update('storeManagedKind', value)}
            options={storeKindOptions}
            description="An unlock stays unlocked forever, a used-up item is spent on purchase, and a renewing item bills again each period."
          />
          <SelectField
            label="What kind of content is this?"
            value={product.storePolicyFulfillment}
            onChange={(value) => update('storePolicyFulfillment', value as StorePolicyFulfillmentType)}
            options={STORE_CATEGORY_OPTIONS}
            description="Apple and Google use this to review your in-app product."
          />
          <div className="cedros-admin__form-row">
            <TextField
              label="App Store product ID"
              value={product.appleProductId}
              onChange={(value) => update('appleProductId', value)}
              placeholder="com.yourapp.pro.monthly"
              description="Create the matching product in App Store Connect, then paste its ID."
            />
            <TextField
              label="Google Play product ID"
              value={product.googleProductId}
              onChange={(value) => update('googleProductId', value)}
              placeholder="pro_monthly"
              description="Create the matching product or subscription in Google Play Console."
            />
          </div>
          <AdvancedDetails>
            <div className="cedros-admin__form-row">
              <TextField
                label="Google package name"
                value={product.googlePackageName}
                onChange={(value) => update('googlePackageName', value)}
                placeholder="com.yourapp"
                description="Your app’s package name in Google Play Console."
              />
              <TextField
                label="Google base plan ID"
                value={product.googleBasePlanId}
                onChange={(value) => update('googleBasePlanId', value)}
                placeholder="basemonthly"
                description="Required for subscriptions. Found under your subscription’s base plans."
              />
              <TextField
                label="Google offer ID"
                value={product.googleOfferId}
                onChange={(value) => update('googleOfferId', value)}
                placeholder="Optional"
                description="Links a specific intro or promotional offer, if you have one."
              />
            </div>
          </AdvancedDetails>
        </>
      )}
    </FieldGroup>
  );
}
