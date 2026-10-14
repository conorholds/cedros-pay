import assert from 'node:assert/strict';
import test from 'node:test';
import { maskRustNonCode } from '../lib/rust-source-mask.mjs';

const references = (source) => [...maskRustNonCode(source).matchAll(/\bcrate::(\w+)/g)].map((match) => match[1]);

test('retains executable dependency edges while excluding documentation and nested comments', () => {
  const source = `//! Dispatched by [crate::router].
/* outer crate::fake /* nested */ crate::hidden */
use crate::routes;
fn call() { crate::jobs::run(); }`;
  assert.deepEqual(references(source), ['routes', 'jobs']);
  const masked = maskRustNonCode(source);
  assert.equal(masked.length, source.length);
  assert.equal(masked.split('\n').length, source.split('\n').length);
});

test('string escapes, raw delimiters, and lifetimes do not disguise runtime edges', () => {
  const source = String.raw`let a = "crate::quoted \\\" crate::also_quoted";
let b = br##"crate::raw /* not a comment */ "# crate::still_raw"##;
fn use_ref<'a>(value: &'a str) { crate::real::call(value); }
let slash = '/'; let quote = '\''; let unicode = '\u{41}';
crate::after::call();`;
  assert.deepEqual(references(source), ['real', 'after']);
});

test('comments and strings cannot manufacture a reverse dependency cycle', () => {
  assert.deepEqual(references('use crate::b; // crate::c'), ['b']);
  assert.deepEqual(references('const NOTE: &str = "crate::a";'), []);
  assert.deepEqual(references('/* unterminated crate::a'), []);
});
