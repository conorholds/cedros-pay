import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';


const framerMotionFilterPropsModule =
  '/framer-motion/dist/es/render/dom/utils/filter-props.mjs';
const framerMotionOptionalRequire =
  'loadExternalIsValidProp(require(emotionPkg).default);';
const directBufferImport =
  /import\s*\{\s*Buffer\s*\}\s*from\s*(['"])buffer\1;?/g;
const browserBufferBinding = 'CedrosBrowserBuffer';

function extensionBrowserCompatibilityPlugin() {
  return {
    name: 'extension-browser-compatibility',
    enforce: 'post' as const,
    async transform(code: string, id: string) {
      let transformed = code;

      if (id.endsWith(framerMotionFilterPropsModule)) {
        if (!transformed.includes(framerMotionOptionalRequire)) {
          throw new Error(
            'framer-motion optional Node require changed; update the browser compatibility transform',
          );
        }
        transformed = transformed.replace(framerMotionOptionalRequire, '');
      }

      if (!id.includes('/node_modules/buffer/')) {
        directBufferImport.lastIndex = 0;
        const hasDirectBufferImport = directBufferImport.test(transformed);
        directBufferImport.lastIndex = 0;
        if (hasDirectBufferImport) {
          transformed = transformed.replace(
            directBufferImport,
            `import { Buffer as ${browserBufferBinding} } from $1buffer$1;`,
          );
        }

        if (
          /\b(?:new\s+)?Buffer\s*(?:[.(])/.test(transformed)
          && !hasLocalBufferBinding(transformed)
        ) {
          if (!hasDirectBufferImport) {
            transformed =
              `import { Buffer as ${browserBufferBinding} } from 'buffer';\n${transformed}`;
          }
          const result = await transformWithEsbuild(transformed, id, {
            define: { Buffer: browserBufferBinding },
            format: 'esm',
          });
          transformed = result.code;
        }
      }

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}

function hasLocalBufferBinding(code: string): boolean {
  return (
    /\b(?:const|let|var|class|function)\s+Buffer\b/.test(code)
    || /\b(?:const|let|var)\s*\{[^}]*\bBuffer\b[^}]*\}\s*=/.test(code)
  );
}

interface EstreeNode {
  type: string;
  start?: number;
  end?: number;
  [key: string]: unknown;
}

interface SourceEdit {
  start: number;
  end: number;
  replacement: string;
}

function rewriteBufferIdentifiers(code: string, ast: EstreeNode): string {
  const edits: SourceEdit[] = [];
  const visited = new WeakSet<object>();

  const addEdit = (node: EstreeNode, replacement: string, start = node.start) => {
    if (start === undefined || node.end === undefined) {
      throw new Error('extension browser compatibility transform requires AST source ranges');
    }
    edits.push({ start, end: node.end, replacement });
  };

  const visit = (value: unknown, parent?: EstreeNode) => {
    if (Array.isArray(value)) {
      value.forEach((child) => visit(child, parent));
      return;
    }
    if (!isEstreeNode(value) || visited.has(value)) return;
    visited.add(value);

    if (value.type === 'Identifier' && value.name === 'Buffer') {
      if (
        parent?.type === 'MemberExpression'
        && parent.property === value
        && parent.computed !== true
      ) {
        const object = parent.object;
        if (!isEstreeNode(object) || object.end === undefined) {
          throw new Error('Buffer member access is missing its object source range');
        }
        const accessor = parent.optional === true ? '?.["Buffer"]' : '["Buffer"]';
        addEdit(value, accessor, object.end);
        return;
      }
      if (
        parent?.type === 'Property'
        && parent.key === value
        && parent.computed !== true
      ) {
        if (parent.shorthand === true) {
          addEdit(value, `Buffer: ${browserBufferBinding}`);
        } else if (parent.method === true) {
          addEdit(value, '["Buffer"]');
        }
        return;
      }
      addEdit(value, browserBufferBinding);
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (key === 'start' || key === 'end' || key === 'loc') continue;
      visit(child, value);
    }
  };

  visit(ast);
  edits.sort((left, right) => right.start - left.start);
  let rewritten = code;
  let previousStart = code.length + 1;
  for (const edit of edits) {
    if (edit.end > previousStart) {
      throw new Error('extension browser compatibility transform produced overlapping edits');
    }
    rewritten =
      rewritten.slice(0, edit.start)
      + edit.replacement
      + rewritten.slice(edit.end);
    previousStart = edit.start;
  }
  return rewritten;
}

function isEstreeNode(value: unknown): value is EstreeNode {
  return (
    typeof value === 'object'
    && value !== null
    && 'type' in value
    && typeof value.type === 'string'
  );
}

export default defineConfig({
  define: { 'process.env': JSON.stringify({ NODE_ENV: 'production' }) },
  plugins: (() => {
    const plugins = [
      react(),
      dts({
        insertTypesEntry: true,
        rollupTypes: true,
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
    plugins.push(extensionBrowserCompatibilityPlugin());
    plugins.push({
      name: 'minify-extension-runtime-esm',
      enforce: 'post',
      renderChunk: {
        order: 'post',
        async handler(code, chunk, outputOptions) {
          if (outputOptions.format !== 'es') return null;
          const result = await transformWithEsbuild(code, chunk.fileName, {
            format: 'esm',
            minify: true,
          });
          return {
            code: rewriteBufferIdentifiers(
              result.code,
              this.parse(result.code) as unknown as EstreeNode,
            ),
            map: null,
          };
        },
      },
    });

    return plugins;
  })(),
  build: {
    lib: {
      entry: {
        'admin/register': resolve(__dirname, 'src/admin/register.ts'),
        'web/register': resolve(__dirname, 'src/web/register.ts'),
      },
      name: 'CedrosPay',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'cedros:admin',
        'vitest',
      ],
      output: {
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          vitest: 'vitest',
        },
      },
    },
  },
});
