import {
  useEffect,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
} from 'react';

const MENU_GAP = 4;
const VIEWPORT_GUTTER = 8;
const MIN_MENU_HEIGHT = 80;

export interface PortaledDropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface PortaledDropdownProps {
  closeAndRestoreFocus: () => void;
  menuClassName: string;
  menuId: string;
  menuRef: MutableRefObject<HTMLDivElement | null>;
  onChangeRef: MutableRefObject<(value: string) => void>;
  options: PortaledDropdownOption[];
  optionRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  triggerRef: RefObject<HTMLButtonElement>;
  value: string;
}

export function nextEnabledIndex<T extends { disabled?: boolean }>(
  options: T[],
  start: number,
  step: number
): number {
  for (let count = 0; count < options.length; count += 1) {
    const index = (start + step * count + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

function listboxNavigationIndex(
  event: { key: string },
  options: PortaledDropdownOption[],
  current: number
): number | null {
  if (event.key === 'Home') return nextEnabledIndex(options, 0, 1);
  if (event.key === 'End') return nextEnabledIndex(options, options.length - 1, -1);
  if (event.key === 'ArrowDown') return nextEnabledIndex(options, current + 1, 1);
  if (event.key === 'ArrowUp') return nextEnabledIndex(options, current - 1, -1);
  return null;
}

export function positionPortaledMenu(
  menu: HTMLDivElement | null,
  trigger: HTMLButtonElement | null
) {
  if (!menu) return;
  const rect = trigger?.getBoundingClientRect();
  if (!rect) return;
  menu.style.minWidth = `${rect.width}px`;
  menu.style.maxHeight = `${Math.max(MIN_MENU_HEIGHT, window.innerHeight - VIEWPORT_GUTTER * 2)}px`;
  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  const maxLeft = Math.max(VIEWPORT_GUTTER, window.innerWidth - menuWidth - VIEWPORT_GUTTER);
  const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_GUTTER;
  const spaceAbove = rect.top - MENU_GAP - VIEWPORT_GUTTER;
  const openAbove = menuHeight > spaceBelow && spaceAbove > spaceBelow;
  const preferredTop = openAbove ? rect.top - MENU_GAP - menuHeight : rect.bottom + MENU_GAP;
  const maxTop = Math.max(VIEWPORT_GUTTER, window.innerHeight - menuHeight - VIEWPORT_GUTTER);
  menu.style.left = `${Math.min(Math.max(VIEWPORT_GUTTER, rect.left), maxLeft)}px`;
  menu.style.top = `${Math.min(Math.max(VIEWPORT_GUTTER, preferredTop), maxTop)}px`;
}

export function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export function useDropdownPosition(
  isOpen: boolean,
  triggerRef: RefObject<HTMLButtonElement>,
  menuRef: RefObject<HTMLDivElement>
) {
  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const update = () => positionPortaledMenu(menuRef.current, triggerRef.current);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen, menuRef, triggerRef]);
}

function createDropdownOption(
  option: PortaledDropdownOption,
  index: number,
  props: PortaledDropdownProps
): HTMLButtonElement {
  const selected = option.value === props.value;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `cedros-dropdown-menu__item cedros-admin__dropdown-item ${selected ? 'cedros-admin__dropdown-item--selected' : ''}`.trim();
  button.setAttribute('role', 'option');
  button.setAttribute('aria-selected', String(selected));
  button.disabled = option.disabled === true;
  button.textContent = option.label;
  if (selected) {
    const check = document.createElement('span');
    check.className = 'cedros-admin__dropdown-check';
    check.setAttribute('aria-hidden', 'true');
    check.textContent = '✓';
    button.append(check);
  }
  button.addEventListener('click', () => {
    if (option.disabled) return;
    props.onChangeRef.current(option.value);
    props.closeAndRestoreFocus();
  });
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      props.closeAndRestoreFocus();
      return;
    }
    const nextIndex = listboxNavigationIndex(event, props.options, index);
    if (nextIndex !== null) {
      event.preventDefault();
      props.optionRefs.current[nextIndex]?.focus();
    }
  });
  props.optionRefs.current[index] = button;
  return button;
}

export function usePortaledDropdown(props: PortaledDropdownProps, isOpen: boolean) {
  const {
    closeAndRestoreFocus,
    menuClassName,
    menuId,
    menuRef,
    onChangeRef,
    optionRefs,
    options,
    triggerRef,
    value,
  } = props;
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const wrapper = document.createElement('div');
    wrapper.className = 'cedros-pay-admin cedros-data cedros-pay-admin__portaled-dropdown';
    wrapper.dataset.extensionId = 'cedros-pay';
    const menu = document.createElement('div');
    menu.id = menuId;
    menu.className = `cedros-dropdown-menu__content cedros-admin__dropdown-menu ${menuClassName}`.trim();
    menu.setAttribute('role', 'listbox');
    const currentProps = {
      closeAndRestoreFocus,
      menuClassName,
      menuId,
      menuRef,
      onChangeRef,
      optionRefs,
      options,
      triggerRef,
      value,
    };
    options.forEach((option, index) => menu.append(createDropdownOption(option, index, currentProps)));
    menuRef.current = menu;
    wrapper.append(menu);
    document.body.append(wrapper);
    positionPortaledMenu(menu, triggerRef.current);
    return () => {
      wrapper.remove();
      menuRef.current = null;
      optionRefs.current = [];
    };
  }, [
    closeAndRestoreFocus,
    isOpen,
    menuClassName,
    menuId,
    menuRef,
    onChangeRef,
    optionRefs,
    options,
    triggerRef,
    value,
  ]);
}
