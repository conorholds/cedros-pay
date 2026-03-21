export class RouteDiscoveryManagerCore {
    constructor(serverUrl, deps) {
        this.routePrefix = null;
        this.discoveryPromise = null;
        this.failedDiscoveryAt = null;
        this.maxRetries = 2;
        this.baseDelayMs = 1000;
        this.discoveryTimeoutMs = 2000;
        this.failedDiscoveryTtlMs = 30000;
        this.serverUrl = serverUrl.replace(/\/+$/, '');
        this.getLogger = deps.getLogger;
        this.fetchWithTimeout = deps.fetchWithTimeout;
    }
    async discoverPrefix() {
        if (this.routePrefix !== null) {
            return this.routePrefix;
        }
        if (this.discoveryPromise) {
            return this.discoveryPromise;
        }
        if (this.failedDiscoveryAt !== null &&
            Date.now() - this.failedDiscoveryAt < this.failedDiscoveryTtlMs) {
            return '';
        }
        const discoveryTask = (async () => {
            let attempt = 0;
            while (attempt < this.maxRetries) {
                try {
                    const response = await this.fetchWithTimeout(`${this.serverUrl}/cedros-health`, {}, this.discoveryTimeoutMs);
                    if (!response.ok) {
                        if (response.status >= 400 && response.status < 500) {
                            this.getLogger().warn(`Route discovery received ${response.status} - not retrying client error`);
                            this.failedDiscoveryAt = Date.now();
                            return '';
                        }
                        throw new Error(`Health check returned ${response.status}`);
                    }
                    const health = await response.json();
                    const prefix = String(health.routePrefix ?? '');
                    this.routePrefix = prefix;
                    this.failedDiscoveryAt = null;
                    this.getLogger().debug('Route discovery successful, prefix:', prefix || '(empty)');
                    return prefix;
                }
                catch (error) {
                    attempt++;
                    if (attempt >= this.maxRetries) {
                        this.getLogger().warn(`Route discovery failed after ${attempt} attempts, using empty prefix for this request:`, error);
                        this.failedDiscoveryAt = Date.now();
                        return '';
                    }
                    const delayMs = this.baseDelayMs * Math.pow(2, attempt - 1);
                    this.getLogger().warn(`Route discovery failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delayMs}ms:`, error);
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
            return '';
        })();
        this.discoveryPromise = discoveryTask;
        try {
            return await this.discoveryPromise;
        }
        finally {
            if (this.discoveryPromise === discoveryTask) {
                this.discoveryPromise = null;
            }
        }
    }
    async buildUrl(path) {
        const prefix = await this.discoverPrefix();
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${this.serverUrl}${prefix}${cleanPath}`;
    }
    reset() {
        this.routePrefix = null;
        this.discoveryPromise = null;
        this.failedDiscoveryAt = null;
    }
}
//# sourceMappingURL=route-discovery-core.js.map