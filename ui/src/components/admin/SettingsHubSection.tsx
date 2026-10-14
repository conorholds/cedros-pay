/**
 * Pay hub section
 *
 * Extension Settings sidebar entry for Pay-owned payment options.
 */

import { PaymentSettingsSection } from './PaymentSettingsSection';
import type { SectionProps } from './types';

export function SettingsHubSection(props: SectionProps) {
  return <PaymentSettingsSection {...props} />;
}
