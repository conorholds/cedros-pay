/**
 * Hook to fetch storefront settings for product pages.
 *
 * Automatically uses the adapter from CedrosShopProvider context if available.
 * Falls back to defaults if config API is not available.
 */

import { useState, useEffect } from 'react';
import type {
  ProductPageSettings,
  RelatedProductsMode,
  CatalogFilterSettings,
  CatalogSortSettings,
  CheckoutDisplaySettings,
  LayoutSettings,
  ProductCardLayout,
  ImageCropPosition,
  ProductPageSectionSettings,
  InventorySettings,
} from '../../components/admin/types';
import type { StorefrontConfig } from '../adapters/CommerceAdapter';
import { useOptionalCedrosShop } from '../config/context';

export interface ShopPageSettings {
  title: string;
  description: string;
}

export interface StorefrontSettings {
  relatedProducts: {
    mode: RelatedProductsMode;
    maxItems: number;
    layout: LayoutSettings;
  };
  catalog: {
    filters: CatalogFilterSettings;
    sort: CatalogSortSettings;
  };
  checkout: CheckoutDisplaySettings;
  shopLayout: LayoutSettings;
  categoryLayout: LayoutSettings;
  sections: ProductPageSectionSettings;
  inventory: InventorySettings;
  shopPage: ShopPageSettings;
}

const DEFAULT_SETTINGS: StorefrontSettings = {
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

export interface UseStorefrontSettingsOptions {
  /** @deprecated Server URL - now automatically uses adapter from context */
  serverUrl?: string;
}

function applyConfig(cfg: StorefrontConfig): StorefrontSettings {
  return {
    relatedProducts: {
      mode: cfg.relatedProducts?.mode || DEFAULT_SETTINGS.relatedProducts.mode,
      maxItems: cfg.relatedProducts?.maxItems || DEFAULT_SETTINGS.relatedProducts.maxItems,
      layout: {
        layout: cfg.relatedProducts?.layout?.layout ?? DEFAULT_SETTINGS.relatedProducts.layout.layout,
        imageCrop: cfg.relatedProducts?.layout?.imageCrop ?? DEFAULT_SETTINGS.relatedProducts.layout.imageCrop,
      },
    },
    catalog: {
      filters: {
        tags: cfg.catalog?.filters?.tags ?? DEFAULT_SETTINGS.catalog.filters.tags,
        priceRange: cfg.catalog?.filters?.priceRange ?? DEFAULT_SETTINGS.catalog.filters.priceRange,
        inStock: cfg.catalog?.filters?.inStock ?? DEFAULT_SETTINGS.catalog.filters.inStock,
      },
      sort: {
        featured: cfg.catalog?.sort?.featured ?? DEFAULT_SETTINGS.catalog.sort.featured,
        priceAsc: cfg.catalog?.sort?.priceAsc ?? DEFAULT_SETTINGS.catalog.sort.priceAsc,
        priceDesc: cfg.catalog?.sort?.priceDesc ?? DEFAULT_SETTINGS.catalog.sort.priceDesc,
      },
    },
    checkout: {
      promoCodes: cfg.checkout?.promoCodes ?? DEFAULT_SETTINGS.checkout.promoCodes,
    },
    shopLayout: {
      layout: cfg.shopLayout?.layout ?? DEFAULT_SETTINGS.shopLayout.layout,
      imageCrop: cfg.shopLayout?.imageCrop ?? DEFAULT_SETTINGS.shopLayout.imageCrop,
    },
    categoryLayout: {
      layout: cfg.categoryLayout?.layout ?? DEFAULT_SETTINGS.categoryLayout.layout,
      imageCrop: cfg.categoryLayout?.imageCrop ?? DEFAULT_SETTINGS.categoryLayout.imageCrop,
    },
    sections: {
      showDescription: cfg.sections?.showDescription ?? DEFAULT_SETTINGS.sections.showDescription,
      showSpecs: cfg.sections?.showSpecs ?? DEFAULT_SETTINGS.sections.showSpecs,
      showShipping: cfg.sections?.showShipping ?? DEFAULT_SETTINGS.sections.showShipping,
      showRelatedProducts: cfg.sections?.showRelatedProducts ?? DEFAULT_SETTINGS.sections.showRelatedProducts,
    },
    inventory: {
      preCheckoutVerification: cfg.inventory?.preCheckoutVerification ?? DEFAULT_SETTINGS.inventory.preCheckoutVerification,
      holdsEnabled: cfg.inventory?.holdsEnabled ?? DEFAULT_SETTINGS.inventory.holdsEnabled,
      holdDurationMinutes: cfg.inventory?.holdDurationMinutes ?? DEFAULT_SETTINGS.inventory.holdDurationMinutes,
    },
    shopPage: {
      title: cfg.shopPage?.title ?? DEFAULT_SETTINGS.shopPage.title,
      description: cfg.shopPage?.description ?? DEFAULT_SETTINGS.shopPage.description,
    },
  };
}

export function useStorefrontSettings(_options: UseStorefrontSettingsOptions = {}): {
  settings: StorefrontSettings;
  isLoading: boolean;
} {
  // Try to get adapter from context (may not be available if used outside CedrosShopProvider)
  const contextValue = useOptionalCedrosShop();
  const adapter = contextValue?.config?.adapter;

  const [settings, setSettings] = useState<StorefrontSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(!!adapter?.getStorefrontSettings);

  useEffect(() => {
    // If no adapter or adapter doesn't support getStorefrontSettings, use defaults
    if (!adapter?.getStorefrontSettings) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchSettings() {
      try {
        const cfg = await adapter!.getStorefrontSettings!();
        if (!cancelled && cfg) {
          setSettings(applyConfig(cfg));
        }
      } catch {
        // Config API not available or not configured - use defaults
        // This is expected in development/demo mode
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchSettings();

    return () => {
      cancelled = true;
    };
  }, [adapter]);

  return { settings, isLoading };
}

export type { ProductPageSettings, RelatedProductsMode, CatalogFilterSettings, CatalogSortSettings, CheckoutDisplaySettings, LayoutSettings, ProductCardLayout, ImageCropPosition, ProductPageSectionSettings, InventorySettings };
