# Cedros Admin Dashboard — Exact Visual Style Guide

This guide is an exhaustive, implementation-accurate spec for the admin dashboard UI. It mirrors **all class-based CSS** from `src/components/admin/CedrosPayAdminDashboard.css` **and** all inline styles used in the main admin pages (Transactions, Products, Subscriptions, Coupons, Refunds). Use this to ensure pixel-accurate consistency across products.

---

## A) Global Tokens & Typography

**Source:** `.cedros-admin` CSS variables in `src/components/admin/CedrosPayAdminDashboard.css`.

### Colors
- Background: `--admin-bg = hsl(0, 0%, 100%)`
- Foreground text: `--admin-fg = hsl(222.2, 84%, 4.9%)`
- Muted text: `--admin-muted = hsl(215.4, 16.3%, 46.9%)`
- Muted bg: `--admin-muted-bg = hsl(210, 40%, 96.1%)`
- Accent bg: `--admin-accent = hsl(210, 40%, 96.1%)`
- Accent fg: `--admin-accent-fg = hsl(222.2, 47.4%, 11.2%)`
- Border: `--admin-border = hsl(214.3, 31.8%, 91.4%)`
- Input border: `--admin-input = hsl(214.3, 31.8%, 91.4%)`
- Ring: `--admin-ring = hsl(222.2, 84%, 4.9%)`
- Primary: `--admin-primary = hsl(222.2, 47.4%, 11.2%)`
- Primary text: `--admin-primary-fg = hsl(210, 40%, 98%)`
- Success: `--admin-success = hsl(142, 71%, 45%)`
- Success light: `--admin-success-light = hsl(142, 76%, 94%)`
- Warning: `--admin-warning = hsl(38, 92%, 50%)`
- Warning light: `--admin-warning-light = hsl(48, 96%, 89%)`
- Error: `--admin-error = hsl(0, 84.2%, 60.2%)`
- Error light: `--admin-error-light = hsl(0, 86%, 97%)`
- Info: `--admin-info = hsl(221.2, 83.2%, 53.3%)`
- Info light: `--admin-info-light = hsl(214, 100%, 95%)`
- Sidebar bg: `--admin-sidebar-bg = hsl(0, 0%, 100%)`
- Card bg: `--admin-card-bg = hsl(0, 0%, 100%)`

### Tables
- Header bg: `--admin-table-head = hsl(210, 40%, 98%)`
- Row bg: `--admin-table-row = hsl(0, 0%, 100%)`
- Row hover: `--admin-table-row-hover = hsl(210, 40%, 96.1%)`

### Radius & Shadows
- Radius: `--admin-radius = 0.5rem`
- Shadow sm: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- Shadow: `0 2px 4px 0 rgb(0 0 0 / 0.1)`
- Shadow card: `0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 1px -1px rgb(0 0 0 / 0.08)`

### Fonts
- Base: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Mono: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`

### Base Typography
- Base font size: `0.875rem`
- Line height: `1.5`

---

## B) Global Layout

**Root container `.cedros-admin`**
- Grid: `grid-template-columns: 220px 1fr`
- Border: `1px solid var(--admin-border)`
- Radius: `0.5rem`
- Background: `--admin-bg`
- Color: `--admin-fg`
- Font size: `0.875rem`
- Line-height: `1.5`
- Overflow: `hidden`

**Header `.cedros-admin__header`**
- Padding: `1rem 1.5rem`
- Border bottom: `1px solid var(--admin-border)`
- Background: `var(--admin-card-bg)`

**Content `.cedros-admin__content`**
- Padding: `1.5rem`
- Scrollable
- Min height: `0`

**Page wrapper `.cedros-admin__page`**
- `display: flex; flex-direction: column; gap: 1rem`

---

## C) Typography Scale

- Page title: `.cedros-admin__page-title` = `1.25rem`, weight `600`
- Section title: `.cedros-admin__section-title` = `0.9375rem`, weight `600`
- Stat label: `.cedros-admin__stat-label` = `0.8125rem`, weight `500`
- Stat value: `.cedros-admin__stat-value` = `1.5rem`, weight `700`
- Stats bar label: `.cedros-admin__stats-bar-label` = `0.6875rem`, uppercase, `letter-spacing: 0.06em`
- Stats bar value: `.cedros-admin__stats-bar-value` = `1.125rem`, weight `700`
- Table header: `0.6875rem`, uppercase, `letter-spacing: 0.05em`
- Table body: `0.8125rem`
- Muted text: `0.875rem`

---

## D) Sidebar & Navigation

**Sidebar**
- Background: `var(--admin-sidebar-bg)`
- Border-right: `1px solid var(--admin-border)`

**Logo**
- Font size: `0.875rem`
- Weight: `600`
- Letter-spacing: `-0.01em`

**Nav group label**
- Font size: `0.6875rem`
- Uppercase, `letter-spacing: 0.05em`
- Color: `var(--admin-muted)`
- Padding: `0.5rem 0.75rem 0.375rem`

**Nav item**
- Font size: `0.8125rem`
- Weight: `500`
- Padding: `0.5rem 0.75rem`
- Radius: `calc(var(--admin-radius) - 2px)`
- Default color: `var(--admin-muted)`
- Hover/active: background `var(--admin-accent)`, color `var(--admin-fg)`

**Nav icons**
- Size: `1rem` (opacity 0.7 default, 1.0 on hover/active)

---

## E) Stats Design

**Stats grid**
- Columns: `repeat(auto-fit, minmax(240px, 1fr))`
- Gap: `1rem`

**Stat card**
- Padding: `1.125rem 1.25rem`
- Border: `1px solid var(--admin-border)`
- Background: `var(--admin-bg)`
- Shadow: `var(--admin-shadow-card)`

**Stats bar**
- Padding: `0.875rem 1rem`
- Border: `1px solid var(--admin-border)`
- Background: `var(--admin-bg)`
- Shadow: `var(--admin-shadow-card)`
- Item separator: `border-right: 1px solid var(--admin-border)` and `padding-right: 1.5rem`

---

## F) Tables

**Container**
- Border: `1px solid var(--admin-border)`
- Radius: `calc(var(--admin-radius) - 2px)`
- Background: `--admin-table-row`

**Header**
- Padding: `0.6875rem 0.75rem`
- Uppercase, `letter-spacing: 0.05em`
- Font size: `0.6875rem`
- Color: `var(--admin-muted)`
- Background: `--admin-table-head`

**Cells**
- Padding: `0.75rem`
- Border-bottom: `1px solid var(--admin-border)`

**Row hover**
- Background: `--admin-table-row-hover`

**Inline code pill**
- Mono font, `0.75rem`
- Background: `var(--admin-muted-bg)`
- Padding: `0.125rem 0.375rem`
- Radius: `0.25rem`

**Sortable header button**
- Inline-flex, icon size `0.875rem`
- Idle icon opacity: `0.35`

---

## G) Badges / Pills

**Base**
- Padding: `0.125rem 0.5rem`
- Font size: `0.6875rem`
- Uppercase, `letter-spacing: 0.025em`
- Radius: `9999px`

**Variants**
- Success: `--admin-success-light` + `--admin-success`
- Warning: `--admin-warning-light` + `--admin-warning`
- Error: `--admin-error-light` + `--admin-error`
- Muted: `--admin-muted-bg` + `--admin-muted`
- Stripe: bg `rgba(99, 102, 241, 0.12)`, text `#818cf8`
- x402: bg `rgba(139, 92, 246, 0.12)`, text `#a78bfa`
- Credits: bg `rgba(16, 185, 129, 0.12)`, text `#34d399`

---

## H) Buttons

**Base**
- Height: `2.25rem`
- Padding: `0 0.875rem`
- Font size: `0.875rem`
- Weight: `500`
- Radius: `0.5rem`
- Active: `transform: scale(0.98)`
- Focus: `outline: 2px solid var(--admin-ring); outline-offset: 2px`

**Primary**
- Background: `--admin-primary`
- Text: `--admin-primary-fg`
- Shadow: `--admin-shadow-sm`
- Hover: `color-mix` 85% primary + white

**Action**
- Padding: `0 1rem`
- Weight: `600`
- Letter-spacing: `0.01em`
- Icon size: `0.875rem`

**Ghost**
- Transparent
- Hover: `--admin-accent`

**Outline**
- Border: `--admin-input`
- Hover: `--admin-accent`

**Small**
- Height: `2rem`
- Font size: `0.75rem`
- Radius: `calc(var(--admin-radius) - 2px)`

---

## I) Inputs / Selects

**Input**
- Height: `2.25rem`
- Padding: `0.5rem 0.75rem`
- Border: `1px solid var(--admin-input)`
- Background: `--admin-bg`
- Focus ring: `0 0 0 3px color-mix(...15%)`

**Select**
- Height: `2.25rem`
- Min width: `160px`
- Padding: `0 2.25rem 0 0.75rem`
- Background: `--admin-muted-bg`
- Border: `1px solid var(--admin-border)`
- Chevron icon (SVG)
- Hover/Focus: background `--admin-bg`

---

## J) Tabs

- Tabs container border: `1px solid var(--admin-border)`
- Tab padding: `0.75rem 1rem` (line: `0.625rem 1rem`)
- Active: bottom border 2px `var(--admin-fg)`

---

## K) Toggle

- Track: `38px x 22px`
- Thumb: `16px`
- Checked: track bg `--admin-primary`, thumb translateX(16px)
- Focus: ring `0 0 0 3px color-mix(...)`

---

## L) Inline Styles (Main Pages Only)

These are inline styles in the actual components and must be mirrored to match exactly.

### Products
- Product avatar: `width: 28px; height: 28px; borderRadius: 6px; objectFit: 'cover'`
- Avatar placeholder: `width: 28px; height: 28px; borderRadius: 6px; background: 'rgba(0,0,0,0.06)'`
- Product title: `fontWeight: 600`
- Product subtitle: `opacity: 0.8`
- Actions layout: `display: flex; gap: 0.25rem`
- Add form error: `marginBottom: 0.75rem; color: #B42318; fontWeight: 600`
- Helper text: `marginTop: 4; fontSize: 12; opacity: 0.75`

### Coupons
- Helper text under IDs: `marginTop: 4; fontSize: 12; opacity: 0.75`

### Refunds
- Section spacing: `marginTop: 2rem` between tables
- Credits action group: `display: flex; gap: 0.5rem`

### Subscriptions
- Empty state: `padding: 2rem; textAlign: center; opacity: 0.6; border: 1px dashed currentColor; borderRadius: 8`
- Plan list: `display: flex; flexDirection: column; gap: 0.75rem`
- Plan card: `border: 1px solid var(--cedros-admin-border, #e5e5e5); borderRadius: 8; overflow: hidden`
- Popular card bg: `var(--cedros-admin-bg-accent, #f5f5f5)`
- Plan header row: `display: flex; alignItems: center; gap: 1rem; padding: 0.75rem 1rem; cursor: pointer`
- Chevron opacity: `0.5`
- Price text: `opacity: 0.6; fontSize: 14`
- Icon buttons: `padding: 4px 8px`, delete color `#dc2626`
- Expanded panel: `padding: 1rem; borderTop: 1px solid var(--cedros-admin-border, #e5e5e5)`
- Feature empty: `padding: 1rem; textAlign: center; opacity: 0.5; fontSize: 13; border: 1px dashed currentColor; borderRadius: 6`
- Feature row: `display: flex; gap: 0.5rem; alignItems: center`
- Feature index: `opacity: 0.4; fontSize: 12`

---

**Path:** `docs/admin-dashboard-style-guide.md`
