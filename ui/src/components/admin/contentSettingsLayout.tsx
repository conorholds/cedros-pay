/**
 * Shared layout shells for the Content settings cards.
 *
 * ContentCard mirrors the Pay hub rail pattern (SingleCategorySettings): the
 * on/off switch sits in the card header and the body collapses to a muted
 * off-note when the feature is off. Edits autosave (debounced); a small inline
 * indicator in the header reports save status — there is no Save button.
 */

import { useId, useState, type ReactNode } from 'react';
import { AutosaveStatusIndicator } from '../../autosave';
import { Icons } from './icons';
import { Switch } from './Switch';
import type { AutosaveStatus } from './useAutosave';
import { AnimatedDisclosure } from './AnimatedDisclosure';

function AutosaveLabel({ status }: { status: AutosaveStatus }) {
  return (
    <AutosaveStatusIndicator
      status={status}
      className={`cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${statusClass(status)}`}
    />
  );
}

function statusClass(status: AutosaveStatus): string {
  if (status === 'failed') return 'error';
  return status;
}

export function ContentCard({
  title,
  description,
  enabled,
  onToggleEnabled,
  offNote,
  disabledNote,
  toggleDisabled = false,
  status,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  offNote: string;
  disabledNote?: string;
  toggleDisabled?: boolean;
  status: AutosaveStatus;
  children: ReactNode;
}) {
  const isOn = enabled && !toggleDisabled;
  const inactiveNote = toggleDisabled ? (disabledNote ?? offNote) : offNote;

  return (
    <div className="cedros-data-card cedros-admin__section cedros-admin__payment-card cedros-admin__content-settings-card">
      <div className="cedros-data-card__header cedros-admin__section-header cedros-admin__payment-card-header">
        <div className="cedros-admin__payment-card-heading">
          <h3 className="cedros-data-card__title cedros-admin__section-title">{title}</h3>
          <p className="cedros-admin__text-muted cedros-admin__payment-card-description">
            {description}
          </p>
        </div>
        <div className="cedros-admin__payment-toggle-row">
          <AutosaveLabel status={status} />
          <span className="cedros-admin__payment-toggle-label">{isOn ? 'On' : 'Off'}</span>
          <Switch
            checked={isOn}
            onCheckedChange={onToggleEnabled}
            disabled={toggleDisabled}
            aria-label={`Turn ${title} on or off`}
          />
        </div>
      </div>

      <AnimatedDisclosure open={isOn}>
        <div className="cedros-admin__config-fields">{children}</div>
      </AnimatedDisclosure>
      <AnimatedDisclosure open={!isOn}>
        <div className="cedros-admin__payment-off-note">{inactiveNote}</div>
      </AnimatedDisclosure>
    </div>
  );
}

/** Per-card collapsible holding rarely-needed, technical fields. Collapsed by default. */
export function AdvancedDetails({
  children,
  label = 'Advanced',
}: {
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  return (
    <div className="cedros-admin__advanced">
      <button
        type="button"
        className="cedros-admin__advanced-summary"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="cedros-admin__advanced-chevron">{Icons.chevronRight}</span>
        {label}
      </button>
      <AnimatedDisclosure open={open}>
        <div id={regionId} className="cedros-admin__advanced-body">{children}</div>
      </AnimatedDisclosure>
    </div>
  );
}
