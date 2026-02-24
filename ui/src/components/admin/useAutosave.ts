/**
 * useAutosave Hook
 *
 * Provides debounced autosave functionality for settings components.
 * Shows saving/saved status and handles errors.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface UseAutosaveOptions<T> {
  /** Data to autosave */
  data: T;
  /** Save function - should throw on error */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in ms (default: 1500) */
  debounceMs?: number;
  /** How long to show "Saved" status (default: 2000) */
  savedDurationMs?: number;
  /** Whether autosave is enabled (default: true) */
  enabled?: boolean;
  /** Dependencies that should NOT trigger autosave (e.g., initial load) */
  skipInitial?: boolean;
}

export interface UseAutosaveResult {
  /** Current autosave status */
  status: AutosaveStatus;
  /** Error message if status is 'error' */
  error: string | null;
  /** Manually trigger save immediately */
  saveNow: () => Promise<void>;
  /** Reset status to idle */
  reset: () => void;
}

/**
 * Hook for debounced autosave with status tracking.
 *
 * @example
 * ```tsx
 * const { status, error } = useAutosave({
 *   data: settings,
 *   onSave: async (data) => {
 *     await api.saveSettings(data);
 *   },
 * });
 *
 * // Show status indicator
 * {status === 'saving' && <span>Saving...</span>}
 * {status === 'saved' && <span>Saved</span>}
 * {status === 'error' && <span>Error: {error}</span>}
 * ```
 */
export function useAutosave<T>({
  data,
  onSave,
  debounceMs = 1500,
  savedDurationMs = 2000,
  enabled = true,
  skipInitial = true,
}: UseAutosaveOptions<T>): UseAutosaveResult {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Track if we've done initial render
  const isInitialRender = useRef(true);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestData = useRef<T>(data);

  // Always keep latest data ref updated
  latestData.current = data;

  // Save function
  const performSave = useCallback(async () => {
    setStatus('saving');
    setError(null);

    try {
      await onSave(latestData.current);
      setStatus('saved');

      // Reset to idle after showing "Saved"
      savedTimeout.current = setTimeout(() => {
        setStatus('idle');
      }, savedDurationMs);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }, [onSave, savedDurationMs]);

  // Manual save
  const saveNow = useCallback(async () => {
    // Clear any pending debounce
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }
    await performSave();
  }, [performSave]);

  // Reset status
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  // Debounced autosave on data change
  useEffect(() => {
    if (!enabled) return;

    // Skip initial render if requested
    if (skipInitial && isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    // Clear existing timeouts
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    if (savedTimeout.current) {
      clearTimeout(savedTimeout.current);
    }

    // Set pending status immediately
    setStatus('pending');

    // Debounce the actual save
    debounceTimeout.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [data, enabled, skipInitial, debounceMs, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      if (savedTimeout.current) clearTimeout(savedTimeout.current);
    };
  }, []);

  return { status, error, saveNow, reset };
}

/**
 * Status indicator component helper.
 * Returns appropriate text/icon for the current status.
 */
export function getAutosaveStatusText(status: AutosaveStatus): string {
  switch (status) {
    case 'pending':
      return 'Unsaved changes...';
    case 'saving':
      return 'Saving...';
    case 'saved':
      return 'Saved';
    case 'error':
      return 'Save failed';
    default:
      return '';
  }
}
