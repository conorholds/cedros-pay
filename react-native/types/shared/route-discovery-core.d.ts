export interface IRouteDiscoveryManager {
    discoverPrefix(): Promise<string>;
    buildUrl(path: string): Promise<string>;
    reset(): void;
}
export interface RouteDiscoveryLogger {
    warn(...args: unknown[]): void;
    debug(...args: unknown[]): void;
}
export interface RouteDiscoveryDependencies {
    getLogger(): RouteDiscoveryLogger;
    fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<{
        ok: boolean;
        status: number;
        json(): Promise<Record<string, unknown>>;
    }>;
}
export declare class RouteDiscoveryManagerCore implements IRouteDiscoveryManager {
    private readonly serverUrl;
    private readonly getLogger;
    private readonly fetchWithTimeout;
    private routePrefix;
    private discoveryPromise;
    private failedDiscoveryAt;
    private readonly maxRetries;
    private readonly baseDelayMs;
    private readonly discoveryTimeoutMs;
    private readonly failedDiscoveryTtlMs;
    constructor(serverUrl: string, deps: RouteDiscoveryDependencies);
    discoverPrefix(): Promise<string>;
    buildUrl(path: string): Promise<string>;
    reset(): void;
}
//# sourceMappingURL=route-discovery-core.d.ts.map