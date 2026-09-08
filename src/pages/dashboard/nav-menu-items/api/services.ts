import type {
  NavMenuItem,
  NavMenuItemPagination,
  NavMenuRouteKeyOption,
  NavMenuItemListResponse,
  NavMenuItemReorderResponse,
  NavMenuItemDetailsResponse,
  NavMenuItemListQueryParams,
} from '../types';

import { apiRoutes, axiosInstance } from '@/api';

// ----------------------------------------------------------------------

/**
 * The nav menu endpoint returns the full ordered list as a plain array (it is a short list and
 * `order` matters), but tolerate `{ items, pagination }` / `{ data: [...] }` shapes too.
 */
function normalizeListResponse(raw: any): NavMenuItemListResponse {
  const inner = raw?.data;
  let items: NavMenuItem[] = [];

  if (Array.isArray(inner)) items = inner;
  else if (Array.isArray(inner?.items)) items = inner.items;
  else if (Array.isArray(inner?.data)) items = inner.data;

  const pagination: NavMenuItemPagination = (!Array.isArray(inner) && inner?.pagination) || {
    current_page: 1,
    last_page: 1,
    per_page: items.length,
    total: items.length,
  };

  return {
    status: Boolean(raw?.status),
    message: String(raw?.message ?? ''),
    data: { items, pagination },
  };
}

export const _NavMenuItemApi = {
  getList: async (params?: NavMenuItemListQueryParams): Promise<NavMenuItemListResponse> => {
    const response = await axiosInstance.get(apiRoutes.navMenuItem.list, {
      params: {
        ...(params?.page ? { page: params.page } : {}),
        ...(params?.per_page ? { per_page: params.per_page } : {}),
        ...(params?.search?.trim() ? { search: params.search.trim() } : {}),
      },
    });
    return normalizeListResponse(response.data);
  },

  getById: async (id: number | string): Promise<NavMenuItemDetailsResponse> => {
    const response = await axiosInstance.get<NavMenuItemDetailsResponse>(
      apiRoutes.navMenuItem.details(id)
    );
    return response.data;
  },

  create: async (formData: FormData): Promise<NavMenuItemDetailsResponse> => {
    const response = await axiosInstance.post<NavMenuItemDetailsResponse>(
      apiRoutes.navMenuItem.create,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  /**
   * Laravel cannot read `multipart/form-data` from a real PUT, so the update is POSTed with
   * `_method=PUT` (as documented for this endpoint).
   */
  update: async (id: number | string, formData: FormData): Promise<NavMenuItemDetailsResponse> => {
    if (!formData.has('_method')) formData.append('_method', 'PUT');
    const response = await axiosInstance.post<NavMenuItemDetailsResponse>(
      apiRoutes.navMenuItem.update(id),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  /** Partial JSON update — used by the in-table active switch (no file involved). */
  patch: async (
    id: number | string,
    payload: Record<string, unknown>
  ): Promise<NavMenuItemDetailsResponse> => {
    const response = await axiosInstance.patch<NavMenuItemDetailsResponse>(
      apiRoutes.navMenuItem.update(id),
      payload
    );
    return response.data;
  },

  delete: async (id: number | string): Promise<{ status: boolean; data?: unknown }> => {
    const response = await axiosInstance.delete(apiRoutes.navMenuItem.delete(id));
    return response.data;
  },

  reorder: async (orderedIds: number[]): Promise<NavMenuItemReorderResponse> => {
    const response = await axiosInstance.post<NavMenuItemReorderResponse>(
      apiRoutes.navMenuItem.reorder,
      { ordered_ids: orderedIds }
    );
    return response.data;
  },

  /** Built-in screens for the `type=route` picker (`schedules`, `baskets`, …). */
  getRouteKeys: async (): Promise<NavMenuRouteKeyOption[]> => {
    const response = await axiosInstance.get(apiRoutes.navMenuItem.routeKeys, {
      skipErrorToast: true,
    });
    return normalizeRouteKeysResponse(response.data);
  },
};

function normalizeRouteKeysResponse(raw: unknown): NavMenuRouteKeyOption[] {
  if (Array.isArray(raw)) return normalizeRouteKeyItems(raw);
  if (raw && typeof raw === 'object') {
    const inner = (raw as { data?: unknown }).data;
    if (Array.isArray(inner)) return normalizeRouteKeyItems(inner);
    if (inner && typeof inner === 'object' && Array.isArray((inner as { data?: unknown }).data)) {
      return normalizeRouteKeyItems((inner as { data: unknown[] }).data);
    }
  }
  return [];
}

function normalizeRouteKeyItems(items: unknown[]): NavMenuRouteKeyOption[] {
  const seen = new Set<string>();
  const out: NavMenuRouteKeyOption[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { key?: unknown; label?: NavMenuRouteKeyOption['label'] };
    const key = String(row.key ?? '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, label: row.label ?? null });
  }

  return out;
}
