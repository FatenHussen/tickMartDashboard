import type {
  VariantDeleteImpact,
  VariantDeleteImpactResponse,
} from '@/pages/dashboard/products/types/variant-delete-impact.types';

import { apiRoutes, axiosInstance } from '@/api';

// ----------------------------------------------------------------------

export interface ShopProductVariantItem {
  id: number;
  label: string;
  product_variant_id?: number;
  /** Sale price/stock now live on the variant, shared across every shop. */
  variant?: {
    id?: number;
    price?: number;
    quantity?: number;
    discount?: number | null;
    price_after_discount?: number | null;
  };
  /** Branch purchase cost only — not a sale price; sale price lives on `variant.price` above. */
  cost_price?: number | null;
  /**
   * Display-only mirror of `variant.quantity` on shop-product-variant detail/list.
   * Do not send this on PUT — stock is edited on the product variant.
   */
  quantity?: number | null;
  /** Present on list/detail payloads from API */
  variant_image?: string | null;
  product?: { image?: string | null; brand?: string | { name?: string | { ar?: string; en?: string } } };
  /** May be present on list/detail — avoids extra brand fetches */
  brand?: string | { name?: string | { ar?: string; en?: string } };
  sku?: string | null;
  model?: string | null;
  barcode?: string | null;
  [key: string]: unknown;
}

export type ShopVariantSaleFields = {
  price?: number;
  discount?: number | null;
  price_after_discount?: number | null;
  quantity?: number;
};

/** Prefer nested `variant` (new API), then the shop-row keys kept for display compatibility. */
export function resolveShopVariantSaleFields(row: {
  variant?: ShopVariantSaleFields | null;
  shop_variant?: (ShopVariantSaleFields & { variant?: ShopVariantSaleFields | null }) | null;
}): ShopVariantSaleFields {
  const nested = row.shop_variant?.variant ?? row.variant;
  const shop = row.shop_variant;
  return {
    price: nested?.price ?? shop?.price,
    discount: nested?.discount ?? shop?.discount,
    price_after_discount: nested?.price_after_discount ?? shop?.price_after_discount,
    quantity: nested?.quantity ?? shop?.quantity,
  };
}

export interface ShopProductVariantListResponse {
  status: boolean;
  message: string;
  data: {
    items: ShopProductVariantItem[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}

/** Appends API pricing fields to the option label (order: price · discount · price_after_discount). */
function formatShopProductVariantListLabel(
  item: ShopProductVariantItem,
  includePricing = true
): string {
  const base = typeof item.label === 'string' ? item.label : String(item.label ?? '');
  if (!includePricing) return base;
  const bits: string[] = [];
  const variant = item.variant;
  const price = variant?.price ?? (typeof item.price === 'number' ? item.price : undefined);
  const discount = variant?.discount ?? (typeof item.discount === 'number' ? item.discount : undefined);
  const after =
    variant?.price_after_discount ??
    (typeof item.price_after_discount === 'number' ? item.price_after_discount : undefined);
  if (price != null) bits.push(String(price));
  if (discount != null) bits.push(String(discount));
  if (after != null) bits.push(String(after));
  return bits.length ? `${base} — ${bits.join(' · ')}` : base;
}

const emptyResponse = (page: number, perPage: number): ShopProductVariantListResponse => ({
  status: true,
  message: '',
  data: {
    items: [],
    pagination: {
      current_page: page,
      last_page: page,
      per_page: perPage,
      total: 0,
    },
  },
});

export interface ShopProductVariantUpdatePayload {
  /** Branch purchase cost only — price/quantity are edited on the variant itself, not per shop. */
  cost_price?: number;
}

export const _ShopProductVariantApi = {
  update: async (id: number | string, data: ShopProductVariantUpdatePayload): Promise<any> => {
    const response = await axiosInstance.put(apiRoutes.shopProductVariant.update(id), data);
    return response.data;
  },

  /**
   * Soft-deletes the shop link. Without `confirm`, the API answers `409`
   * (rejected as `ConfirmationRequiredError`) whenever linked data exists.
   */
  delete: async (id: number | string, options?: { confirm?: boolean }): Promise<any> => {
    const response = await axiosInstance.delete(apiRoutes.shopProductVariant.delete(id), {
      params: options?.confirm ? { confirm: true } : undefined,
      // `useVariantDeleteFlow` owns every message for this call, including the 409 handshake.
      skipErrorToast: true,
    });
    return response.data;
  },

  /** Preview of what the delete would touch. Deletes nothing. */
  getDeleteImpact: async (id: number | string): Promise<VariantDeleteImpact | null> => {
    const response = await axiosInstance.get<VariantDeleteImpactResponse>(
      apiRoutes.shopProductVariant.deleteImpact(id),
      { skipErrorToast: true }
    );
    return response.data?.data ?? null;
  },

  getList: async (params?: {
    page?: number;
    per_page?: number;
    shop_id?: number;
    category_id?: number;
    /** When set, backend may filter variants in any of these categories */
    category_ids?: number[];
    brand_id?: number;
    product_id?: number;
    search?: string;
    price_min?: number;
    price_max?: number;
    cost_price_min?: number;
    cost_price_max?: number;
    /** When false, dropdown shows product/variant name only (no appended price numbers). */
    include_pricing_in_label?: boolean;
  }): Promise<ShopProductVariantListResponse> => {
    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 10;
    try {
      const { category_ids, include_pricing_in_label, ...rest } = params ?? {};
      const includePricing = include_pricing_in_label !== false;
      const restQuery = { ...rest } as Record<string, string | number | boolean | undefined>;
      delete (restQuery as { include_pricing_in_label?: boolean }).include_pricing_in_label;
      if (category_ids?.length) {
        delete restQuery.category_id;
      }
      const usp = new URLSearchParams();
      Object.entries(restQuery).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        usp.append(k, String(v));
      });
      if (category_ids?.length) {
        category_ids.forEach((id) => usp.append('category_ids[]', String(id)));
      }
      const qs = usp.toString();
      const listUrl = qs ? `${apiRoutes.shopProductVariant.list}?${qs}` : apiRoutes.shopProductVariant.list;
      const response = await axiosInstance.get(listUrl);
      const data = response?.data;
      if (!data?.data?.items || !Array.isArray(data.data.items)) {
        return emptyResponse(page, perPage);
      }
      const items = data.data.items
        .filter((i: any) => i != null && i.id != null && String(i.id).trim() !== '')
        .map((i: any) => {
          const row: ShopProductVariantItem = {
            ...i,
            id: typeof i.id === 'number' ? i.id : Number(i.id),
            label: typeof i.label === 'string' ? i.label : String(i.label ?? ''),
          };
          return { ...row, label: formatShopProductVariantListLabel(row, includePricing) };
        })
        .filter((i: ShopProductVariantItem) => Number.isSafeInteger(i.id) && i.id > 0);
      return {
        status: data.status ?? true,
        message: data.message ?? '',
        data: {
          items,
          pagination:
            data.data?.pagination ?? {
              current_page: page,
              last_page: page,
              per_page: perPage,
              total: items.length,
            },
        },
      };
    } catch {
      return emptyResponse(page, perPage);
    }
  },
};
