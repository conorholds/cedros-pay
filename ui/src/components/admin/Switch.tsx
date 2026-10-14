/**
 * Switch
 *
 * Shared toggle switch primitive (shadcn-style pill with sliding thumb).
 * Controlled: `checked` in, `onCheckedChange` out.
 */

import { m } from 'motion/react';
import { interactiveSpring } from '../../motion/presets';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
  /** Id of the row hint, so the reason for a state reaches assistive tech. */
  'aria-describedby'?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: SwitchProps) {
  return (
    <m.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      onClick={() => onCheckedChange(!checked)}
      disabled={disabled}
      className={`cedros-admin__switch ${checked ? 'cedros-admin__switch--checked' : ''}`}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={interactiveSpring}
    >
      <m.span
        className="cedros-admin__switch-thumb"
        animate={{ x: checked ? 20 : 0 }}
        transition={interactiveSpring}
      />
    </m.button>
  );
}
