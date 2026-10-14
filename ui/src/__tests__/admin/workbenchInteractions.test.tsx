import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AdminDialog } from '../../components/admin/AdminDialog';
import { ActionMenu } from '../../components/admin/ActionMenu';
import { FilterDropdown } from '../../components/admin/Dropdown';

function DialogHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open dialog</button>
      {isOpen && (
        <AdminDialog labelledBy="dialog-title" onClose={() => setIsOpen(false)}>
          <h2 id="dialog-title">Edit product</h2>
          <button type="button">First action</button>
          <button type="button" onClick={() => setIsOpen(false)}>Close dialog</button>
        </AdminDialog>
      )}
    </>
  );
}

describe('Workbench interaction contracts', () => {
  it('traps Tab when an in-flight financial action disables every dialog control', async () => {
    render(<>
      <button>Outside</button>
      <AdminDialog labelledBy="busy-title" onClose={() => undefined}>
        <h2 id="busy-title">Refunding</h2>
        <button disabled>Cancel</button>
        <button disabled>Submitting</button>
      </AdminDialog>
    </>);
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(fireEvent.keyDown(dialog, { key: 'Tab' })).toBe(false);
    expect(dialog).toHaveFocus();
    expect(fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(dialog).toHaveFocus();
  });

  it('closes dialogs with Escape and restores focus to the invoker', async () => {
    render(<DialogHarness />);
    const invoker = screen.getByRole('button', { name: 'Open dialog' });

    invoker.focus();
    fireEvent.click(invoker);
    await waitFor(() => expect(screen.getByRole('button', { name: 'First action' })).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(invoker).toHaveFocus());
  });

  it('keeps keyboard focus inside an open dialog', async () => {
    render(<DialogHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    const first = await screen.findByRole('button', { name: 'First action' });
    const last = screen.getByRole('button', { name: 'Close dialog' });

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('portals dropdown menus and supports arrow-key selection', async () => {
    const onChange = vi.fn();
    render(
      <div className="cedros-pay-admin cedros-data">
        <FilterDropdown
          value="all"
          onChange={onChange}
          ariaLabel="Status"
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'paused', label: 'Paused', disabled: true },
            { value: 'active', label: 'Active' },
          ]}
        />
      </div>
    );
    const trigger = screen.getByRole('button', { name: 'Status' });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const selected = await screen.findByRole('option', { name: 'All statuses' });
    await waitFor(() => expect(selected).toHaveFocus());
    expect(selected.closest('.cedros-pay-admin__portaled-dropdown')).not.toBeNull();

    fireEvent.keyDown(selected, { key: 'ArrowDown' });
    const active = screen.getByRole('option', { name: 'Active' });
    expect(active).toHaveFocus();
    fireEvent.click(active);

    expect(onChange).toHaveBeenCalledWith('active');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('closes dropdown menus with Escape and restores trigger focus', async () => {
    render(
      <FilterDropdown
        value="all"
        onChange={() => undefined}
        ariaLabel="Status"
        options={[{ value: 'all', label: 'All statuses' }]}
      />
    );
    const trigger = screen.getByRole('button', { name: 'Status' });

    fireEvent.click(trigger);
    const option = await screen.findByRole('option', { name: 'All statuses' });
    fireEvent.keyDown(option, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('option')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps a portalled dropdown on screen and updates its handler without remounting', async () => {
    const options = [
      { value: 'all', label: 'All statuses' },
      { value: 'active', label: 'Active' },
    ];
    const firstChange = vi.fn();
    const view = render(
      <FilterDropdown value="all" onChange={firstChange} ariaLabel="Status" options={options} />
    );
    const trigger = screen.getByRole('button', { name: 'Status' });
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(new DOMRect(950, 700, 100, 36));
    fireEvent.click(trigger);
    const menu = (await screen.findByRole('listbox')) as HTMLDivElement;
    Object.defineProperty(menu, 'offsetWidth', { configurable: true, value: 240 });
    Object.defineProperty(menu, 'offsetHeight', { configurable: true, value: 120 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 760 });
    fireEvent(window, new Event('resize'));

    expect(menu.style.left).toBe('752px');
    expect(menu.style.top).toBe('576px');

    const latestChange = vi.fn();
    view.rerender(
      <FilterDropdown value="all" onChange={latestChange} ariaLabel="Status" options={options} />
    );
    expect(screen.getByRole('listbox')).toBe(menu);
    fireEvent.click(screen.getByRole('option', { name: 'Active' }));
    expect(firstChange).not.toHaveBeenCalled();
    expect(latestChange).toHaveBeenCalledWith('active');
  });

  it('portals row actions and restores focus after keyboard dismissal', async () => {
    const onEditVariations = vi.fn();
    render(
      <ActionMenu
        label="Widget actions"
        items={[
          { label: 'Edit variations', onSelect: onEditVariations },
          { label: 'Sync Stripe', onSelect: vi.fn(), disabled: true },
        ]}
      />
    );
    const trigger = screen.getByRole('button', { name: 'Widget actions' });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const first = await screen.findByRole('menuitem', { name: 'Edit variations' });
    await waitFor(() => expect(first).toHaveFocus());
    expect(first.closest('.cedros-pay-admin__portaled-dropdown')).not.toBeNull();

    fireEvent.keyDown(first, { key: 'ArrowDown' });
    const disabled = screen.getByRole('menuitem', { name: 'Sync Stripe' });
    expect(disabled).toHaveFocus();
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    fireEvent.keyDown(disabled, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onEditVariations).not.toHaveBeenCalled();
  });
});
