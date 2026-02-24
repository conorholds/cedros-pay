import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('RouteDiscovery parity', () => {
  it('keeps key route discovery safeguards aligned through shared core', () => {
    const webPath = path.resolve(process.cwd(), 'src/managers/RouteDiscoveryManager.ts');
    const rnPath = path.resolve(process.cwd(), 'react-native/src/managers/RouteDiscoveryManager.ts');
    const corePath = path.resolve(process.cwd(), 'shared/route-discovery-core.ts');

    const webSource = fs.readFileSync(webPath, 'utf8');
    const rnSource = fs.readFileSync(rnPath, 'utf8');
    const coreSource = fs.readFileSync(corePath, 'utf8');

    const requiredCoreSnippets = [
      'private readonly maxRetries: number = 2;',
      'private readonly discoveryTimeoutMs: number = 2000;',
      'private readonly failedDiscoveryTtlMs: number = 30_000;',
      'serverUrl.replace(/\\/+$/, \'\')',
      'Date.now() - this.failedDiscoveryAt < this.failedDiscoveryTtlMs',
      'this.fetchWithTimeout(',
      'this.discoveryTimeoutMs'
    ];

    for (const snippet of requiredCoreSnippets) {
      expect(coreSource).toContain(snippet);
    }

    const wrapperSnippets = ['RouteDiscoveryManagerCore', 'super(serverUrl, { getLogger, fetchWithTimeout });'];
    for (const snippet of wrapperSnippets) {
      expect(webSource).toContain(snippet);
      expect(rnSource).toContain(snippet);
    }
  });
});
