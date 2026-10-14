import { describe, expect, it } from 'vitest';
import register from '../../web/register';

describe('site-owned marketing routes', () => {
  it('registers commerce without claiming or styling customer pricing pages', () => {
    const bootstrap = register();
    const { manifest } = bootstrap;
    expect(manifest.surfaces.web.packageRef).toBe('react');
    expect(manifest.surfaces.web.required).toBe(true);
    expect(manifest.surfaces.web.routeIds).toEqual([]);
    expect(manifest.surfaces.web.blockTypes).toEqual([]);
    expect(manifest.surfaces.web.templateIds).toEqual([]);
    expect(manifest.surfaces.web.authoredSurfaceIds).toEqual([]);
    expect(manifest.pageSeeds).toEqual([]);
    expect(manifest.contentBlocks).toEqual([]);
    expect(manifest.contentTemplates).toEqual([]);
    expect(manifest.authoredSurfaces).toEqual([]);
    expect(bootstrap.contentBlockRenderers).toBeUndefined();
    expect(bootstrap.contentBlocks).toBeUndefined();
    expect(bootstrap.contentTemplates).toBeUndefined();
    expect(document.getElementById('cedros-pay-pricing-programs-runtime-styles')).toBeNull();
  });

  it('retains catalog, checkout, and entitlement services for any site to consume', () => {
    const routes = register().manifest.surfaces.server.routes;
    for (const route of ['cedros-pay:product-read', 'cedros-pay:checkout-create', 'cedros-pay:subscription-entitlements']) {
      expect(routes).toContain(route);
    }
    expect(JSON.stringify(register())).not.toMatch(/cedros-pay:(?:pricing-page|programs-page|developers-page|pricing-programs-page)"/);
  });
});
