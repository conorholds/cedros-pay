import { CSSProperties, ReactNode } from 'react';
import { CedrosThemeMode, CedrosThemeTokens } from '../types';
interface CedrosThemeProviderProps {
    initialMode?: CedrosThemeMode;
    overrides?: Partial<CedrosThemeTokens>;
    unstyled?: boolean;
    children: ReactNode;
}
export interface CedrosThemeContextValue {
    mode: CedrosThemeMode;
    setMode: (mode: CedrosThemeMode) => void;
    tokens: CedrosThemeTokens;
    className: string;
    style: CSSProperties;
    unstyled: boolean;
}
export declare function CedrosThemeProvider({ initialMode, overrides, unstyled, children, }: CedrosThemeProviderProps): import("react/jsx-runtime").JSX.Element;
/**
 * Access current Cedros theme settings and utilities.
 *
 * Provides:
 * - `mode`: the active theme mode
 * - `setMode`: update the theme at runtime
 * - `tokens`: resolved color tokens
 * - `className`: CSS class to apply for theming
 * - `style`: CSS variables for inline application
 */
export declare function useCedrosTheme(): CedrosThemeContextValue;
/**
 * Access Cedros theme if available, returns null if outside CedrosProvider.
 *
 * Use this for components that can work both inside and outside a provider.
 */
export declare function useCedrosThemeOptional(): CedrosThemeContextValue | null;
export {};
//# sourceMappingURL=ThemeContext.d.ts.map