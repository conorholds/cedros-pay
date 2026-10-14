/**
 * Tabbed Hub Section
 *
 * Wraps multiple sub-section components behind a single sidebar entry,
 * exposing them as tabs. Used by Catalog, Transactions, and Settings umbrellas
 * to keep closely related workflows on one sidebar page.
 *
 * Tabs follow the WAI-ARIA Authoring Practices tabs pattern:
 *  - tablist + tab + tabpanel roles with aria-controls / aria-labelledby
 *  - manual activation (Enter / Space activates a focused tab)
 *  - roving tabindex + arrow / Home / End keyboard navigation
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import type { SectionProps } from './types';
import { axisVariants, layoutSpring, opacityTransition } from '../../motion/presets';
import {
  addAdminTabRouteListener,
  pushAdminTabRoute,
  readAdminTabRoute,
} from './adminTabRouting';

export interface HubTab {
  /** Stable tab identifier — also used as React key for the tab body */
  id: string;
  label: string;
  /** Optional page title shown when this tab is active; falls back to section title. */
  title?: string;
  /** Optional page description shown when this tab is active; falls back to section description. */
  description?: string;
  Component: ComponentType<SectionProps>;
}

export interface TabbedHubSectionProps extends SectionProps {
  tabs: HubTab[];
  /** Optional page title rendered above the tab navigation */
  title?: string;
  /** Optional page description rendered below the title and above the tab navigation */
  description?: string;
  /** Optional default tab ID; falls back to first tab when missing or unknown */
  defaultTabId?: string;
  /** Section route ID used to persist tab changes into browser history. */
  routeSectionId?: string;
  /** Optional callback fired whenever the active tab changes */
  onTabChange?: (tabId: string) => void;
}

/**
 * Picks the tab set a hub may safely paint.
 *
 * Gated tabs are driven by an async visibility read whose defaults are
 * "everything on". Committing to that guess paints workflows that then vanish
 * a frame later, so while the read is pending a hub shows only the tabs it
 * already knows are permanent — plus the routed tab, so a deep link never
 * lands on the wrong panel. Tabs are therefore only ever added, never removed.
 */
export function resolveHubTabs(
  tabs: HubTab[],
  options: {
    pending: boolean;
    routeSectionId?: string;
    isVisible: (tabId: string) => boolean;
    isGated: (tabId: string) => boolean;
  }
): HubTab[] {
  const { pending, routeSectionId, isVisible, isGated } = options;
  if (!pending) return tabs.filter((tab) => isVisible(tab.id));
  const routedTabId = readAdminTabRoute(routeSectionId, tabs.map((tab) => tab.id));
  return tabs.filter((tab) => !isGated(tab.id) || tab.id === routedTabId);
}

function resolveInitialTabId(
  tabs: HubTab[],
  defaultTabId: string | undefined,
  routeSectionId: string | undefined
): string {
  const tabIds = tabs.map((tab) => tab.id);
  const routedTabId = readAdminTabRoute(routeSectionId, tabIds);
  if (routedTabId) return routedTabId;
  if (defaultTabId && tabs.some((tab) => tab.id === defaultTabId)) {
    return defaultTabId;
  }
  return tabs[0]?.id ?? '';
}

export function TabbedHubSection({
  tabs,
  title,
  description,
  defaultTabId,
  routeSectionId,
  onTabChange,
  ...sectionProps
}: TabbedHubSectionProps): ReactNode {
  const [activeTabId, setActiveTabId] = useState<string>(() =>
    resolveInitialTabId(tabs, defaultTabId, routeSectionId)
  );
  const [direction, setDirection] = useState(0);
  const [isDetailView, setIsDetailView] = useState(false);
  const reduceMotion = useReducedMotion() === true;
  const tabsListId = useId();
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Follow parent route hints and browser back/forward route changes.
  useEffect(() => {
    if (!routeSectionId && !defaultTabId) return;
    const nextTabId = resolveInitialTabId(tabs, defaultTabId, routeSectionId);
    if (nextTabId && nextTabId !== activeTabId) {
      setDirection(Math.sign(
        tabs.findIndex((tab) => tab.id === nextTabId) -
        tabs.findIndex((tab) => tab.id === activeTabId)
      ));
      setIsDetailView(false);
      setActiveTabId(nextTabId);
    }
  }, [defaultTabId, routeSectionId, tabs, activeTabId]);

  useEffect(() => {
    if (!routeSectionId) return undefined;
    return addAdminTabRouteListener(() => {
      const nextTabId = resolveInitialTabId(tabs, defaultTabId, routeSectionId);
      if (nextTabId) {
        setDirection(Math.sign(
          tabs.findIndex((tab) => tab.id === nextTabId) -
          tabs.findIndex((tab) => tab.id === activeTabId)
        ));
        setIsDetailView(false);
        setActiveTabId(nextTabId);
      }
    });
  }, [activeTabId, defaultTabId, routeSectionId, tabs]);

  const selectTab = useCallback(
    (tabId: string, opts: { focus?: boolean } = {}) => {
      setDirection(Math.sign(
        tabs.findIndex((tab) => tab.id === tabId) -
        tabs.findIndex((tab) => tab.id === activeTabId)
      ));
      setActiveTabId(tabId);
      setIsDetailView(false);
      pushAdminTabRoute(routeSectionId, tabId);
      onTabChange?.(tabId);
      if (opts.focus) {
        const node = tabRefs.current.get(tabId);
        // Move focus AFTER React commits the new aria state.
        if (node) queueMicrotask(() => node.focus());
      }
    },
    [activeTabId, onTabChange, routeSectionId, tabs]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      if (currentIndex < 0) return;

      let nextIndex: number | null = null;
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      const nextTab = tabs[nextIndex];
      if (nextTab) selectTab(nextTab.id, { focus: true });
    },
    [tabs, activeTabId, selectTab]
  );

  if (tabs.length === 0) return null;

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  if (!activeTab) return null;
  const ActiveComponent = activeTab.Component;
  const headerTitle = activeTab.title ?? title;
  const headerDescription = activeTab.description ?? description;
  const axisMotion = { direction, reduced: reduceMotion };

  return (
    <div className="cedros-data-stack cedros-admin__hub">
      {!isDetailView && (headerTitle || headerDescription) && (
        <div className="cedros-admin__page-header cedros-data__header">
          <div className="cedros-data__header-text">
            {headerTitle && (
              <h2 className="cedros-admin__page-title cedros-data__title">{headerTitle}</h2>
            )}
            {headerDescription && (
              <p className="cedros-admin__page-description cedros-data__subtitle">
                {headerDescription}
              </p>
            )}
          </div>
        </div>
      )}
      {!isDetailView && (
        <div
          className="cedros-data-tabs cedros-data-tabs__list cedros-admin__tabs cedros-admin__tabs--line"
          role="tablist"
          id={tabsListId}
          onKeyDown={handleKeyDown}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            const tabId = `${tabsListId}-tab-${tab.id}`;
            const panelId = `${tabsListId}-panel-${tab.id}`;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  if (node) tabRefs.current.set(tab.id, node);
                  else tabRefs.current.delete(tab.id);
                }}
                type="button"
                role="tab"
                id={tabId}
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                className={`cedros-data-tabs__tab cedros-admin__tab ${isActive ? 'cedros-admin__tab--active' : ''}`}
                onClick={() => selectTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="cedros-admin__axis-viewport">
        <AnimatePresence custom={axisMotion} initial={false} mode="wait">
          <m.div
            key={activeTab.id}
            custom={axisMotion}
            className="cedros-data-tabs__panel cedros-admin__hub-body"
            role={isDetailView ? undefined : 'tabpanel'}
            id={isDetailView ? undefined : `${tabsListId}-panel-${activeTab.id}`}
            aria-labelledby={isDetailView ? undefined : `${tabsListId}-tab-${activeTab.id}`}
            tabIndex={isDetailView ? undefined : 0}
            variants={axisVariants}
            initial={reduceMotion ? false : 'enter'}
            animate="center"
            exit="exit"
            transition={{ x: layoutSpring, opacity: opacityTransition }}
          >
            <ActiveComponent {...sectionProps} onDetailViewChange={setIsDetailView} />
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
