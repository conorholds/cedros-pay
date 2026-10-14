#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOTS = [path.join(ROOT, 'ui', 'src')];
const ALLOWED_PREFIXES = [
  path.join(ROOT, 'ui', 'src', 'autosave') + path.sep,
  path.join(ROOT, 'ui', 'src', 'components', 'admin', 'useAutosave.ts'),
];
const EXTENSIONS = new Set(['.ts', '.tsx']);
const AD_HOC_PATTERNS = [
  /auto[-_ ]?save[\s\S]{0,240}set(?:Timeout|Interval)\s*\(/i,
  /set(?:Timeout|Interval)\s*\([\s\S]{0,240}auto[-_ ]?save/i,
  /auto[-_ ]?save[\s\S]{0,240}\bfetch\s*\(/i,
  /\bfetch\s*\([\s\S]{0,240}auto[-_ ]?save/i,
];
const CUSTOM_STATUS_PATTERNS = [
  /[Aa]uto[-_ ]?save[\s\S]{0,240}["'`][^"'`]{0,120}\b(Saving|Saved|Unsaved|Couldn't save|Couldn.t save)\b/,
  /["'`][^"'`]{0,120}\b(Saving|Saved|Unsaved|Couldn't save|Couldn.t save)\b[^"'`]{0,120}["'`][\s\S]{0,240}[Aa]uto[-_ ]?save/,
];

const violations = [];

for (const root of SCAN_ROOTS) {
  walk(root, (file) => {
    if (!EXTENSIONS.has(path.extname(file))) return;
    if (file.includes(`${path.sep}__tests__${path.sep}`)) return;
    if (ALLOWED_PREFIXES.some((prefix) => file.startsWith(prefix))) return;
    const source = stripComments(fs.readFileSync(file, 'utf8'));
    if (AD_HOC_PATTERNS.some((pattern) => pattern.test(source))) {
      violations.push({ file, reason: 'raw autosave timer or network loop' });
    } else if (CUSTOM_STATUS_PATTERNS.some((pattern) => pattern.test(source))) {
      violations.push({ file, reason: 'custom autosave status label' });
    }
  });
}

if (violations.length > 0) {
  console.error('[autosave] Non-standard autosave implementation detected.');
  for (const violation of violations) {
    console.error(`  - ${path.relative(ROOT, violation.file)}: ${violation.reason}`);
  }
  console.error('[autosave] Use ui/src/autosave or the admin compatibility wrapper.');
  process.exit(1);
}

console.log('[autosave] No non-standard autosave implementations found.');

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, visit);
    } else {
      visit(fullPath);
    }
  }
}

function stripComments(source) {
  let output = '';
  let mode = 'code';
  let quote = '';
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (mode === 'line') {
      if (char === '\n') {
        output += char;
        mode = 'code';
      }
      continue;
    }

    if (mode === 'block') {
      if (char === '\n') output += char;
      if (char === '*' && next === '/') {
        index += 1;
        mode = 'code';
      }
      continue;
    }

    if (mode === 'string') {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        mode = 'code';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      index += 1;
      mode = 'line';
      continue;
    }
    if (char === '/' && next === '*') {
      index += 1;
      mode = 'block';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      mode = 'string';
    }
    output += char;
  }

  return output;
}
