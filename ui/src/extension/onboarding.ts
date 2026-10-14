import {
  CEDROS_PAY_ADMIN_MODULE_ID,
  CEDROS_PAY_PAYMENT_ONBOARDING_ID,
} from './constants';
import type { CedrosExtensionOnboardingPageManifest } from './types';

export const cedrosPayOnboardingPages: CedrosExtensionOnboardingPageManifest[] = [
  {
    id: CEDROS_PAY_PAYMENT_ONBOARDING_ID,
    displayName: 'Configure Payments',
    moduleId: CEDROS_PAY_ADMIN_MODULE_ID,
    sectionId: 'cedros-pay:settings-hub',
    description: 'Set up a payment method, add a product, and activate checkout.',
  },
];
