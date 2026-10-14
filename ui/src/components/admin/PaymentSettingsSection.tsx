/**
 * Payment Settings Section
 *
 * Combined settings page for all payment methods:
 * - Stripe Checkout
 * - Crypto (x402/Solana payments)
 * - Credits (Cedros Pay-owned ledger; optionally summarized by Cedros Balance)
 * - Content gates (tipping and paywall defaults)
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { SingleCategorySettings } from './SingleCategorySettings';
import { ContentSettingsSection } from './ContentSettingsSection';
import { PayHubOverviewSection } from './PayHubOverviewSection';
import { RegionalPaymentMethodsSection } from './RegionalPaymentMethodsSection';
import {
  addAdminTabRouteListener,
  pushAdminTabRoute,
  readAdminTabRoute,
} from './adminTabRouting';
import type { SectionProps } from './types';
import { axisVariants, layoutSpring, opacityTransition } from '../../motion/presets';

type PaymentTab =
  | 'overview'
  | 'availability'
  | 'stripe'
  | 'crypto'
  | 'credits'
  | 'content'
  | 'app_stores';

type PaymentTabConfig = {
  id: PaymentTab;
  label: string;
  category?: string;
  description?: ReactNode;
  /** Config field driven by the header on/off switch (default: 'enabled'). */
  enabledField?: string;
  /** Boolean fields also switched on alongside enabledField. */
  enableImplies?: string[];
};

const TABS: PaymentTabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
  },
  {
    id: 'availability',
    label: 'Availability',
  },
  {
    id: 'stripe',
    label: 'Stripe',
    category: 'stripe',
    description: 'Accept payments through Stripe Checkout.',
  },
  {
    id: 'crypto',
    label: 'Crypto',
    category: 'x402',
    description: 'Accept USDC and other Solana tokens, paid straight to your wallet.',
  },
  {
    id: 'credits',
    label: 'Credits',
    category: 'cedros_login',
    description:
      'Let signed-in users pay with credits held in the Cedros Pay ledger.',
    // The server still stores the Pay-side credits flag in the cedros_login category.
    enabledField: 'credits_enabled',
    enableImplies: ['enabled'],
  },
  {
    id: 'content',
    label: 'Content',
  },
  {
    id: 'app_stores',
    label: 'App stores',
    category: 'native_store',
    description: 'Verify Apple App Store and Google Play purchases and keep them in sync.',
  },
];

const PAY_HUB_ROUTE_SECTION_ID = 'settings-hub';
const PAYMENT_TAB_ALIASES: Partial<Record<string, PaymentTab>> = {
  'payment-settings': 'stripe',
};
const PAYMENT_TAB_IDS: readonly PaymentTab[] = TABS.map((tab) => tab.id);

function resolvePaymentTab(defaultTabId: string | undefined): PaymentTab {
  const aliasedTab = defaultTabId ? PAYMENT_TAB_ALIASES[defaultTabId] : undefined;
  if (aliasedTab) return aliasedTab;
  if (TABS.some((tab) => tab.id === defaultTabId)) {
    return defaultTabId as PaymentTab;
  }
  return 'overview';
}

interface PaymentTabsProps {
  activeTab: PaymentTab;
  listId: string;
  onSelect: (tab: PaymentTab) => void;
}

function resolveKeyboardTab(activeTab: PaymentTab, key: string): PaymentTab | null {
  const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
  if (currentIndex < 0) return null;

  switch (key) {
    case 'ArrowRight':
      return TABS[(currentIndex + 1) % TABS.length].id;
    case 'ArrowLeft':
      return TABS[(currentIndex - 1 + TABS.length) % TABS.length].id;
    case 'Home':
      return TABS[0].id;
    case 'End':
      return TABS[TABS.length - 1].id;
    default:
      return null;
  }
}

interface PaymentTabButtonProps {
  activeTab: PaymentTab;
  listId: string;
  onSelect: (tab: PaymentTab, opts?: { focus?: boolean }) => void;
  setTabRef: (tab: PaymentTab, node: HTMLButtonElement | null) => void;
  tab: PaymentTabConfig;
}

function PaymentTabButton({
  activeTab,
  listId,
  onSelect,
  setTabRef,
  tab,
}: PaymentTabButtonProps) {
  const isActive = activeTab === tab.id;
  return (
    <button
      ref={(node) => setTabRef(tab.id, node)}
      type="button"
      role="tab"
      id={`${listId}-tab-${tab.id}`}
      aria-selected={isActive}
      aria-controls={`${listId}-panel-${tab.id}`}
      tabIndex={isActive ? 0 : -1}
      className={`cedros-data-tabs__tab cedros-admin__tab ${isActive ? 'cedros-admin__tab--active' : ''}`}
      onClick={() => onSelect(tab.id)}
    >
      {tab.label}
    </button>
  );
}

function PaymentTabs({ activeTab, listId, onSelect }: PaymentTabsProps) {
  const tabRefs = useRef<Map<PaymentTab, HTMLButtonElement>>(new Map());

  const selectTab = useCallback(
    (tabId: PaymentTab, opts: { focus?: boolean } = {}) => {
      onSelect(tabId);
      if (opts.focus) {
        const node = tabRefs.current.get(tabId);
        if (node) queueMicrotask(() => node.focus());
      }
    },
    [onSelect]
  );

  const setTabRef = useCallback((tab: PaymentTab, node: HTMLButtonElement | null) => {
    if (node) tabRefs.current.set(tab, node);
    else tabRefs.current.delete(tab);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const nextTab = resolveKeyboardTab(activeTab, event.key);
      if (!nextTab) return;

      event.preventDefault();
      selectTab(nextTab, { focus: true });
    },
    [activeTab, selectTab]
  );

  return (
    <div
      className="cedros-data-tabs cedros-data-tabs__list cedros-admin__tabs cedros-admin__tabs--line"
      role="tablist"
      aria-label="Payment settings"
      onKeyDown={handleKeyDown}
    >
      {TABS.map((tab) => (
        <PaymentTabButton
          key={tab.id}
          activeTab={activeTab}
          listId={listId}
          onSelect={selectTab}
          setTabRef={setTabRef}
          tab={tab}
        />
      ))}
    </div>
  );
}

interface PaymentTabPanelContentProps {
  activeTab: PaymentTab;
  authManager?: SectionProps['authManager'];
  currentTab: PaymentTabConfig;
  locale?: string;
  persistenceScope?: string;
  serverUrl: string;
}

function PaymentTabPanelContent({
  activeTab,
  authManager,
  currentTab,
  locale,
  persistenceScope,
  serverUrl,
}: PaymentTabPanelContentProps) {
  if (activeTab === 'overview') {
    return (
      <PayHubOverviewSection
        serverUrl={serverUrl}
        authManager={authManager}
        locale={locale}
        persistenceScope={persistenceScope}
      />
    );
  }

  if (activeTab === 'content') {
    return (
      <ContentSettingsSection
        serverUrl={serverUrl}
        authManager={authManager}
        showPageHeader={false}
      />
    );
  }

  if (activeTab === 'availability') {
    return <RegionalPaymentMethodsSection serverUrl={serverUrl} authManager={authManager} />;
  }

  if (activeTab === 'credits') {
    return (
      <SingleCategorySettings
        key="credits"
        serverUrl={serverUrl}
        authManager={authManager}
        category="cedros_login"
        title="Credits"
        description="Let signed-in users pay with credits held in the Cedros Pay ledger."
        enabledField="credits_enabled"
        enableImplies={['enabled']}
        showEnabledToggle={true}
        hideActions={true}
        hideEditor={true}
        setupNote="Cedros Pay owns credit balances. Cedros Balance may consume read-only summaries when installed."
      />
    );
  }

  return (
    <>
      {currentTab.category && (
        <SingleCategorySettings
          key={currentTab.category}
          serverUrl={serverUrl}
          authManager={authManager}
          category={currentTab.category}
          title={currentTab.label}
          description={currentTab.description}
          enabledField={currentTab.enabledField}
          enableImplies={currentTab.enableImplies}
          showEnabledToggle={true}
        />
      )}
    </>
  );
}

export function PaymentSettingsSection({
  serverUrl,
  authManager,
  defaultTabId,
  locale,
  persistenceScope,
}: SectionProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>(() =>
    readAdminTabRoute(PAY_HUB_ROUTE_SECTION_ID, PAYMENT_TAB_IDS, PAYMENT_TAB_ALIASES) ??
    resolvePaymentTab(defaultTabId)
  );
  const [direction, setDirection] = useState(0);
  const reduceMotion = useReducedMotion() === true;
  const tabsListId = useId();

  useEffect(() => {
    const nextTab =
      readAdminTabRoute(PAY_HUB_ROUTE_SECTION_ID, PAYMENT_TAB_IDS, PAYMENT_TAB_ALIASES) ??
      resolvePaymentTab(defaultTabId);
    if (nextTab !== activeTab) {
      setDirection(Math.sign(
        TABS.findIndex((tab) => tab.id === nextTab) -
        TABS.findIndex((tab) => tab.id === activeTab)
      ));
      setActiveTab(nextTab);
    }
  }, [activeTab, defaultTabId]);

  useEffect(() => {
    return addAdminTabRouteListener(() => {
      const nextTab = readAdminTabRoute(
        PAY_HUB_ROUTE_SECTION_ID,
        PAYMENT_TAB_IDS,
        PAYMENT_TAB_ALIASES
      );
      const resolvedTab = nextTab ?? resolvePaymentTab(defaultTabId);
      setDirection(Math.sign(
        TABS.findIndex((tab) => tab.id === resolvedTab) -
        TABS.findIndex((tab) => tab.id === activeTab)
      ));
      setActiveTab(resolvedTab);
    });
  }, [activeTab, defaultTabId]);

  const selectTab = useCallback((tab: PaymentTab) => {
    setDirection(Math.sign(
      TABS.findIndex((item) => item.id === tab) -
      TABS.findIndex((item) => item.id === activeTab)
    ));
    setActiveTab(tab);
    pushAdminTabRoute(PAY_HUB_ROUTE_SECTION_ID, tab);
  }, [activeTab]);

  const currentTab = TABS.find((t) => t.id === activeTab)!;
  const axisMotion = { direction, reduced: reduceMotion };

  return (
    <div className="cedros-data-stack cedros-admin__payment-settings">
      <div className="cedros-admin__page-header cedros-data__header">
        <div className="cedros-data__header-text">
          <h2 className="cedros-admin__page-title cedros-data__title">Pay hub</h2>
          <p className="cedros-admin__page-description cedros-data__subtitle">
            Configure the payment rails Cedros can use across web, iOS, Android, and crypto flows.
          </p>
        </div>
      </div>

      <PaymentTabs
        activeTab={activeTab}
        listId={tabsListId}
        onSelect={selectTab}
      />

      <div className="cedros-admin__axis-viewport">
        <AnimatePresence custom={axisMotion} initial={false} mode="wait">
          <m.div
            key={activeTab}
            custom={axisMotion}
            className="cedros-data-tabs__panel cedros-admin__payment-settings-body"
            role="tabpanel"
            id={`${tabsListId}-panel-${activeTab}`}
            aria-labelledby={`${tabsListId}-tab-${activeTab}`}
            tabIndex={0}
            variants={axisVariants}
            initial={reduceMotion ? false : 'enter'}
            animate="center"
            exit="exit"
            transition={{ x: layoutSpring, opacity: opacityTransition }}
          >
            <PaymentTabPanelContent
              activeTab={activeTab}
              authManager={authManager}
              currentTab={currentTab}
              locale={locale}
              persistenceScope={persistenceScope}
              serverUrl={serverUrl}
            />
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
