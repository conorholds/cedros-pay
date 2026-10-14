import {
  CEDROS_PAY_PAYMENT_SUCCEEDED_EVENT_ID,
  CEDROS_PAY_REFUND_SETTLED_EVENT_ID,
} from './constants';
import type { CedrosExtensionSetupSeedsManifest } from './types';

export const cedrosPaySetupSeeds: CedrosExtensionSetupSeedsManifest = {
  products: [],
  notifications: [
    {
      id: 'cedros-pay:purchase-completed-team-notification',
      displayName: 'Purchase completed notification',
      title: 'Purchase completed',
      description:
        'Requests a team notification route when Cedros Pay completes a purchase.',
      eventId: CEDROS_PAY_PAYMENT_SUCCEEDED_EVENT_ID,
      audience: 'team',
      severity: 'info',
      defaultChannels: ['email'],
      subjectTemplate: 'Cedros Pay purchase completed',
      bodyTemplate:
        'A Cedros Pay purchase completed. Review payment activity in Cedros platform.',
      tags: ['commerce', 'purchases', 'notifications'],
    },
    {
      id: 'cedros-pay:refund-settled-team-notification',
      displayName: 'Refund settled notification',
      title: 'Refund settled',
      description: 'Requests a team notification route when Cedros Pay settles a refund.',
      eventId: CEDROS_PAY_REFUND_SETTLED_EVENT_ID,
      audience: 'team',
      severity: 'info',
      defaultChannels: ['email'],
      subjectTemplate: 'Cedros Pay refund settled',
      bodyTemplate:
        'A Cedros Pay refund settled. Review refund activity in Cedros platform.',
      tags: ['commerce', 'refunds', 'notifications'],
    },
  ],
};
