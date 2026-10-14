import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import {
  positionPortaledMenu,
  useDropdownPosition,
  useLatestRef,
} from './usePortaledDropdown';

export interface ActionMenuItem {
  danger?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  label: string;
  onSelect: () => void;
  separatorBefore?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  label: string;
}

function navigationIndex(event: KeyboardEvent, items: ActionMenuItem[], index: number) {
  if (items.length === 0) return null;
  if (event.key === 'Home') return 0;
  if (event.key === 'End') return items.length - 1;
  if (event.key === 'ArrowDown') return (index + 1) % items.length;
  if (event.key === 'ArrowUp') return (index - 1 + items.length) % items.length;
  if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return null;
  const query = event.key.toLocaleLowerCase();
  for (let count = 1; count <= items.length; count += 1) {
    const candidate = (index + count) % items.length;
    if (items[candidate]?.label.toLocaleLowerCase().startsWith(query)) return candidate;
  }
  return null;
}

interface ActionMenuPortalProps {
  closeAndRestoreFocus: () => void;
  itemRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  items: ActionMenuItem[];
  itemsRef: MutableRefObject<ActionMenuItem[]>;
  label: string;
  menuId: string;
  menuRef: MutableRefObject<HTMLDivElement | null>;
  setIsOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement>;
}

function createActionButton(item: ActionMenuItem, index: number, props: ActionMenuPortalProps) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = [
    'cedros-dropdown-menu__item',
    'cedros-admin__dropdown-item',
    item.danger ? 'cedros-dropdown-menu__item--danger cedros-admin__dropdown-item--danger' : '',
  ].filter(Boolean).join(' ');
  button.setAttribute('role', 'menuitem');
  button.setAttribute('aria-disabled', String(item.disabled === true));
  if (item.disabledReason) button.title = item.disabledReason;
  button.textContent = item.label;
  button.addEventListener('click', () => {
    const latest = props.itemsRef.current[index];
    if (!latest || latest.disabled) return;
    props.closeAndRestoreFocus();
    latest.onSelect();
  });
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      props.closeAndRestoreFocus();
      return;
    }
    const nextIndex = navigationIndex(event, props.itemsRef.current, index);
    if (nextIndex !== null) {
      event.preventDefault();
      props.itemRefs.current[nextIndex]?.focus();
    }
  });
  props.itemRefs.current[index] = button;
  return button;
}

function useActionMenuPortal(props: ActionMenuPortalProps, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const wrapper = document.createElement('div');
    wrapper.className = 'cedros-pay-admin cedros-data cedros-pay-admin__portaled-dropdown';
    wrapper.dataset.extensionId = 'cedros-pay';
    const menu = document.createElement('div');
    menu.id = props.menuId;
    menu.className = 'cedros-dropdown-menu__content cedros-admin__dropdown-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', props.label);
    props.items.forEach((item, index) => {
      if (item.separatorBefore) {
        const separator = document.createElement('div');
        separator.className = 'cedros-dropdown-menu__separator cedros-admin__dropdown-separator';
        separator.setAttribute('role', 'separator');
        menu.append(separator);
      }
      menu.append(createActionButton(item, index, props));
    });
    props.menuRef.current = menu;
    wrapper.append(menu);
    document.body.append(wrapper);
    positionPortaledMenu(menu, props.triggerRef.current);
    queueMicrotask(() => props.itemRefs.current[0]?.focus());
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!props.triggerRef.current?.contains(target) && !menu.contains(target)) {
        props.setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOutside);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      wrapper.remove();
      props.menuRef.current = null;
      props.itemRefs.current = [];
    };
  }, [isOpen, props]);
}

export function ActionMenu({ items, label }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const itemsRef = useLatestRef(items);
  const closeAndRestoreFocus = useCallback(() => {
    setIsOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);
  const portalProps = {
    closeAndRestoreFocus,
    itemRefs,
    items,
    itemsRef,
    label,
    menuId,
    menuRef,
    setIsOpen,
    triggerRef,
  };
  useDropdownPosition(isOpen, triggerRef, menuRef);
  useActionMenuPortal(portalProps, isOpen);

  return (
    <div className="cedros-dropdown-menu">
      <button
        ref={triggerRef}
        type="button"
        className="cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm cedros-row-actions__trigger"
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={label}
        title={label}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
          } else if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            closeAndRestoreFocus();
          }
        }}
      >
        <span aria-hidden="true">⋯</span>
      </button>
    </div>
  );
}
