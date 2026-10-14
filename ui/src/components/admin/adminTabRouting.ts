import {
  CEDROS_PAY_ADMIN_MODULE_ID,
  CEDROS_PAY_EXTENSION_ID,
} from '../../extension/constants';

const SECTION_PARAM = 'cedrosPaySectionId';
const TAB_PARAM = 'cedrosPayTabId';
const LEGACY_SECTION_PARAM = 'cedrosPaySection';
const LEGACY_TAB_PARAM = 'cedrosPayTab';

type TabAliases<T extends string> = Partial<Record<string, T>>;

function browserWindow(): Window | null {
  return typeof window === 'undefined' ? null : window;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function qualifiedPayId(value: string): string {
  return `${CEDROS_PAY_EXTENSION_ID}:${value}`;
}

export function adminSectionHref(sectionId: string, tabId: string): string {
  if (sectionId === 'settings-hub') {
    if (tabId === 'overview') return '/admin/settings/hub';
    const params = new URLSearchParams({
      [SECTION_PARAM]: qualifiedPayId(sectionId),
      [TAB_PARAM]: qualifiedPayId(tabId),
    });
    return `/admin/settings/hub?${params}`;
  }

  const sectionRouteId = `${CEDROS_PAY_ADMIN_MODULE_ID}:${qualifiedPayId(sectionId)}`;
  return `/admin/${sectionRouteId}/${tabId}`;
}

function localPayId(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const separator = value.indexOf(':');
  if (separator === -1) return value;
  return value.slice(0, separator) === CEDROS_PAY_EXTENSION_ID
    ? value.slice(separator + 1)
    : undefined;
}

function readRouteParams(url: URL) {
  return {
    sectionId: url.searchParams.get(SECTION_PARAM) ?? url.searchParams.get(LEGACY_SECTION_PARAM),
    tabId: url.searchParams.get(TAB_PARAM) ?? url.searchParams.get(LEGACY_TAB_PARAM),
  };
}

function resolveTabId<T extends string>(
  rawTabId: string | undefined,
  tabIds: readonly T[],
  aliases: TabAliases<T> = {}
): T | undefined {
  if (!rawTabId) return undefined;
  const localTabId = localPayId(rawTabId);
  if (!localTabId) return undefined;
  if ((tabIds as readonly string[]).includes(localTabId)) return localTabId as T;
  return aliases[localTabId];
}

export function readAdminTabRoute<T extends string>(
  routeSectionId: string | undefined,
  tabIds: readonly T[],
  aliases: TabAliases<T> = {}
): T | undefined {
  const win = browserWindow();
  if (!win || !routeSectionId) return undefined;
  const url = new URL(win.location.href);
  const { sectionId, tabId } = readRouteParams(url);
  const localSectionId = localPayId(sectionId);
  if (localSectionId && localSectionId !== routeSectionId) return undefined;
  return resolveTabId(tabId ?? undefined, tabIds, aliases);
}

export function pushAdminTabRoute(routeSectionId: string | undefined, tabId: string) {
  const win = browserWindow();
  if (!win || !routeSectionId) return;

  const url = new URL(win.location.href);
  const currentTabId = readAdminTabRoute(routeSectionId, [tabId]);
  if (currentTabId === tabId) return;

  const sectionId = qualifiedPayId(routeSectionId);
  const qualifiedTabId = qualifiedPayId(tabId);
  url.searchParams.set(SECTION_PARAM, sectionId);
  url.searchParams.set(TAB_PARAM, qualifiedTabId);
  url.searchParams.delete(LEGACY_SECTION_PARAM);
  url.searchParams.delete(LEGACY_TAB_PARAM);

  const existingState = readRecord(win.history.state);
  const existingPluginData = readRecord(existingState.pluginData);
  const route = {
    moduleId: CEDROS_PAY_ADMIN_MODULE_ID,
    sectionId,
    tabId: qualifiedTabId,
    defaultTabId: qualifiedTabId,
  };
  win.history.pushState(
    {
      ...existingState,
      route,
      currentRoute: route,
      pluginData: {
        ...existingPluginData,
        sectionId,
        tabId: qualifiedTabId,
        defaultTabId: qualifiedTabId,
      },
    },
    '',
    `${url.pathname}${url.search}${url.hash}`
  );
}

export function addAdminTabRouteListener(
  onRouteChange: () => void
): (() => void) | undefined {
  const win = browserWindow();
  if (!win) return undefined;
  win.addEventListener('popstate', onRouteChange);
  return () => win.removeEventListener('popstate', onRouteChange);
}
