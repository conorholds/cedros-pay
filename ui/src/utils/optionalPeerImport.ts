const runtimeImport = new Function(
  'specifier',
  'return import(specifier)'
) as (specifier: string) => Promise<unknown>;

const testOverrides = new Map<string, unknown>();

function joinSpecifier(parts: readonly string[]): string {
  return parts.join('');
}

export function importOptionalPeer<T>(parts: readonly string[]): Promise<T> {
  const specifier = joinSpecifier(parts);

  if (testOverrides.has(specifier)) {
    return Promise.resolve(testOverrides.get(specifier) as T);
  }

  if (import.meta.env?.MODE === 'test') {
    return import(/* @vite-ignore */ specifier) as Promise<T>;
  }

  return runtimeImport(specifier) as Promise<T>;
}

export function setOptionalPeerImportOverride(specifier: string, value: unknown): void {
  testOverrides.set(specifier, value);
}

export function resetOptionalPeerImportOverrides(): void {
  testOverrides.clear();
}

export const OPTIONAL_SOLANA_WEB3_SPECIFIER = ['@solana', '/web3.js'] as const;
export const OPTIONAL_METEORA_DLMM_SPECIFIER = ['@meteora-ag', '/dlmm'] as const;
