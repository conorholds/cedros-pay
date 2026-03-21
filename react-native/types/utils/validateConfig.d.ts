import type { CedrosConfig } from '../types';
/**
 * Validate Cedros configuration before initializing providers/managers.
 *
 * Throws a detailed error listing every issue so developers can
 * correct misconfiguration quickly during integration.
 *
 * Note: serverUrl is always required in React Native (no browser location available)
 */
export declare function validateConfig(config: CedrosConfig): Required<CedrosConfig> & {
    serverUrl: string;
};
//# sourceMappingURL=validateConfig.d.ts.map