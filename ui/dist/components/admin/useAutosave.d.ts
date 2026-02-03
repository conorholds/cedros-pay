/**
 * useAutosave Hook
 *
 * Provides debounced autosave functionality for settings components.
 * Shows saving/saved status and handles errors.
 */
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
export declare function useAutosave<T>({ data, onSave, debounceMs, savedDurationMs, enabled, skipInitial, }: UseAutosaveOptions<T>): UseAutosaveResult;
/**
 * Status indicator component helper.
 * Returns appropriate text/icon for the current status.
 */
export declare function getAutosaveStatusText(status: AutosaveStatus): string;
//# sourceMappingURL=useAutosave.d.ts.map