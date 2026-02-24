import { describe, it, expect } from 'vitest';
import {
  generateCSPDirectives,
  formatCSP,
  generateCSP,
  RPC_PROVIDERS,
  CSP_PRESETS,
  type CSPDirectives,
} from '../utils/cspHelper';

describe('cspHelper', () => {
  describe('generateCSPDirectives', () => {
    describe('default behavior', () => {
      it('should generate CSP directives with default config', () => {
        const directives = generateCSPDirectives();

        expect(directives.scriptSrc).toContain("'self'");
        expect(directives.scriptSrc).toContain('https://js.stripe.com');
        expect(directives.scriptSrc).not.toContain("'unsafe-inline'");

        expect(directives.connectSrc).toContain("'self'");
        expect(directives.connectSrc).toContain('https://api.stripe.com');
        expect(directives.connectSrc).toContain('https://*.stripe.com');
        // Default cluster is mainnet-beta, so only mainnet RPC is included
        expect(directives.connectSrc).toContain('https://api.mainnet-beta.solana.com');

        expect(directives.frameSrc).toContain('https://js.stripe.com');
        expect(directives.frameSrc).toContain('https://checkout.stripe.com');
      });

      it('should use mainnet-beta by default', () => {
        const directives = generateCSPDirectives();
        expect(directives.connectSrc).toContain('https://api.mainnet-beta.solana.com');
      });
    });

    describe('solana cluster selection', () => {
      it('should include devnet endpoint when cluster is devnet', () => {
        const directives = generateCSPDirectives({ solanaCluster: 'devnet' });
        expect(directives.connectSrc).toContain('https://api.devnet.solana.com');
        expect(directives.connectSrc).not.toContain('https://api.mainnet-beta.solana.com');
      });

      it('should include testnet endpoint when cluster is testnet', () => {
        const directives = generateCSPDirectives({ solanaCluster: 'testnet' });
        expect(directives.connectSrc).toContain('https://api.testnet.solana.com');
      });
    });

    describe('custom Solana RPC endpoint', () => {
      it('should include custom Solana endpoint domain', () => {
        const directives = generateCSPDirectives({
          solanaEndpoint: 'https://mainnet.helius-rpc.com/v0/abc123',
        });
        expect(directives.connectSrc).toContain('https://mainnet.helius-rpc.com');
      });

      it('should not duplicate custom endpoint if already in list', () => {
        const directives = generateCSPDirectives({
          solanaEndpoint: 'https://mainnet.helius-rpc.com',
          customRpcProviders: ['https://mainnet.helius-rpc.com'],
        });
        const heliusCount = directives.connectSrc.filter(
          (src) => src === 'https://mainnet.helius-rpc.com'
        ).length;
        expect(heliusCount).toBe(1);
      });

      it('should handle wildcard patterns in custom endpoint', () => {
        const directives = generateCSPDirectives({
          solanaEndpoint: 'https://*.quicknode.pro',
        });
        expect(directives.connectSrc).toContain('https://*.quicknode.pro');
      });
    });

    describe('custom RPC providers', () => {
      it('should include custom RPC providers', () => {
        const directives = generateCSPDirectives({
          customRpcProviders: [RPC_PROVIDERS.HELIUS, RPC_PROVIDERS.QUICKNODE],
        });
        expect(directives.connectSrc).toContain(RPC_PROVIDERS.HELIUS);
        expect(directives.connectSrc).toContain(RPC_PROVIDERS.QUICKNODE);
      });

      it('should not duplicate providers', () => {
        const directives = generateCSPDirectives({
          customRpcProviders: [RPC_PROVIDERS.HELIUS, RPC_PROVIDERS.HELIUS],
        });
        const heliusCount = directives.connectSrc.filter(
          (src) => src === RPC_PROVIDERS.HELIUS
        ).length;
        expect(heliusCount).toBe(1);
      });
    });

    describe('unsafe scripts', () => {
      it('should not include unsafe-inline/eval by default', () => {
        const directives = generateCSPDirectives();
        expect(directives.scriptSrc).not.toContain("'unsafe-inline'");
        expect(directives.scriptSrc).not.toContain("'unsafe-eval'");
      });

      it('should include unsafe-inline and unsafe-eval when enabled', () => {
        const directives = generateCSPDirectives({ allowUnsafeScripts: true });
        expect(directives.scriptSrc).toContain("'unsafe-inline'");
        expect(directives.scriptSrc).toContain("'unsafe-eval'");
      });
    });

    describe('additional sources', () => {
      it('should include additional script-src domains', () => {
        const directives = generateCSPDirectives({
          additionalScriptSrc: ['https://cdn.example.com'],
        });
        expect(directives.scriptSrc).toContain('https://cdn.example.com');
      });

      it('should include additional connect-src domains', () => {
        const directives = generateCSPDirectives({
          additionalConnectSrc: ['https://api.example.com'],
        });
        expect(directives.connectSrc).toContain('https://api.example.com');
      });

      it('should include additional frame-src domains', () => {
        const directives = generateCSPDirectives({
          additionalFrameSrc: ['https://embed.example.com'],
        });
        expect(directives.frameSrc).toContain('https://embed.example.com');
      });
    });

    describe('Stripe exclusion', () => {
      it('should exclude Stripe when includeStripe is false', () => {
        const directives = generateCSPDirectives({ includeStripe: false });
        expect(directives.scriptSrc).not.toContain('https://js.stripe.com');
        expect(directives.connectSrc).not.toContain('https://api.stripe.com');
        expect(directives.connectSrc).not.toContain('https://*.stripe.com');
        expect(directives.frameSrc).not.toContain('https://js.stripe.com');
        expect(directives.frameSrc).not.toContain('https://checkout.stripe.com');
      });

      it('should include Solana endpoints even when Stripe is excluded', () => {
        const directives = generateCSPDirectives({ includeStripe: false });
        // Default cluster is mainnet-beta, so only mainnet RPC is included
        expect(directives.connectSrc).toContain('https://api.mainnet-beta.solana.com');
      });
    });
  });

  describe('formatCSP', () => {
    const sampleDirectives: CSPDirectives = {
      scriptSrc: ["'self'", 'https://js.stripe.com'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'https://api.mainnet-beta.solana.com'],
      frameSrc: ['https://js.stripe.com', 'https://checkout.stripe.com'],
    };

    describe('header format', () => {
      it('should format as HTTP header string', () => {
        const formatted = formatCSP(sampleDirectives, 'header');
        expect(typeof formatted).toBe('string');
        expect(formatted).toContain("script-src 'self' https://js.stripe.com");
        expect(formatted).toContain("connect-src 'self' https://api.stripe.com");
        expect(formatted).toContain('frame-src https://js.stripe.com https://checkout.stripe.com');
        expect(formatted).toMatch(/; /); // Directives separated by semicolons
      });

      it('should be the default format', () => {
        const formatted1 = formatCSP(sampleDirectives);
        const formatted2 = formatCSP(sampleDirectives, 'header');
        expect(formatted1).toBe(formatted2);
      });
    });

    describe('meta format', () => {
      it('should format as meta tag string (same as header)', () => {
        const formatted = formatCSP(sampleDirectives, 'meta');
        expect(typeof formatted).toBe('string');
        expect(formatted).toContain('script-src');
        expect(formatted).toContain('connect-src');
        expect(formatted).toContain('frame-src');
      });
    });

    describe('nextjs format', () => {
      it('should format as Next.js config string', () => {
        const formatted = formatCSP(sampleDirectives, 'nextjs');
        expect(typeof formatted).toBe('string');
        expect(formatted).toContain('script-src');
      });
    });

    describe('nginx format', () => {
      it('should format as Nginx config string', () => {
        const formatted = formatCSP(sampleDirectives, 'nginx');
        expect(typeof formatted).toBe('string');
        expect(formatted).toContain('script-src');
      });
    });

    describe('helmet format', () => {
      it('should format as Express helmet object', () => {
        const formatted = formatCSP(sampleDirectives, 'helmet');
        expect(typeof formatted).toBe('object');
        expect(Array.isArray((formatted as Record<string, string[]>).scriptSrc)).toBe(true);
        expect((formatted as Record<string, string[]>).scriptSrc).toContain("'self'");
        expect((formatted as Record<string, string[]>).connectSrc).toContain('https://api.stripe.com');
        expect((formatted as Record<string, string[]>).frameSrc).toContain('https://js.stripe.com');
      });
    });

    describe('directives format', () => {
      it('should return raw directives object', () => {
        const formatted = formatCSP(sampleDirectives, 'directives');
        expect(formatted).toEqual({
          scriptSrc: sampleDirectives.scriptSrc,
          connectSrc: sampleDirectives.connectSrc,
          frameSrc: sampleDirectives.frameSrc,
        });
      });
    });

    describe('empty directives', () => {
      it('should handle empty directive arrays gracefully', () => {
        const emptyDirectives: CSPDirectives = {
          scriptSrc: [],
          connectSrc: [],
          frameSrc: [],
        };
        const formatted = formatCSP(emptyDirectives, 'header');
        expect(formatted).toBe('');
      });
    });
  });

  describe('generateCSP', () => {
    it('should combine generateCSPDirectives and formatCSP', () => {
      const csp = generateCSP({ solanaCluster: 'mainnet-beta' });
      expect(typeof csp).toBe('string');
      expect(csp).toContain('script-src');
      expect(csp).toContain('connect-src');
      expect(csp).toContain('frame-src');
    });

    it('should support all formats', () => {
      const headerCSP = generateCSP({}, 'header');
      const helmetCSP = generateCSP({}, 'helmet');
      expect(typeof headerCSP).toBe('string');
      expect(typeof helmetCSP).toBe('object');
    });

    it('should generate valid CSP for Next.js with custom RPC', () => {
      const csp = generateCSP({
        solanaCluster: 'mainnet-beta',
        solanaEndpoint: 'https://mainnet.helius-rpc.com',
        allowUnsafeScripts: true,
      });
      expect(csp).toContain("'unsafe-inline'");
      expect(csp).toContain('https://mainnet.helius-rpc.com');
    });
  });

  describe('RPC_PROVIDERS', () => {
    it('should export common RPC provider patterns', () => {
      expect(RPC_PROVIDERS.HELIUS).toBe('https://*.helius-rpc.com');
      expect(RPC_PROVIDERS.QUICKNODE).toBe('https://*.quicknode.pro');
      expect(RPC_PROVIDERS.ALCHEMY).toBe('https://*.alchemy.com');
      expect(RPC_PROVIDERS.ANKR).toBe('https://rpc.ankr.com');
      expect(RPC_PROVIDERS.TRITON).toBe('https://*.rpcpool.com');
    });
  });

  describe('CSP_PRESETS', () => {
    describe('MAINNET_CUSTOM_RPC', () => {
      it('should generate mainnet config with custom RPC', () => {
        const config = CSP_PRESETS.MAINNET_CUSTOM_RPC('https://mainnet.helius-rpc.com');
        expect(config.solanaCluster).toBe('mainnet-beta');
        expect(config.solanaEndpoint).toBe('https://mainnet.helius-rpc.com');
        expect(config.allowUnsafeScripts).toBe(false);
      });
    });

    describe('MAINNET_NEXTJS', () => {
      it('should generate mainnet config with unsafe scripts for Next.js', () => {
        const config = CSP_PRESETS.MAINNET_NEXTJS();
        expect(config.solanaCluster).toBe('mainnet-beta');
        expect(config.allowUnsafeScripts).toBe(false);
      });

      it('should accept optional RPC endpoint', () => {
        const config = CSP_PRESETS.MAINNET_NEXTJS('https://mainnet.helius-rpc.com');
        expect(config.solanaEndpoint).toBe('https://mainnet.helius-rpc.com');
      });
    });

    describe('DEVNET', () => {
      it('should generate devnet config', () => {
        const config = CSP_PRESETS.DEVNET();
        expect(config.solanaCluster).toBe('devnet');
        expect(config.allowUnsafeScripts).toBe(false);
      });
    });

    describe('CRYPTO_ONLY', () => {
      it('should generate crypto-only config without Stripe', () => {
        const config = CSP_PRESETS.CRYPTO_ONLY();
        expect(config.includeStripe).toBe(false);
        expect(config.solanaCluster).toBe('mainnet-beta');
      });

      it('should accept optional RPC endpoint', () => {
        const config = CSP_PRESETS.CRYPTO_ONLY('https://mainnet.helius-rpc.com');
        expect(config.solanaEndpoint).toBe('https://mainnet.helius-rpc.com');
      });
    });

    describe('STRIPE_ONLY', () => {
      it('should generate Stripe-only config', () => {
        const config = CSP_PRESETS.STRIPE_ONLY();
        expect(config.includeStripe).toBe(true);
        expect(config.includeSolana).toBe(false);
      });

      it('should not include Solana RPC URLs in CSP output', () => {
        const config = CSP_PRESETS.STRIPE_ONLY();
        const directives = generateCSPDirectives(config);
        const hasSolana = directives.connectSrc.some((s) => s.includes('solana.com'));
        expect(hasSolana).toBe(false);
      });
    });
  });

  describe('integration examples', () => {
    it('should generate valid CSP for production mainnet', () => {
      const csp = generateCSP({
        solanaCluster: 'mainnet-beta',
        solanaEndpoint: 'https://mainnet.helius-rpc.com',
        customRpcProviders: [RPC_PROVIDERS.QUICKNODE],
      });

      expect(csp).toContain('https://js.stripe.com');
      expect(csp).toContain('https://api.stripe.com');
      expect(csp).toContain('https://mainnet.helius-rpc.com');
      expect(csp).toContain(RPC_PROVIDERS.QUICKNODE);
      expect(csp).toContain('https://checkout.stripe.com');
    });

    it('should generate valid CSP for devnet testing', () => {
      const csp = generateCSP({
        solanaCluster: 'devnet',
        allowUnsafeScripts: true,
      });

      expect(csp).toContain("'unsafe-inline'");
      expect(csp).toContain('https://api.devnet.solana.com');
    });

    it('should generate valid helmet config', () => {
      const helmetConfig = generateCSP(
        {
          solanaCluster: 'mainnet-beta',
          solanaEndpoint: 'https://mainnet.helius-rpc.com',
        },
        'helmet'
      ) as Record<string, string[]>;

      expect(Array.isArray(helmetConfig.scriptSrc)).toBe(true);
      expect(helmetConfig.scriptSrc).toContain("'self'");
      expect(helmetConfig.connectSrc).toContain('https://mainnet.helius-rpc.com');
    });
  });
});
