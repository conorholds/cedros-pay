import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../components/admin/SingleCategorySettings', () => ({
  SingleCategorySettings: ({
    blockedReason,
    category,
    hideActions,
    hideEditor,
    setupNote,
    title,
  }: {
    blockedReason?: string;
    category: string;
    hideActions?: boolean;
    hideEditor?: boolean;
    setupNote?: string;
    title: string;
  }) => (
    <div
      data-testid="single-category-settings"
      data-blocked-reason={blockedReason ?? ''}
      data-category={category}
      data-hide-actions={String(Boolean(hideActions))}
      data-hide-editor={String(Boolean(hideEditor))}
      data-setup-note={setupNote ?? ''}
    >
      {title}
    </div>
  ),
}));

vi.mock('../../components/admin/ContentSettingsSection', () => ({
  ContentSettingsSection: ({ showPageHeader }: { showPageHeader?: boolean }) => (
    <div
      data-testid="content-settings-section"
      data-show-page-header={String(showPageHeader)}
    />
  ),
}));

vi.mock('../../components/admin/PayHubOverviewSection', () => ({
  PayHubOverviewSection: () => <div data-testid="pay-hub-overview" />,
}));

vi.mock('../../components/admin/RegionalPaymentMethodsSection', () => ({
  RegionalPaymentMethodsSection: () => <div data-testid="regional-payment-methods" />,
}));

import { PaymentSettingsSection } from '../../components/admin/PaymentSettingsSection';

describe('PaymentSettingsSection', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/admin/payhub');
  });

  it('renders the Pay hub page title and description before the payment tabs', () => {
    render(<PaymentSettingsSection serverUrl="https://example.test" />);

    const heading = screen.getByRole('heading', { level: 2, name: 'Pay hub' });
    const description = screen.getByText(
      'Configure the payment rails Cedros can use across web, iOS, Android, and crypto flows.'
    );
    const firstTab = screen.getByRole('tab', { name: 'Overview' });

    expect(heading).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(heading).toHaveClass('cedros-data__title');
    expect(description).toHaveClass('cedros-data__subtitle');
    expect(screen.getByRole('tablist')).toHaveClass('cedros-data-tabs__list');
    expect(firstTab).toHaveClass('cedros-data-tabs__tab');
    expect(screen.queryByRole('heading', { name: 'Payment Options' })).not.toBeInTheDocument();
    expect(
      heading.compareDocumentPosition(firstTab) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      description.compareDocumentPosition(firstTab) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('orders payment option tabs with Overview first and Content before App stores', () => {
    render(<PaymentSettingsSection serverUrl="https://example.test" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Overview',
      'Availability',
      'Stripe',
      'Crypto',
      'Credits',
      'Content',
      'App stores',
    ]);
  });

  it('opens Overview by default', () => {
    render(<PaymentSettingsSection serverUrl="https://example.test" />);

    expect(screen.getByTestId('pay-hub-overview')).toBeInTheDocument();
  });

  it('opens Stripe settings when selected', () => {
    render(<PaymentSettingsSection serverUrl="https://example.test" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Stripe' }));

    const settings = screen.getByTestId('single-category-settings');
    expect(settings).toHaveTextContent('Stripe');
    expect(settings).toHaveAttribute('data-category', 'stripe');
    expect(settings).toHaveAttribute('data-hide-actions', 'false');
    expect(settings).toHaveAttribute('data-hide-editor', 'false');
    expect(settings).toHaveAttribute('data-blocked-reason', '');
  });

  it('opens regional payment availability when selected', () => {
    render(<PaymentSettingsSection serverUrl="https://example.test" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Availability' }));

    expect(screen.getByTestId('regional-payment-methods')).toBeInTheDocument();
  });

  it('keeps Pay-owned Credits available without Cedros Balance', () => {
    render(<PaymentSettingsSection serverUrl="https://example.test" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Credits' }));

    const settings = screen.getByTestId('single-category-settings');
    expect(settings).toHaveTextContent('Credits');
    expect(settings).toHaveAttribute('data-category', 'cedros_login');
    expect(settings).toHaveAttribute('data-hide-actions', 'true');
    expect(settings).toHaveAttribute('data-hide-editor', 'true');
    expect(settings).toHaveAttribute('data-blocked-reason', '');
    expect(settings.getAttribute('data-setup-note')).toContain('Cedros Pay owns');
  });

  it('keeps the optional Cedros Balance integration read-only', () => {
    render(
      <PaymentSettingsSection
        serverUrl="https://example.test"
        dependencies={{ cedrosBalanceInstalled: true }}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Credits' }));

    const settings = screen.getByTestId('single-category-settings');
    expect(settings).toHaveAttribute('data-blocked-reason', '');
    expect(settings).toHaveAttribute('data-hide-actions', 'true');
    expect(settings).toHaveAttribute('data-hide-editor', 'true');
    expect(settings.getAttribute('data-setup-note')).toContain('Cedros Pay owns');
    expect(settings.getAttribute('data-setup-note')).toContain('read-only');
  });

  it.each([
    ['Crypto', 'x402'],
    ['App stores', 'native_store'],
  ])('allows %s configuration while server guards enforce activation', (tab, category) => {
    render(<PaymentSettingsSection serverUrl="https://example.test" />);

    fireEvent.click(screen.getByRole('tab', { name: tab }));

    const settings = screen.getByTestId('single-category-settings');
    expect(settings).toHaveAttribute('data-category', category);
    expect(settings).toHaveAttribute('data-hide-actions', 'false');
    expect(settings).toHaveAttribute('data-hide-editor', 'false');
  });

  it('renders Content settings inside Pay hub without a nested page header', () => {
    render(<PaymentSettingsSection serverUrl="https://example.test" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Content' }));

    expect(screen.getByTestId('content-settings-section')).toHaveAttribute(
      'data-show-page-header',
      'false'
    );
    expect(screen.queryByTestId('single-category-settings')).not.toBeInTheDocument();
  });

  it('opens the Content tab when the host supplies defaultTabId=content', () => {
    render(
      <PaymentSettingsSection
        serverUrl="https://example.test"
        defaultTabId="content"
      />
    );

    expect(screen.getByTestId('content-settings-section')).toBeInTheDocument();
  });

  it('opens the tab selected by the Pay hub route', () => {
    window.history.replaceState(
      null,
      '',
      '/admin/payhub?cedrosPaySectionId=cedros-pay%3Asettings-hub&cedrosPayTabId=cedros-pay%3Acrypto'
    );

    render(<PaymentSettingsSection serverUrl="https://example.test" />);

    expect(screen.getByRole('tab', { name: 'Crypto' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('single-category-settings')).toHaveAttribute(
      'data-category',
      'x402'
    );
  });

  it('pushes Pay hub tab routes and restores the previous tab on browser back', async () => {
    render(<PaymentSettingsSection serverUrl="https://example.test" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Crypto' }));
    expect(new URL(window.location.href).searchParams.get('cedrosPaySectionId')).toBe(
      'cedros-pay:settings-hub'
    );
    expect(new URL(window.location.href).searchParams.get('cedrosPayTabId')).toBe(
      'cedros-pay:crypto'
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Content' }));
    expect(screen.getByTestId('content-settings-section')).toBeInTheDocument();
    expect(new URL(window.location.href).searchParams.get('cedrosPayTabId')).toBe(
      'cedros-pay:content'
    );

    window.history.back();

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Crypto' })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    );
    expect(screen.getByTestId('single-category-settings')).toHaveAttribute(
      'data-category',
      'x402'
    );
  });

  it('opens Overview when the host supplies defaultTabId=overview', () => {
    render(
      <PaymentSettingsSection
        serverUrl="https://example.test"
        defaultTabId="overview"
      />
    );

    expect(screen.getByTestId('pay-hub-overview')).toBeInTheDocument();
  });

  it('maps the legacy payment-settings tab id to Stripe', () => {
    render(
      <PaymentSettingsSection
        serverUrl="https://example.test"
        defaultTabId="payment-settings"
      />
    );

    const settings = screen.getByTestId('single-category-settings');
    expect(settings).toHaveTextContent('Stripe');
    expect(settings).toHaveAttribute('data-category', 'stripe');
  });

  it('supports keyboard navigation across Pay hub tabs', () => {
    render(<PaymentSettingsSection serverUrl="https://example.test" />);

    const tablist = screen.getByRole('tablist', { name: 'Payment settings' });
    fireEvent.keyDown(tablist, { key: 'End' });

    expect(screen.getByRole('tab', { name: 'App stores' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    const settings = screen.getByTestId('single-category-settings');
    expect(settings).toHaveAttribute('data-category', 'native_store');
  });
});
