import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: (() => {
    const plugins = [
      react(),
      dts({
        insertTypesEntry: true,
        include: ['src'],
        exclude: ['src/__tests__'],
      }),
    ];

    if (process.env.ANALYZE === 'true') {
      plugins.push(
        visualizer({
          filename: 'dist/bundle-analysis.html',
          open: true,
          template: 'treemap',
        })
      );
    }

    return plugins;
  })(),
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'stripe-only': resolve(__dirname, 'src/stripe-only.ts'),
        'crypto-only': resolve(__dirname, 'src/crypto-only.ts'),
        telemetry: resolve(__dirname, 'src/telemetry.ts'),
        'testing/index': resolve(__dirname, 'src/testing/index.ts'),
      },
      name: 'CedrosPay',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        // Externalize peer dependencies
        '@cedros/login-react',
        '@solana/web3.js',
        '@solana/wallet-adapter-base',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui',
        '@solana/wallet-adapter-wallets',
        '@solana/spl-token',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
