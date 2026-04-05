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
  fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<{ ok: boolean; status: number; json(): Promise<Record<string, unknown>> }>;
}

export class RouteDiscoveryManagerCore implements IRouteDiscoveryManager {
  private readonly serverUrl: string;
  private readonly getLogger: RouteDiscoveryDependencies['getLogger'];
  private readonly fetchWithTimeout: RouteDiscoveryDependencies['fetchWithTimeout'];
  private routePrefix: string | null = null;
  private discoveryPromise: Promise<string> | null = null;
  private failedDiscoveryAt: number | null = null;
  private readonly maxRetries: number = 2;
  private readonly baseDelayMs: number = 1000;
  private readonly discoveryTimeoutMs: number = 2000;
  private readonly failedDiscoveryTtlMs: number = 30_000;

  constructor(serverUrl: string, deps: RouteDiscoveryDependencies) {
    this.serverUrl = serverUrl.replace(/\/+$/, '');
    this.getLogger = deps.getLogger;
    this.fetchWithTimeout = deps.fetchWithTimeout;
  }

  async discoverPrefix(): Promise<string> {
    if (this.routePrefix !== null) {
      return this.routePrefix;
    }

    if (this.discoveryPromise) {
      return this.discoveryPromise;
    }

    if (
      this.failedDiscoveryAt !== null &&
      Date.now() - this.failedDiscoveryAt < this.failedDiscoveryTtlMs
    ) {
      return '';
    }

    const discoveryTask = (async (): Promise<string> => {
      let attempt = 0;

      while (attempt < this.maxRetries) {
        try {
          const response = await this.fetchWithTimeout(
            `${this.serverUrl}/cedros-health`,
            {},
            this.discoveryTimeoutMs
          );

          if (!response.ok) {
            if (response.status >= 400 && response.status < 500) {
              this.getLogger().warn(
                `Route discovery received ${response.status} - not retrying client error`
              );
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
        } catch (error) {
          attempt++;

          if (attempt >= this.maxRetries) {
            this.getLogger().warn(
              `Route discovery failed after ${attempt} attempts, using empty prefix for this request:`,
              error
            );
            this.failedDiscoveryAt = Date.now();
            return '';
          }

          const delayMs = this.baseDelayMs * Math.pow(2, attempt - 1);
          this.getLogger().warn(
            `Route discovery failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delayMs}ms:`,
            error
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      return '';
    })();

    this.discoveryPromise = discoveryTask;
    try {
      return await this.discoveryPromise;
    } finally {
      if (this.discoveryPromise === discoveryTask) {
        this.discoveryPromise = null;
      }
    }
  }

  async buildUrl(path: string): Promise<string> {
    const prefix = await this.discoverPrefix();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.serverUrl}${prefix}${cleanPath}`;
  }

  reset(): void {
    this.routePrefix = null;
    this.discoveryPromise = null;
    this.failedDiscoveryAt = null;
  }
}
