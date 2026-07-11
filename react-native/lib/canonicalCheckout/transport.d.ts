export interface CheckoutRequestOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
}
export interface CedrosPayCheckoutOptions {
    serverUrl?: string;
    fetch?: typeof globalThis.fetch;
    headers?: HeadersInit;
    timeoutMs?: number;
}
export declare class CheckoutRequestError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(status: number, code: string, message: string);
}
export declare class CheckoutTransport {
    private readonly baseUrl;
    private readonly fetcher;
    private readonly headers;
    private readonly timeoutMs;
    constructor(options: CedrosPayCheckoutOptions);
    write(path: string, body: unknown, key?: string, options?: CheckoutRequestOptions): Promise<unknown>;
    read(path: string, options?: CheckoutRequestOptions): Promise<unknown>;
    private request;
}
//# sourceMappingURL=transport.d.ts.map