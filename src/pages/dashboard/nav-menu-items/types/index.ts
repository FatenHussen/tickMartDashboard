// ----------------------------------------------------------------------
// Storefront navigation menu items (`nav_menu_items`) — the public top bar.
// ----------------------------------------------------------------------

/** Destination kind of a nav item. Each kind requires exactly one target field. */
export const NAV_MENU_ITEM_TYPES = ['route', 'category', 'brand', 'page', 'url'] as const;

export type NavMenuItemType = (typeof NAV_MENU_ITEM_TYPES)[number];

/** Fixed app screens the frontends already know how to open (`type=route`). */
export const NAV_MENU_ROUTE_KEYS = [
  'home',
  'categories',
  'brands',
  'shops',
  'baskets',
  'schedules',
  'points',
  'help',
  'subscriptions',
] as const;

export type NavMenuRouteKey = (typeof NAV_MENU_ROUTE_KEYS)[number];

/** Target field name that becomes required for a given `type`. */
export const NAV_MENU_TARGET_FIELD: Record<NavMenuItemType, NavMenuTargetField> = {
  route: 'route_key',
  category: 'category_id',
  brand: 'brand_id',
  page: 'page_id',
  url: 'url',
};

export type NavMenuTargetField = 'route_key' | 'category_id' | 'brand_id' | 'page_id' | 'url';

/** Bilingual value; list endpoints may collapse it to the request-language string. */
export type NavMenuTranslated = string | { ar?: string; en?: string } | null;

/** One row from `GET /api/admin/nav-menu-items/route-keys`. */
export interface NavMenuRouteKeyOption {
  key: string;
  label: NavMenuTranslated;
}

export interface NavMenuRouteKeysResponse {
  status?: boolean;
  message?: string;
  data: NavMenuRouteKeyOption[];
}

/** Resolved destination the frontends navigate with (mirrors `GET /api/user/nav-menu`). */
export interface NavMenuItemTarget {
  route_key?: NavMenuRouteKey | string | null;
  category_id?: number | null;
  brand_id?: number | null;
  page_id?: number | null;
  url?: string | null;
  slug?: string | null;
  /** Label of the resolved category / brand / page, when the API includes it. */
  name?: string | null;
}

export interface NavMenuItemRelationSummary {
  id: number;
  name?: NavMenuTranslated;
  title?: NavMenuTranslated;
  slug?: string;
}

export interface NavMenuItem {
  id: number;
  title: NavMenuTranslated;
  type: NavMenuItemType;
  page_id?: number | null;
  category_id?: number | null;
  brand_id?: number | null;
  url?: string | null;
  route_key?: NavMenuRouteKey | string | null;
  icon?: string | null;
  order: number | null;
  is_active: boolean;
  open_in_new_tab?: boolean;
  target?: NavMenuItemTarget | null;
  page?: NavMenuItemRelationSummary | null;
  category?: NavMenuItemRelationSummary | null;
  brand?: NavMenuItemRelationSummary | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface NavMenuItemPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface NavMenuItemListResponse {
  status: boolean;
  message: string;
  data: {
    items: NavMenuItem[];
    pagination: NavMenuItemPagination;
  };
}

export interface NavMenuItemDetailsResponse {
  status: boolean;
  message: string;
  data: NavMenuItem;
}

export interface NavMenuItemReorderResponse {
  status: boolean;
  message?: string;
  data?: { updated_count?: number } | null;
}

export interface NavMenuItemListQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
}
