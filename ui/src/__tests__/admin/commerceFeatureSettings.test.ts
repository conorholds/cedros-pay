import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COMMERCE_RUNTIME_AVAILABILITY,
  readCommerceRuntimeAvailability,
} from '../../components/admin/commerceFeatureSettings';

describe('readCommerceRuntimeAvailability', () => {
  it('preserves standalone and older-host feature availability', () => {
    expect(readCommerceRuntimeAvailability(null)).toEqual(
      DEFAULT_COMMERCE_RUNTIME_AVAILABILITY
    );
    expect(readCommerceRuntimeAvailability({ runtime: 'standalone' })).toEqual(
      DEFAULT_COMMERCE_RUNTIME_AVAILABILITY
    );
  });

  it('hides only routes that the Wasm runtime reports as unsupported', () => {
    expect(readCommerceRuntimeAvailability({
      runtime: 'wasm',
      unsupportedRoutes: ['cedros-pay:admin-returns-list'],
    })).toEqual({ disputes: true, returns: false });
  });

  it('keeps Returns available when the current Wasm runtime reports only Disputes', () => {
    expect(readCommerceRuntimeAvailability({
      runtime: 'wasm',
      unsupportedRoutes: [
        'cedros-pay:admin-disputes-list',
        'cedros-pay:admin-disputes-get',
        'cedros-pay:admin-disputes-status-update',
      ],
    })).toEqual({ disputes: false, returns: true });
  });
});
