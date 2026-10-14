import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { cedrosPayPlugin } from '../../admin/plugin';
import type { AdminSectionProps } from '../../admin/types';

const FIXTURE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const EXTENSION_STYLE_FILES = [
  'ui/src/admin-plugin.css',
  'ui/src/admin-plugin-dashboard.css',
  'ui/src/admin-plugin-overlays.css',
  'ui/src/admin-plugin-payments.css',
  'ui/src/admin-plugin-pay-hub.css',
  'ui/src/admin-plugin-product-form.css',
  'ui/src/admin-plugin-payment-controls.css',
  'ui/src/admin-plugin-tables.css',
  'ui/src/admin-plugin-workbench.css',
  'ui/src/admin-plugin-workbench-states.css',
  'ui/src/admin-plugin-workbench-surfaces.css',
  'ui/src/admin-plugin-workbench-tables.css',
  'ui/src/styles.css',
];
const HOST_TOKEN_DEFINITION_PATTERN =
  /--cedros-(background|foreground|card|muted|muted-foreground|border|primary|primary-foreground|accent|ring|link|success|error|warning|info)\s*:/u;
// The host derives `--cd-*` from `--admin-*` on `.cedros-data` (a class our
// admin root carries). Declaring either namespace ourselves creates a custom
// property dependency cycle on that element, which invalidates the whole
// variable set and silently drops every var()-based declaration. Extension
// sheets may read these via var() but must only declare `--pay-admin-*`.
const HOST_VAR_DECLARATION_PATTERN = /--(?:admin|cd)-[\w-]*\s*:/u;
const HIGH_RISK_GLOBAL_SELECTOR_PATTERN =
  /(^|[},])\s*(:root|html|body|\*|a|button|input|h[1-6]|\.cedros-(admin|data|site|runtime)[A-Za-z0-9_-]*)\s*(\{|,)/u;

describe('extension style scoping', () => {
  it('renders admin sections under an extension-owned style root', () => {
    const SettingsHubSection = cedrosPayPlugin.components[
      'cedros-pay:settings-hub'
    ] as ComponentType<AdminSectionProps>;
    const html = renderToStaticMarkup(
      createElement(SettingsHubSection, {
        pluginContext: {
          serverUrl: 'https://pay.example.com',
          getAccessToken: () => null,
          hasPermission: () => true,
        },
      })
    );

    expect(html).toContain('class="cedros-pay-admin cedros-data"');
    expect(html).toContain('data-extension-id="cedros-pay"');
  });

  it('keeps packaged CSS scoped away from host selectors and tokens', () => {
    for (const styleFile of EXTENSION_STYLE_FILES) {
      const css = readFileSync(path.join(FIXTURE_ROOT, styleFile), 'utf8');

      expect(css).not.toMatch(HOST_TOKEN_DEFINITION_PATTERN);
      expect(css).not.toMatch(HOST_VAR_DECLARATION_PATTERN);
      expect(css).not.toMatch(HIGH_RISK_GLOBAL_SELECTOR_PATTERN);
      expect(css).not.toContain('!important');
      expect(css).not.toMatch(/@layer\b/u);
    }
  });

  it('keeps stat tiles self-contained instead of a divided strip', () => {
    // The stats bar is a grid of bordered metric tiles. Any leftover divider
    // rule (`border-right` plus a `:last-child` reset) both misaligns tile
    // content and strips the border off the last tile in every row.
    for (const styleFile of EXTENSION_STYLE_FILES) {
      const css = readFileSync(path.join(FIXTURE_ROOT, styleFile), 'utf8');
      const dividerRule =
        /\.cedros-admin__stats-bar-item[^{]*\{[^}]*border-(?:right|bottom)\s*:/u;

      expect(css).not.toMatch(dividerRule);
    }
  });

  it('uses Cedros admin tokens for the dashboard card skin', () => {
    const css = readFileSync(
      path.join(FIXTURE_ROOT, 'ui/src/admin-plugin-dashboard.css'),
      'utf8'
    );

    expect(css).toContain('--cd-bg');
    expect(css).toContain('--cd-fg');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/iu);
    expect(css).not.toMatch(/\b(?:rgb|rgba|hsl|hsla)\(/iu);
  });

  it('keeps Pay hub content settings sections one per row', () => {
    const css = readFileSync(
      path.join(FIXTURE_ROOT, 'ui/src/admin-plugin-payments.css'),
      'utf8'
    );
    const embeddedGridRule =
      /\.cedros-pay-admin\s+\.cedros-admin__content-settings--embedded\s+\.cedros-admin__content-settings-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/u;
    const autoFitColumnsRule =
      /\.cedros-pay-admin\s+\.cedros-admin__content-settings--embedded\s+\.cedros-admin__content-settings-grid\s*\{[^}]*repeat\(auto-fit/u;

    expect(css).toMatch(embeddedGridRule);
    expect(css).not.toMatch(autoFitColumnsRule);
  });

  it('keeps Pay hub card headers aligned with their card content', () => {
    const css = readFileSync(
      path.join(FIXTURE_ROOT, 'ui/src/admin-plugin-payments.css'),
      'utf8'
    );
    const paymentHeaderRule =
      /\.cedros-pay-admin\s+\.cedros-admin__payment-card\s*>\s*\.cedros-admin__payment-card-header\s*\{[^}]*border-bottom:\s*0;[^}]*padding:\s*0;/u;

    expect(css).toMatch(paymentHeaderRule);
  });

  it('disables admin spinner animation for reduced-motion users', () => {
    const css = readFileSync(
      path.join(FIXTURE_ROOT, 'ui/src/admin-plugin-overlays.css'),
      'utf8'
    );

    expect(css).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/u);
    expect(css).toMatch(
      /\.cedros-pay-admin\s+\.cedros-admin__spinner\s*\{\s*animation:\s*none;/u
    );
  });

  it('provides reduced-motion, grid disclosure, and intent-based action rules', () => {
    const css = readFileSync(
      path.join(FIXTURE_ROOT, 'ui/src/admin-plugin-workbench-surfaces.css'),
      'utf8'
    );

    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/u);
    expect(css).toMatch(/grid-template-rows:\s*0fr/u);
    expect(css).toMatch(/grid-template-rows:\s*1fr/u);
    expect(css).toMatch(/hover:\s*hover/u);
    expect(css).toMatch(/focus-within/u);
  });

  it('keeps admin surfaces inside the mobile viewport and reflows shared controls', () => {
    const workbenchCss = readFileSync(
      path.join(FIXTURE_ROOT, 'ui/src/admin-plugin-workbench.css'),
      'utf8'
    );
    const surfaceCss = readFileSync(
      path.join(FIXTURE_ROOT, 'ui/src/admin-plugin-workbench-surfaces.css'),
      'utf8'
    );
    const tableCss = readFileSync(
      path.join(FIXTURE_ROOT, 'ui/src/admin-plugin-workbench-tables.css'),
      'utf8'
    );

    expect(workbenchCss).toMatch(
      /\.cedros-pay-admin\s*\{[^}]*max-width:\s*calc\(100dvw - 2rem\);/su
    );
    expect(workbenchCss).toMatch(
      /\.cedros-pay-admin\s+\.cedros-admin__hub-body[^{]*\{[^}]*min-width:\s*0;[^}]*width:\s*100%;/su
    );
    expect(surfaceCss).toMatch(
      /@media\s*\(max-width:\s*767px\)[\s\S]*\.cedros-pay-admin\s+\.cedros-data-tabs__list\s*\{[^}]*overflow-x:\s*auto;/u
    );
    expect(surfaceCss).toMatch(
      /@media\s*\(max-width:\s*767px\)[\s\S]*\.cedros-pay-admin\s+\.cedros-admin__toolbar\s*\{[^}]*flex-direction:\s*column;/u
    );
    expect(tableCss).toMatch(
      /\.cedros-pay-admin\s+\.cedros-data-empty-state--in-table\s*\{[^}]*max-width:\s*calc\(100dvw - 2rem\);/su
    );
  });

  it('keeps shared dialogs scrollable while constraining the coupon dialog body', () => {
    const css = readFileSync(
      path.join(FIXTURE_ROOT, 'ui/src/admin-plugin-workbench-surfaces.css'),
      'utf8'
    );

    expect(css).not.toMatch(
      /\.cedros-pay-admin\s+\.cedros-admin__modal\s*\{[^}]*overflow:\s*hidden;/su
    );
    expect(css).toMatch(
      /\.cedros-pay-admin\s+\.cedros-admin__coupon-dialog-body\s*\{[^}]*overflow-y:\s*auto;/su
    );
  });
});
