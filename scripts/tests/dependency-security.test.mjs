import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
// Exercise the resolved packages, not just manifest versions or audit labels.
for (const directory of ['ui']) {
  const require = createRequire(new URL(`../../${directory}/package.json`, import.meta.url));
  const braces = createRequire(require.resolve('micromatch'))('braces');

  test(`${directory}: ordinary brace expansion preserves matching semantics`, () => {
    assert.deepEqual(braces.expand('src/{foo,bar}.{js,ts}'), [
      'src/foo.js', 'src/foo.ts', 'src/bar.js', 'src/bar.ts',
    ]);
    assert.deepEqual(braces.expand('{a,{b,c}}'), ['a', 'b', 'c']);
    assert.deepEqual(braces.expand('{1..3}'), ['1', '2', '3']);
  });

  test(`${directory}: deeply nested patterns fail at the guard before stack exhaustion`, () => {
    for (const [open, close] of [['{', '}'], ['(', ')']]) {
      const pattern = open.repeat(3500) + 'a' + close.repeat(3500);
      for (const options of [{}, { expand: true }, { maxDepth: Infinity }, { maxDepth: 10000 }]) {
        assert.throws(() => braces(pattern, options), error => (
          error instanceof SyntaxError && /exceeds max depth/.test(error.message)
        ));
      }
    }
  });

  test(`${directory}: caller-supplied deep ASTs cannot bypass walker guards`, () => {
    for (const method of ['compile', 'expand', 'stringify']) {
      let node = { type: 'text', value: 'a' };
      for (let i = 0; i < 1000; i++) node = { type: 'brace', nodes: [node] };
      const ast = { type: 'root', nodes: [node] };
      assert.throws(() => braces[method](ast), error => (
        error instanceof RangeError && /exceeds max depth/.test(error.message)
      ));
    }
  });

}

// API Extractor consumes the guarded formatter through its existing argparse chain.
for (const directory of ['ui']) {
  const require = createRequire(new URL('../../' + directory + '/package.json', import.meta.url));
  const formatter = createRequire(createRequire(require.resolve('@rushstack/ts-command-line')).resolve('argparse'))('sprintf-js');

  test(`${directory}: formatter preserves ordinary positional and named formatting`, () => {
    assert.equal(formatter.sprintf('%.2f %s', 1.25, 'ready'), '1.25 ready');
    assert.equal(formatter.sprintf('%(prog)s: ready', { prog: 'api-extractor' }), 'api-extractor: ready');
    assert.equal(formatter.vsprintf('%s %d', ['count', 3]), 'count 3');
  });

  test(`${directory}: extreme numeric precision cannot escape as an uncaught exception`, () => {
    for (const type of ['e', 'f', 'g']) {
      for (const precision of ['101', '999999999999999999999999999999999999999999']) {
        const value = formatter.sprintf(`%.${precision}${type}`, 1.25);
        assert.equal(typeof value, 'string');
        assert.ok(value.length <= 110, value);
      }
    }
    assert.equal(formatter.sprintf('%.0g', 1.25), '1');
    assert.equal(formatter.sprintf('%.0f', 1.25), '1');
    assert.equal(formatter.sprintf('%.100f', 1).length, 102);
  });

  const packagePath = require.resolve('@microsoft/api-extractor/package.json');
  const metadata = JSON.parse(readFileSync(packagePath, 'utf8'));
  const cli = resolve(dirname(packagePath), metadata.bin['api-extractor']);
  const run = args => spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8', timeout: 15000,
  });

  test(`${directory}: declaration-tool help uses the guarded formatter`, () => {
    const result = run(['--help']);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /api-extractor|API Extractor/);
  });

  test(`${directory}: declaration-tool invalid arguments fail without an API compatibility crash`, () => {
    const result = run(['run', '--not-an-option']);
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /[Uu]nrecognized arguments/);
    assert.doesNotMatch(result.stderr, /TypeError|is not a function/);
  });

  test(`${directory}: declaration rollup still processes exported types`, () => {
    const root = mkdtempSync(join(tmpdir(), 'cedros-declaration-test-'));
    try {
      writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'declaration-fixture', version: '1.0.0' }));
      writeFileSync(join(root, 'index.d.ts'), 'export declare function greet(name: string): string;\n');
      writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { types: [], skipLibCheck: true }, files: ['index.d.ts'] }));
      const configPath = join(root, 'api-extractor.json');
      writeFileSync(configPath, JSON.stringify({
        projectFolder: root,
        mainEntryPointFilePath: '<projectFolder>/index.d.ts',
        compiler: { tsconfigFilePath: '<projectFolder>/tsconfig.json' },
        apiReport: { enabled: false }, docModel: { enabled: false },
        tsdocMetadata: { enabled: false },
        dtsRollup: { enabled: true, untrimmedFilePath: '<projectFolder>/result.d.ts' },
      }));
      const result = run(['run', '--local', '--config', configPath]);
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, result.stderr + result.stdout);
      assert.match(readFileSync(join(root, 'result.d.ts'), 'utf8'), /greet\(name: string\): string/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

// ESLint's older matcher requires the callable brace-expansion 1.x API.
{
  const require = createRequire(new URL('../../ui/react-native/package.json', import.meta.url));
  const minimatch = createRequire(require.resolve('@eslint/config-array'))('minimatch');
  test('native: legacy ESLint matcher preserves brace-pattern matching', () => {
    assert.equal(minimatch('src/register.ts', 'src/{register,manifest}.ts'), true);
    assert.equal(minimatch('src/other.ts', 'src/{register,manifest}.ts'), false);
  });
}
