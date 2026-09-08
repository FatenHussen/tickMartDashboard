import type { TFunction } from 'i18next';
import type {
  NavMenuItem,
  NavMenuItemType,
  NavMenuRouteKey,
  NavMenuRouteKeyOption,
} from '../types';

import { formatTranslated } from '@/utils/format-translated';

import { NAV_MENU_ITEM_TYPES, NAV_MENU_ROUTE_KEYS } from '../types';

// ----------------------------------------------------------------------

type TableT = TFunction<'table'>;

const TYPE_LABEL_KEY: Record<NavMenuItemType, string> = {
  route: 'form.navMenuTypeRoute',
  category: 'form.navMenuTypeCategory',
  brand: 'form.navMenuTypeBrand',
  page: 'form.navMenuTypePage',
  url: 'form.navMenuTypeUrl',
};

/** Admin-friendly names for the fixed app screens (never show the raw `route_key`). */
const ROUTE_KEY_LABEL_KEY: Record<NavMenuRouteKey, string> = {
  home: 'form.navMenuRouteHome',
  categories: 'form.navMenuRouteCategories',
  brands: 'form.navMenuRouteBrands',
  shops: 'form.navMenuRouteShops',
  baskets: 'form.navMenuRouteBaskets',
  schedules: 'form.navMenuRouteSchedules',
  points: 'form.navMenuRoutePoints',
  help: 'form.navMenuRouteHelp',
  subscriptions: 'form.navMenuRouteSubscriptions',
};

export function navMenuTypeLabel(type: string | null | undefined, t: TableT): string {
  const key = TYPE_LABEL_KEY[type as NavMenuItemType];
  return key ? t(key) : String(type ?? '');
}

export function navMenuRouteKeyLabel(routeKey: string | null | undefined, t: TableT): string {
  const key = ROUTE_KEY_LABEL_KEY[routeKey as NavMenuRouteKey];
  return key ? t(key) : String(routeKey ?? '');
}

export function navMenuTypeOptions(t: TableT): Array<{ value: string; label: string }> {
  return NAV_MENU_ITEM_TYPES.map((type) => ({ value: type, label: navMenuTypeLabel(type, t) }));
}

export function navMenuRouteKeyOptions(t: TableT): Array<{ value: string; label: string }> {
  return NAV_MENU_ROUTE_KEYS.map((key) => ({ value: key, label: navMenuRouteKeyLabel(key, t) }));
}

/**
 * Dropdown for `type=route`. Prefers labels from `GET /api/admin/nav-menu-items/route-keys`
 * (so `schedules` and future screens appear without another dashboard release) and keeps the
 * built-in list as fallback / fill-in when the endpoint is empty or incomplete.
 */
export function navMenuRouteKeySelectOptions(
  t: TableT,
  fromApi?: NavMenuRouteKeyOption[] | null
): Array<{ value: string; label: string }> {
  const fallback = navMenuRouteKeyOptions(t);
  if (!fromApi?.length) return fallback;

  const seen = new Set<string>();
  const options: Array<{ value: string; label: string }> = [];

  for (const item of fromApi) {
    const key = item.key?.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    options.push({
      value: key,
      label: formatTranslated(item.label, '') || navMenuRouteKeyLabel(key, t),
    });
  }

  for (const opt of fallback) {
    if (seen.has(opt.value)) continue;
    seen.add(opt.value);
    options.push(opt);
  }

  return options;
}

/** First non-empty of a relation's `name` / `title`, whichever the API sent. */
function relationLabel(relation: NavMenuItem['category']): string {
  if (!relation) return '';
  const fromName = formatTranslated(relation.name as Parameters<typeof formatTranslated>[0], '');
  if (fromName) return fromName;
  const fromTitle = formatTranslated(relation.title as Parameters<typeof formatTranslated>[0], '');
  if (fromTitle) return fromTitle;
  return relation.slug?.trim() ?? '';
}

/** Human-readable destination for the list column: "My baskets", "Electronics", the URL… */
export function navMenuTargetLabel(item: NavMenuItem, t: TableT): string {
  const target = item.target ?? {};

  switch (item.type) {
    case 'route':
      return navMenuRouteKeyLabel(item.route_key ?? target.route_key, t);
    case 'category': {
      const id = item.category_id ?? target.category_id;
      return (
        relationLabel(item.category) || (target.name?.trim() ?? '') || (id != null ? `#${id}` : '')
      );
    }
    case 'brand': {
      const id = item.brand_id ?? target.brand_id;
      return (
        relationLabel(item.brand) || (target.name?.trim() ?? '') || (id != null ? `#${id}` : '')
      );
    }
    case 'page': {
      const id = item.page_id ?? target.page_id;
      return (
        relationLabel(item.page) || (target.slug?.trim() ?? '') || (id != null ? `#${id}` : '')
      );
    }
    case 'url':
      return (item.url ?? target.url ?? '').trim();
    default:
      return '';
  }
}

/** Localized item title, whether the API returns `{ ar, en }` or a single-language string. */
export function navMenuItemTitle(item: NavMenuItem): string {
  return formatTranslated(item.title as Parameters<typeof formatTranslated>[0], '');
}
