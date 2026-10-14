import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TabbedHubSection,
  type HubTab,
} from '../../components/admin/TabbedHubSection';
import type { SectionProps } from '../../components/admin/types';

const PROBE = (label: string) =>
  function Probe({ serverUrl }: SectionProps) {
    return (
      <div data-testid={`probe-${label}`} data-server-url={serverUrl}>
        {label}
      </div>
    );
  };

function buildTabs(): HubTab[] {
  return [
    { id: 'alpha', label: 'Alpha', Component: PROBE('alpha') },
    { id: 'beta', label: 'Beta', Component: PROBE('beta') },
    { id: 'gamma', label: 'Gamma', Component: PROBE('gamma') },
  ];
}

describe('TabbedHubSection', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/admin');
  });

  it('renders optional page title and description before the tablist', () => {
    render(
      <TabbedHubSection
        tabs={buildTabs()}
        title="Commerce"
        description="Manage commerce workflows."
        serverUrl="https://example.test"
      />
    );

    const heading = screen.getByRole('heading', { level: 2, name: 'Commerce' });
    const description = screen.getByText('Manage commerce workflows.');
    const tablist = screen.getByRole('tablist');

    expect(
      heading.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      description.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(heading).toHaveClass('cedros-data__title');
    expect(description).toHaveClass('cedros-data__subtitle');
    expect(tablist).toHaveClass('cedros-data-tabs__list');
  });

  it('omits the page header when title and description are not provided', () => {
    render(<TabbedHubSection tabs={buildTabs()} serverUrl="https://example.test" />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders all tab buttons in a tablist with the first tab selected by default', () => {
    render(<TabbedHubSection tabs={buildTabs()} serverUrl="https://example.test" />);

    const tablist = screen.getByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');

    // Active tab gets tabindex 0, others -1 (roving tabindex pattern)
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    expect(tabs[2]).toHaveAttribute('tabindex', '-1');

    // Active tab's body renders, inactive tabs do not (unmounted).
    expect(screen.getByTestId('probe-alpha')).toBeInTheDocument();
    expect(screen.queryByTestId('probe-beta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('probe-gamma')).not.toBeInTheDocument();
  });

  it('honours defaultTabId when provided', () => {
    render(
      <TabbedHubSection
        tabs={buildTabs()}
        defaultTabId="beta"
        serverUrl="https://example.test"
      />
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('probe-beta')).toBeInTheDocument();
  });

  it('falls back to the first tab when defaultTabId is unknown', () => {
    render(
      <TabbedHubSection
        tabs={buildTabs()}
        defaultTabId="nonexistent"
        serverUrl="https://example.test"
      />
    );

    expect(screen.getByTestId('probe-alpha')).toBeInTheDocument();
  });

  it('switches the active tab on click and fires onTabChange', async () => {
    const onTabChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TabbedHubSection
        tabs={buildTabs()}
        onTabChange={onTabChange}
        serverUrl="https://example.test"
      />
    );

    await user.click(screen.getByRole('tab', { name: 'Gamma' }));
    expect(screen.getByTestId('probe-gamma')).toBeInTheDocument();
    expect(screen.queryByTestId('probe-alpha')).not.toBeInTheDocument();
    expect(onTabChange).toHaveBeenCalledWith('gamma');
  });

  it('forwards section props to the active tab component', () => {
    render(
      <TabbedHubSection
        tabs={buildTabs()}
        defaultTabId="beta"
        serverUrl="https://server.example"
      />
    );

    expect(screen.getByTestId('probe-beta')).toHaveAttribute(
      'data-server-url',
      'https://server.example'
    );
  });

  it('moves focus and selection with arrow keys, Home, and End', async () => {
    const user = userEvent.setup();
    render(<TabbedHubSection tabs={buildTabs()} serverUrl="https://example.test" />);

    const firstTab = screen.getByRole('tab', { name: 'Alpha' });
    firstTab.focus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowRight}'); // wraps to start
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus();

    await user.keyboard('{ArrowLeft}'); // wraps to end
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus();
  });

  it('exposes a tabpanel linked to the active tab via aria-controls/labelledby', () => {
    render(<TabbedHubSection tabs={buildTabs()} serverUrl="https://example.test" />);

    const activeTab = screen.getByRole('tab', { name: 'Alpha' });
    const panel = screen.getByRole('tabpanel');
    expect(activeTab.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(activeTab.id);
  });

  it('updates the active tab when defaultTabId changes after mount', () => {
    const tabs = buildTabs();
    const { rerender } = render(
      <TabbedHubSection tabs={tabs} defaultTabId="alpha" serverUrl="https://example.test" />
    );
    expect(screen.getByTestId('probe-alpha')).toBeInTheDocument();

    rerender(
      <TabbedHubSection tabs={tabs} defaultTabId="gamma" serverUrl="https://example.test" />
    );
    expect(screen.getByTestId('probe-gamma')).toBeInTheDocument();
  });

  it('opens the tab selected by the admin tab route', () => {
    window.history.replaceState(
      null,
      '',
      '/admin?cedrosPaySectionId=cedros-pay%3Acatalog&cedrosPayTabId=cedros-pay%3Agamma'
    );

    render(
      <TabbedHubSection
        tabs={buildTabs()}
        routeSectionId="catalog"
        serverUrl="https://example.test"
      />
    );

    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('probe-gamma')).toBeInTheDocument();
  });

  it('pushes tab routes and restores the previous tab on browser back', async () => {
    const user = userEvent.setup();
    render(
      <TabbedHubSection
        tabs={buildTabs()}
        routeSectionId="catalog"
        serverUrl="https://example.test"
      />
    );

    await user.click(screen.getByRole('tab', { name: 'Beta' }));
    expect(new URL(window.location.href).searchParams.get('cedrosPayTabId')).toBe(
      'cedros-pay:beta'
    );

    await user.click(screen.getByRole('tab', { name: 'Gamma' }));
    expect(screen.getByTestId('probe-gamma')).toBeInTheDocument();
    expect(new URL(window.location.href).searchParams.get('cedrosPayTabId')).toBe(
      'cedros-pay:gamma'
    );

    window.history.back();

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    );
    expect(screen.getByTestId('probe-beta')).toBeInTheDocument();
  });

  it('renders nothing when tabs is empty', () => {
    const { container } = render(
      <TabbedHubSection tabs={[]} serverUrl="https://example.test" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
