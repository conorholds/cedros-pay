/**
 * Custom Dropdown Components
 *
 * Reusable dropdown components with fully styled menus.
 */

import { useState, useEffect, useRef } from 'react';
import { Icons } from './icons';

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

// ─────────────────────────────────────────────────────────────────────────────
// Filter Dropdown (for section headers)
// ─────────────────────────────────────────────────────────────────────────────

interface FilterDropdownProps extends BaseDropdownProps {
  placeholder?: string;
}

export function FilterDropdown({ value, onChange, options, placeholder = 'Filter', disabled }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="cedros-admin__dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="cedros-admin__dropdown-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
      >
        <span>{displayLabel}</span>
        <span className={`cedros-admin__dropdown-chevron ${isOpen ? 'cedros-admin__dropdown-chevron--open' : ''}`}>
          {Icons.chevronDown}
        </span>
      </button>
      {isOpen && (
        <div className="cedros-admin__dropdown-menu" role="listbox">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              className={`cedros-admin__dropdown-item ${option.value === value ? 'cedros-admin__dropdown-item--selected' : ''}`}
              onClick={() => {
                if (!option.disabled) {
                  onChange(option.value);
                  setIsOpen(false);
                }
              }}
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
            >
              {option.label}
              {option.value === value && (
                <span className="cedros-admin__dropdown-check">{Icons.check}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Dropdown (for form fields with labels)
// ─────────────────────────────────────────────────────────────────────────────

interface FormDropdownProps extends BaseDropdownProps {
  label: string;
  description?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function FormDropdown({ value, onChange, options, label, description, disabled, className, style }: FormDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || 'Select...';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className={`cedros-admin__field ${className || ''}`} style={style}>
      <label className="cedros-admin__field-label">{label}</label>
      <div className="cedros-admin__dropdown cedros-admin__dropdown--form" ref={dropdownRef}>
        <button
          type="button"
          className="cedros-admin__dropdown-trigger cedros-admin__dropdown-trigger--form"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={disabled}
        >
          <span>{displayLabel}</span>
          <span className={`cedros-admin__dropdown-chevron ${isOpen ? 'cedros-admin__dropdown-chevron--open' : ''}`}>
            {Icons.chevronDown}
          </span>
        </button>
        {isOpen && (
          <div className="cedros-admin__dropdown-menu cedros-admin__dropdown-menu--form" role="listbox">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                className={`cedros-admin__dropdown-item ${option.value === value ? 'cedros-admin__dropdown-item--selected' : ''}`}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
              >
                {option.label}
                {option.value === value && (
                  <span className="cedros-admin__dropdown-check">{Icons.check}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {description && <p className="cedros-admin__field-description">{description}</p>}
    </div>
  );
}
