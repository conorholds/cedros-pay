/**
 * Self-injected admin styles for the host-loaded admin bundle.
 *
 * The Cedros platform host imports `admin/register` straight from the extension
 * archive. Older host builds never inject the archive's standalone CSS files
 * (`pay-react.css`), so the bundle must carry its own styles: the admin CSS is
 * inlined into this chunk as a string and appended as one id-guarded <style>
 * tag at module evaluation — the same pattern cedros-login's admin bundle uses
 * (`cedros-login-admin-styles`). Newer hosts that also inject archive CSS just
 * apply identical rules twice, which is harmless.
 */
import adminPluginCss from '../admin-plugin.css?inline';
import adminPaymentsCss from '../admin-plugin-payments.css?inline';
import adminPayHubCss from '../admin-plugin-pay-hub.css?inline';
import adminProductFormCss from '../admin-plugin-product-form.css?inline';
import adminPaymentControlsCss from '../admin-plugin-payment-controls.css?inline';
import adminWorkbenchCss from '../admin-plugin-workbench.css?inline';
import adminWorkbenchStatesCss from '../admin-plugin-workbench-states.css?inline';
import adminWorkbenchSurfacesCss from '../admin-plugin-workbench-surfaces.css?inline';
import adminWorkbenchTablesCss from '../admin-plugin-workbench-tables.css?inline';

/** Stable element id so repeated module evaluation injects exactly once. */
export const CEDROS_PAY_ADMIN_STYLE_ELEMENT_ID = 'cedros-pay-admin-styles';

/** Complete admin stylesheet text bundled into the admin runtime chunk. */
export const cedrosPayAdminCss = [
  adminPluginCss,
  adminPaymentsCss,
  adminPayHubCss,
  adminProductFormCss,
  adminPaymentControlsCss,
  adminWorkbenchCss,
  adminWorkbenchStatesCss,
  adminWorkbenchSurfacesCss,
  adminWorkbenchTablesCss,
].join('\n');

/**
 * Appends one `<style id={styleId}>` containing `css` to the document head.
 * No-op without a DOM (SSR), with empty css, or when the id already exists.
 */
export function injectCedrosPayAdminStyles(
  css: string = cedrosPayAdminCss,
  styleId: string = CEDROS_PAY_ADMIN_STYLE_ELEMENT_ID
): void {
  if (typeof document === 'undefined' || !css || document.getElementById(styleId)) {
    return;
  }
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  (document.head ?? document.documentElement).appendChild(style);
}
