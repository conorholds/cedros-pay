import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRustAuditReport } from '../lib/rust-audit-validation.mjs';

function report({ vulnerabilities = [], warnings = [] } = {}) {
  return {
    vulnerabilities: {
      found: vulnerabilities.length > 0,
      count: vulnerabilities.length,
      list: vulnerabilities.map((id) => ({ advisory: { id } })),
    },
    warnings: { unmaintained: warnings },
  };
}

function warning(id, name, version) {
  return { advisory: { id }, package: { name, version } };
}

test('accepts an audit without vulnerabilities or warnings', () => {
  assert.deepEqual(validateRustAuditReport(report()), []);
});

test('rejects every vulnerability', () => {
  assert.throws(
    () => validateRustAuditReport(report({ vulnerabilities: ['RUSTSEC-2099-0001'] })),
    /vulnerabilities found.*RUSTSEC-2099-0001/i,
  );
});

test('rejects a new warning advisory', () => {
  assert.throws(
    () => validateRustAuditReport(report({
      warnings: [warning('RUSTSEC-2099-0002', 'other', '1.0.0')],
    })),
    /unexpected RustSec warning.*RUSTSEC-2099-0002/i,
  );
});

test('rejects the retired standalone bincode exception and related warnings', () => {
  for (const candidate of [
    warning('RUSTSEC-2025-0141', 'bincode', '1.3.3'),
    warning('RUSTSEC-2025-0141', 'not-bincode', '1.3.3'),
    warning('RUSTSEC-2025-0141', 'bincode', '2.0.0'),
  ]) {
    assert.throws(
      () => validateRustAuditReport(report({ warnings: [candidate] })),
      /unexpected RustSec warning/i,
    );
  }
});
