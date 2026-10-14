/**
 * Shared shell for the create and edit product pages: a back link, page header,
 * the grouped form sections, a media picker, and create/save or edit/autosave
 * controls. Holds the working form state and keeps linked fields (name → id,
 * delivery → store policy) in sync; the caller supplies the initial form and
 * the submit action.
 */

import { useRef, useState, type FormEvent } from 'react';

import { AutosaveStatusIndicator, type CedrosAutosaveState } from '../../autosave';
import type { IAdminAuthManager } from './AdminAuthManager';
import { ErrorBanner } from './ErrorBanner';
import { ProductFormSections } from './ProductFormSections';
import { ProductMediaPicker } from './ProductMediaPicker';
import {
  applyFulfillment,
  applyProductType,
  applySellInApp,
  applyTitle,
  validateProduct,
} from './productPayload';
import type { CommerceFeatureFlags } from './commerceFeatureSettings';
import type { FulfillmentType, NewProductForm, NewProductUpdater } from './ProductAddFormTypes';
import type { AdminProductType } from './productDisplay';
import { useAutosave } from './useAutosave';

interface ProductFormPageProps {
  title: string;
  subtitle: string;
  submitLabel: string;
  submittingLabel: string;
  initialForm: NewProductForm;
  /** Whether the product ID can be edited (true for create, false for edit). */
  idEditable: boolean;
  features?: CommerceFeatureFlags;
  authManager?: IAdminAuthManager;
  serverUrl: string;
  onBack: () => void;
  /** Persist the form. Throws on failure; the page surfaces the message. */
  onSubmit: (form: NewProductForm) => Promise<void>;
  autosave?: {
    enabled: boolean;
    resourceType: string;
    resourceId: string;
  };
}

function statusClass(status: CedrosAutosaveState): string {
  if (status === 'failed') return 'error';
  return status;
}

export function ProductFormPage({
  title,
  subtitle,
  submitLabel,
  submittingLabel,
  initialForm,
  idEditable,
  features,
  authManager,
  serverUrl,
  onBack,
  onSubmit,
  autosave,
}: ProductFormPageProps) {
  const [product, setProduct] = useState<NewProductForm>(() => initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMediaPickerOpen, setMediaPickerOpen] = useState(false);
  // When the id can't be edited (edit mode) it must never track the name.
  const idLocked = useRef(!idEditable);

  const update: NewProductUpdater = (key, value) =>
    setProduct((current) => ({ ...current, [key]: value }));

  const handleTitleChange = (value: string) =>
    setProduct((current) => applyTitle(current, value, idLocked.current));

  const handleIdChange = (value: string) => {
    idLocked.current = true;
    setProduct((current) => ({ ...current, id: value }));
  };

  const persistProduct = async () => {
    const validationError = validateProduct(product);
    if (validationError) {
      setError(validationError);
      throw new Error(validationError);
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(product);
      return { canonicalDraftKey: JSON.stringify(product) };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const autosaveStatus = useAutosave(JSON.stringify(product), persistProduct, {
    ready: autosave?.enabled === true,
    delayMs: 600,
    resourceType: autosave?.resourceType ?? 'product',
    resourceId: autosave?.resourceId ?? product.id,
    extensionId: 'cedros-pay',
  });

  const autosaveEnabled = autosave?.enabled === true;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (autosaveEnabled) return;
    await persistProduct().catch(() => undefined);
  };

  return (
    <div
      className={`cedros-data-stack cedros-admin__page cedros-admin__product-editor ${autosaveEnabled ? 'cedros-admin__product-editor--autosave' : ''}`}
    >
      <button
        type="button"
        className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm cedros-back-breadcrumb cedros-admin__page-back"
        onClick={onBack}
      >
        <span aria-hidden="true">←</span>
        Back to Products
      </button>

      <div className="cedros-data__header cedros-admin__page-header">
        <div className="cedros-data__header-text">
          <h2 className="cedros-data__title cedros-admin__page-title">{title}</h2>
          <p className="cedros-data__subtitle cedros-admin__page-description">{subtitle}</p>
        </div>
        {autosaveEnabled && (
          <div className="cedros-data-actions cedros-admin__product-editor-status">
            <AutosaveStatusIndicator
              status={autosaveStatus}
              className={`cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${statusClass(autosaveStatus)}`}
            />
          </div>
        )}
      </div>

      <ErrorBanner message={error} />

      <form className="cedros-admin__product-form" onSubmit={handleSubmit}>
        <ProductFormSections
          product={product}
          update={update}
          idEditable={idEditable}
          features={features}
          onTitleChange={handleTitleChange}
          onIdChange={handleIdChange}
          onFulfillmentChange={(type: FulfillmentType) =>
            setProduct((current) => applyFulfillment(current, type))
          }
          onProductTypeChange={(type: AdminProductType) =>
            setProduct((current) => applyProductType(current, type))
          }
          onSellInAppChange={(on: boolean) =>
            setProduct((current) => applySellInApp(current, on))
          }
          onBrowseMedia={() => setMediaPickerOpen(true)}
          canBrowseMedia={Boolean(authManager?.isAuthenticated())}
        />

        {!autosaveEnabled && (
          <div className="cedros-data-actions cedros-admin__product-form-footer">
            <button
              type="button"
              className="cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--secondary"
              onClick={onBack}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? submittingLabel : submitLabel}
            </button>
          </div>
        )}
      </form>

      <ProductMediaPicker
        open={isMediaPickerOpen}
        serverUrl={serverUrl}
        authManager={authManager}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => update('imageUrl', url)}
      />
    </div>
  );
}
