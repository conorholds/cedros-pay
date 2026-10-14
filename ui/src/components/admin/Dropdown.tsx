/**
 * Custom Dropdown Components
 *
 * Reusable dropdown components with fully styled menus.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { Icons } from './icons';
import {
  nextEnabledIndex,
  useDropdownPosition,
  useLatestRef,
  usePortaledDropdown,
} from './usePortaledDropdown';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface BaseDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  disabled?: boolean;
}

interface DropdownControlProps extends BaseDropdownProps {
  displayLabel: string;
  className: string;
  triggerClassName?: string;
  menuClassName?: string;
  /** Accessible name for the trigger when only a sibling visual label exists. */
  ariaLabel?: string;
  /** id of a visible label element to name the trigger (takes precedence over ariaLabel). */
  ariaLabelledBy?: string;
}

function useDropdownState() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!dropdownRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const closeAndRestoreFocus = useCallback(() => {
    setIsOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);

  return { isOpen, setIsOpen, closeAndRestoreFocus, dropdownRef, menuRef, triggerRef };
}

interface DropdownTriggerProps {
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className: string;
  disabled?: boolean;
  displayLabel: string;
  isOpen: boolean;
  menuId: string;
  onClose: () => void;
  onOpen: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
}

function DropdownTrigger(props: DropdownTriggerProps) {
  const { ariaLabel, ariaLabelledBy, className, disabled, displayLabel, isOpen } = props;
  return (
    <button
      ref={props.triggerRef}
      type="button"
      className={`cedros-data-select cedros-admin__dropdown-trigger ${className}`.trim()}
      onClick={() => (isOpen ? props.onClose() : props.onOpen())}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-controls={isOpen ? props.menuId : undefined}
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          props.onOpen();
        } else if (event.key === 'Escape' && isOpen) {
          event.preventDefault();
          props.onClose();
        }
      }}
    >
      <span>{displayLabel}</span>
      <span className={`cedros-admin__dropdown-chevron ${isOpen ? 'cedros-admin__dropdown-chevron--open' : ''}`}>
        {Icons.chevronDown}
      </span>
    </button>
  );
}

function DropdownControl({
  value,
  onChange,
  options,
  disabled,
  displayLabel,
  className,
  triggerClassName = '',
  menuClassName = '',
  ariaLabel,
  ariaLabelledBy,
}: DropdownControlProps) {
  const state = useDropdownState();
  const menuId = useId();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const onChangeRef = useLatestRef(onChange);
  const portalProps = {
    closeAndRestoreFocus: state.closeAndRestoreFocus,
    menuClassName,
    menuId,
    menuRef: state.menuRef,
    onChangeRef,
    options,
    optionRefs,
    triggerRef: state.triggerRef,
    value,
  };
  usePortaledDropdown(portalProps, state.isOpen);
  useDropdownPosition(state.isOpen, state.triggerRef, state.menuRef);

  useEffect(() => {
    if (!state.isOpen) return;
    const selected = Math.max(0, options.findIndex((option) => option.value === value));
    const index = nextEnabledIndex(options, selected, 1);
    queueMicrotask(() => optionRefs.current[index]?.focus());
  }, [state.isOpen, options, value]);

  return (
    <div className={`cedros-dropdown-menu ${className}`.trim()} ref={state.dropdownRef}>
      <DropdownTrigger
        ariaLabel={ariaLabel}
        ariaLabelledBy={ariaLabelledBy}
        className={triggerClassName}
        disabled={disabled}
        displayLabel={displayLabel}
        isOpen={state.isOpen}
        menuId={menuId}
        onClose={state.closeAndRestoreFocus}
        onOpen={() => state.setIsOpen(true)}
        triggerRef={state.triggerRef}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Dropdown (for section headers)
// ─────────────────────────────────────────────────────────────────────────────

interface FilterDropdownProps extends BaseDropdownProps {
  placeholder?: string;
  ariaLabel?: string;
}

export function FilterDropdown({ value, onChange, options, placeholder = 'Filter', disabled, ariaLabel }: FilterDropdownProps) {
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  return (
    <DropdownControl
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      displayLabel={displayLabel}
      className="cedros-admin__dropdown"
      ariaLabel={ariaLabel}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Dropdown (for form fields with labels)
// ─────────────────────────────────────────────────────────────────────────────

interface FormDropdownProps extends BaseDropdownProps {
  label: string;
  description?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function FormDropdown({ value, onChange, options, label, description, disabled, className, style }: FormDropdownProps) {
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || 'Select an option';
  const labelId = useId();

  return (
    <div className={`cedros-admin__field ${className || ''}`} style={style}>
      <label id={labelId} className="cedros-data-label cedros-admin__field-label">{label}</label>
      <DropdownControl
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        displayLabel={displayLabel}
        className="cedros-admin__dropdown cedros-admin__dropdown--form"
        triggerClassName="cedros-admin__dropdown-trigger--form"
        menuClassName="cedros-admin__dropdown-menu--form"
        ariaLabelledBy={labelId}
      />
      {description && <p className="cedros-admin__field-description">{description}</p>}
    </div>
  );
}
