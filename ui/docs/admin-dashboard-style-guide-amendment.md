# Admin Dashboard Style Guide — Amendment (What’s Off)

This amendment highlights **specific mismatches** observed in the other team’s implementation relative to the canonical spec in `docs/admin-dashboard-style-guide.md` and the live styles in `src/components/admin/CedrosPayAdminDashboard.css`.

Use this as a punch list to bring the other dashboard into exact alignment.

---

## 1) Tabs — Styling Is Off

**Observed issue:** Tabs have borders on the sides and top; they look boxed.

**Correct spec (must match):**
- Container: `.cedros-admin__tabs`
  - `display: flex; gap: 0.25rem; border-bottom: 1px solid var(--admin-border); margin-bottom: 1rem`
  - **No top/side borders**.
- Tab button: `.cedros-admin__tab`
  - `padding: 0.75rem 1rem; font-size: 0.875rem; font-weight: 500`
  - `background: transparent; border: none; border-bottom: 2px solid transparent`
  - `color: var(--admin-muted)`
- Active tab: `.cedros-admin__tab--active`
  - `color: var(--admin-fg)`
  - `border-bottom-color: var(--admin-fg)`
- Hover: `.cedros-admin__tab:hover` → `color: var(--admin-fg)`

**Fix:** Remove any top/side borders on tab container or tabs. Only the **bottom border** on the container and **bottom border** on the active tab should be visible.

---

## 2) Stats Section — Layout Is Incorrect

**Observed issue:** Individual boxed stat cards used on pages that should use a single **horizontal stats row**.

**Correct spec (Stats Bar):**
Use `.cedros-admin__stats-bar` for main section stats (Products, Transactions, Coupons, Refunds, Subscriptions).

**Stats bar container**
- `display: flex; align-items: center; gap: 1rem;`
- `margin-bottom: 1.5rem;`
- `padding: 0.875rem 1rem;`
- `background: var(--admin-bg);`
- `border: 1px solid var(--admin-border);`
- `border-radius: var(--admin-radius);`
- `box-shadow: var(--admin-shadow-card);`

**Stats grid inside bar**
- `.cedros-admin__stats-bar-grid` → `display: flex; flex: 1; gap: 1.5rem;`

**Stats item**
- `.cedros-admin__stats-bar-item` → `display: flex; flex-direction: column; gap: 0.125rem;`
- `padding-right: 1.5rem; border-right: 1px solid var(--admin-border);`
- Last item: no border-right, no padding-right.

**Typography**
- Label: `0.6875rem`, uppercase, `letter-spacing: 0.06em`, color `var(--admin-muted)`
- Value: `1.125rem`, weight `700`, color `var(--admin-fg)`

**Fix:** Replace multi-box card layout with a **single row stats bar** and dividers.

---

## 3) Table Header Row — Styling & Spacing Off

**Observed issue:** Header row looks too heavy or missing the uppercase label treatment.

**Correct spec:**
- Table container: `border: 1px solid var(--admin-border)` and `border-radius: calc(var(--admin-radius) - 2px)`
- Header cells (`th`):
  - `padding: 0.6875rem 0.75rem;`
  - `font-weight: 500;`
  - `color: var(--admin-muted);`
  - `background: var(--admin-table-head);`
  - `text-transform: uppercase;`
  - `letter-spacing: 0.05em;`
  - `font-size: 0.6875rem;`
  - `border-bottom: 1px solid var(--admin-border);`

**Fix:** Ensure header labels are **uppercase** with the correct size, spacing, and background color.

---

## 4) Table Sortability — Missing or Not Styled

**Observed issue:** Columns either not sortable or use non-standard chevrons / spacing.

**Correct spec:**
- Header label must be a **button** with class `.cedros-admin__table-sort`:
  - `display: inline-flex; align-items: center; gap: 0.375rem;`
  - `background: transparent; border: none;`
- Sort icon (`.cedros-admin__sort-icon`):
  - `width/height: 0.875rem`
  - Idle opacity: `0.35`

**Fix:** Each header cell is a button + chevron icon (up/down). Match spacing and idle opacity.

---

## 5) Dropdown Styling — Incorrect or Default

**Observed issue:** Dropdowns look like default browser controls.

**Correct spec (`.cedros-admin__select`):**
- Height: `2.25rem`
- Padding: `0 2.25rem 0 0.75rem`
- Font size: `0.875rem`
- Border: `1px solid var(--admin-border)`
- Background: `var(--admin-muted-bg)`
- Custom SVG chevron (16x16) aligned right `0.75rem` center
- Hover: border → `var(--admin-ring)` and background → `var(--admin-bg)`
- Focus ring: `0 0 0 3px color-mix(in srgb, var(--admin-ring) 15%, transparent)`

**Fix:** Must replace native select styling with the custom background + SVG chevron + focus ring.

---

## 6) Pills / Badges in Tables — Off

**Observed issue:** Status pills look wrong in size/caps/color.

**Correct spec:**
- Padding: `0.125rem 0.5rem`
- Font size: `0.6875rem`
- Uppercase; `letter-spacing: 0.025em`
- Fully rounded: `border-radius: 9999px`
- Colors:
  - Success: `--admin-success-light` + `--admin-success`
  - Pending: `--admin-warning-light` + `--admin-warning`
  - Failed: `--admin-error-light` + `--admin-error`
  - Muted: `--admin-muted-bg` + `--admin-muted`

**Fix:** Align casing, font size, padding, and colors to match.

---

## 7) Table Spacing — Row Density

**Correct spec:**
- `td` padding: `0.75rem`
- `th` padding: `0.6875rem 0.75rem`
- Hover row background: `var(--admin-table-row-hover)`

**Fix:** Ensure row density matches exact padding values.

---

## 8) Stats Cards vs Stats Bar — Summary (Critical)

**If you see individual stat tiles inside a table section, that is wrong.**
Only the Overview screen uses **stats cards**. All other pages use **StatsBar** (single row with dividers).

---

## Quick Checklist (Must Match)

- Tabs: **no top/side borders**, only bottom line; active tab has bottom border.
- Stats: **single horizontal stats bar** with dividers; no individual tiles.
- Table headers: uppercase, 0.6875rem, letter-spacing 0.05em, muted color, light background.
- Sortability: header is button + chevron; idle icon opacity 0.35.
- Selects: custom styled with SVG chevron, muted bg, focus ring.
- Badges: 0.6875rem uppercase pills, correct padding and colors.
- Table spacing: `th` 0.6875rem vertical; `td` 0.75rem.

---

**Reference:** `docs/admin-dashboard-style-guide.md`
