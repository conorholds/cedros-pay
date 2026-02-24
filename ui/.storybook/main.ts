import type { StorybookConfig } from 'storybook';
import { loadEnv } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SECURITY: Only load VITE_STORYBOOK_* variables to prevent leaking production secrets
const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), 'VITE_STORYBOOK_');

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  staticDirs: ['./public'],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    const prefixes = Array.isArray(config.envPrefix) ? config.envPrefix : (config.envPrefix ? [config.envPrefix] : []);
    // SECURITY: Only expose VITE_STORYBOOK_* variables to prevent leaking production secrets
    if (!prefixes.includes('VITE_STORYBOOK_')) {
      prefixes.push('VITE_STORYBOOK_');
    }
    if (!prefixes.includes('STORYBOOK_')) {
      prefixes.push('STORYBOOK_');
    }
    config.envPrefix = prefixes;
    // Only define env vars if they have actual values (not empty strings)
    // Empty strings cause CedrosProvider validation to fail
    const defines: Record<string, string> = { ...config.define };

    if (env.VITE_STORYBOOK_SERVER_URL) {
      defines['import.meta.env.VITE_STORYBOOK_SERVER_URL'] = JSON.stringify(env.VITE_STORYBOOK_SERVER_URL);
      defines['import.meta.env.VITE_SERVER_URL'] = JSON.stringify(env.VITE_STORYBOOK_SERVER_URL);
    }

    if (env.VITE_STORYBOOK_SOLANA_ENDPOINT) {
      defines['import.meta.env.VITE_STORYBOOK_SOLANA_ENDPOINT'] = JSON.stringify(env.VITE_STORYBOOK_SOLANA_ENDPOINT);
    }

    config.define = defines;

    // Add resolve alias to map uuid to our browser-safe implementation
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.alias) config.resolve.alias = {};
    const existingAlias = config.resolve.alias;
    config.resolve.alias = {
      ...(typeof existingAlias === 'object' && !Array.isArray(existingAlias) ? existingAlias : {}),
      'uuid': path.resolve(__dirname, '../src/utils/uuid.ts'),
    };

    // No additional optimizeDeps or external configuration needed
    // The resolve alias above will handle uuid imports by redirecting to our shim

    return config;
  }
};

export default config;
