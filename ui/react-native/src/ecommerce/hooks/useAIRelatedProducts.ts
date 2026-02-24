/**
 * Hook to fetch AI-powered related product recommendations.
 *
 * Uses the adapter from CedrosShopProvider context to call the AI endpoint.
 * Results are cached by productId to avoid repeated API calls.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AIRelatedProductsParams, AIRelatedProductsResult } from '../adapters/CommerceAdapter';
import { useOptionalCedrosShop } from '../config/context';

export interface UseAIRelatedProductsOptions {
  /** Product ID to get recommendations for */
  productId?: string;
  /** Product details (alternative to productId) */
  product?: {
    name: string;
    description?: string;
    tags?: string[];
    categoryIds?: string[];
  };
  /** Whether to enable the fetch (default: true) */
  enabled?: boolean;
}

export interface UseAIRelatedProductsResult {
  /** IDs of recommended related products */
  relatedProductIds: string[] | null;
  /** AI's reasoning for the recommendations */
  reasoning: string | null;
  /** Whether the request is in progress */
  isLoading: boolean;
  /** Error message if request failed */
  error: string | null;
  /** Manually refetch recommendations */
  refetch: () => Promise<void>;
}

// Simple in-memory cache for AI recommendations
const cache = new Map<string, AIRelatedProductsResult>();

function getCacheKey(params: AIRelatedProductsParams): string {
  if (params.productId) return `id:${params.productId}`;
  if (params.name) return `name:${params.name}`;
  return '';
}

export function useAIRelatedProducts(
  options: UseAIRelatedProductsOptions = {}
): UseAIRelatedProductsResult {
  const { productId, product, enabled = true } = options;

  const contextValue = useOptionalCedrosShop();
  const adapter = contextValue?.config?.adapter;

  const [relatedProductIds, setRelatedProductIds] = useState<string[] | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track current request to handle race conditions
  const requestIdRef = useRef(0);

  const fetchRecommendations = useCallback(async () => {
    // Build params from options
    const params: AIRelatedProductsParams = productId
      ? { productId }
      : product
        ? {
            name: product.name,
            description: product.description,
            tags: product.tags,
            categoryIds: product.categoryIds,
          }
        : {};

    // Need either productId or name
    if (!params.productId && !params.name) {
      return;
    }

    // Check if adapter supports AI related products
    if (!adapter?.getAIRelatedProducts) {
      setError('AI recommendations not available');
      return;
    }

    // Check cache first
    const cacheKey = getCacheKey(params);
    const cached = cache.get(cacheKey);
    if (cached) {
      setRelatedProductIds(cached.relatedProductIds);
      setReasoning(cached.reasoning);
      setError(null);
      return;
    }

    // Track this request
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await adapter.getAIRelatedProducts(params);

      // Only update state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setRelatedProductIds(result.relatedProductIds);
        setReasoning(result.reasoning);
        setError(null);

        // Cache the result
        if (cacheKey) {
          cache.set(cacheKey, result);
        }
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to get AI recommendations';
        setError(message);
        setRelatedProductIds(null);
        setReasoning(null);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [adapter, productId, product]);

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Need productId or product.name to fetch
    if (!productId && !product?.name) {
      return;
    }

    fetchRecommendations();
  }, [enabled, productId, product?.name, fetchRecommendations]);

  return {
    relatedProductIds,
    reasoning,
    isLoading,
    error,
    refetch: fetchRecommendations,
  };
}
