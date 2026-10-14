import type { SubscriptionSettings } from './types';

export const DEFAULT_SUBSCRIPTION_SETTINGS: SubscriptionSettings = {
  enabled: true,
  plans: [],
  pageTitle: 'Choose Your Plan',
  pageSubtitle: 'Select the plan that best fits your needs.',
  annualSavingsBadge: '2 months free',
  popularBadgeText: 'Best Deal',
  footerNotice: '',
};

export type SubscriptionPageSettings = Pick<
  SubscriptionSettings,
  'enabled' | 'pageTitle' | 'pageSubtitle' | 'annualSavingsBadge' | 'popularBadgeText' | 'footerNotice'
>;

export type SubscriptionPageCopySettings = Omit<SubscriptionPageSettings, 'enabled'>;

export function readSubscriptionPageSettings(
  settings: Partial<SubscriptionSettings>
): SubscriptionPageSettings {
  return {
    enabled: settings.enabled ?? DEFAULT_SUBSCRIPTION_SETTINGS.enabled,
    pageTitle: settings.pageTitle ?? DEFAULT_SUBSCRIPTION_SETTINGS.pageTitle,
    pageSubtitle: settings.pageSubtitle ?? DEFAULT_SUBSCRIPTION_SETTINGS.pageSubtitle,
    annualSavingsBadge:
      settings.annualSavingsBadge ?? DEFAULT_SUBSCRIPTION_SETTINGS.annualSavingsBadge,
    popularBadgeText: settings.popularBadgeText ?? DEFAULT_SUBSCRIPTION_SETTINGS.popularBadgeText,
    footerNotice: settings.footerNotice ?? DEFAULT_SUBSCRIPTION_SETTINGS.footerNotice,
  };
}

export function readSubscriptionPageCopySettings(
  settings: Partial<SubscriptionSettings>
): SubscriptionPageCopySettings {
  const page = readSubscriptionPageSettings(settings);
  return {
    pageTitle: page.pageTitle,
    pageSubtitle: page.pageSubtitle,
    annualSavingsBadge: page.annualSavingsBadge,
    popularBadgeText: page.popularBadgeText,
    footerNotice: page.footerNotice,
  };
}
