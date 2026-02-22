import { CedrosConfig } from '../types';
/**
 * Validate Cedros configuration before initializing providers/managers.
 *
 * Throws a detailed error listing every issue so developers can
 * correct misconfiguration quickly during integration.
 *
 * Returns a normalized config with serverUrl defaulted to window.location.origin
 */
export declare function validateConfig(config: CedrosConfig): CedrosConfig & {
    serverUrl: string;
};
//# sourceMappingURL=validateConfig.d.ts.map