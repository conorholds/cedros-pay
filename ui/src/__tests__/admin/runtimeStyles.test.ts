/**
 * The host imports admin/register from the extension archive and (on older
 * builds) never loads the archive's standalone CSS — the bundle must inject
 * its own styles. Vitest does not process `?inline` CSS imports (they resolve
 * to empty strings here), so the bundled-css contents are pinned at packaging
 * time by scripts/package-extension.mjs; these tests cover the injector.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  CEDROS_PAY_ADMIN_STYLE_ELEMENT_ID,
  injectCedrosPayAdminStyles,
} from '../../admin/runtimeStyles';

afterEach(() => {
  document.getElementById(CEDROS_PAY_ADMIN_STYLE_ELEMENT_ID)?.remove();
});

describe('injectCedrosPayAdminStyles', () => {
  it('appends one style element with the given css', () => {
    injectCedrosPayAdminStyles('.cedros-admin__tab{color:red}');

    const style = document.getElementById(CEDROS_PAY_ADMIN_STYLE_ELEMENT_ID);
    expect(style?.tagName).toBe('STYLE');
    expect(style?.textContent).toBe('.cedros-admin__tab{color:red}');
  });

  it('does not duplicate or overwrite an existing style element', () => {
    injectCedrosPayAdminStyles('.first{color:red}');
    injectCedrosPayAdminStyles('.second{color:blue}');

    const styles = document.querySelectorAll(`#${CEDROS_PAY_ADMIN_STYLE_ELEMENT_ID}`);
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toBe('.first{color:red}');
  });

  it('ignores empty css', () => {
    injectCedrosPayAdminStyles('');

    expect(document.getElementById(CEDROS_PAY_ADMIN_STYLE_ELEMENT_ID)).toBeNull();
  });
});
