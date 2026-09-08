import type {
  VariantDeleteImpact,
  VariantDeleteImpactResponse,
} from '../types/variant-delete-impact.types';
import type {
  AdminProductVariantListItem,
  AdminProductVariantsListApiResponse,
} from '../types/product.types';

import { apiRoutes, axiosInstance } from '@/api';

// ----------------------------------------------------------------------

export interface ProductVariantUpdatePayload {
  is_trend?: number;
  is_active?: number;
  attributes_values_ids?: number[];
  images?: File[];
  existing_images_ids?: number[];
  sku?: string | null;
  model?: string | null;
  barcode?: string | null;
  price?: number;
  price_syp?: number;
  quantity?: number;
  discount?: number;
  discount_type?: 'none' | 'percentage' | 'fixed';
}

export interface ProductVariantListParams {
  page?: number;
  per_page?: number;
  search?: string;
  product_id?: number;
  category_id?: number;
  shop_id?: number;
  price_min?: number;
  price_max?: number;
  quantity_min?: number;
  quantity_max?: number;
}

const emptyVariantList = (
  page: number,
  perPage: number
): AdminProductVariantsListApiResponse['data'] => ({
  items: [],
  pagination: {
    current_page: page,
    last_page: page,
    per_page: perPage,
    total: 0,
  },
});

const buildVariantFormData = (data: ProductVariantUpdatePayload): FormData => {
  const formData = new FormData();

  if (data.is_trend !== undefined) formData.append('is_trend', String(data.is_trend));
  if (data.is_active !== undefined) formData.append('is_active', String(data.is_active));
  if (data.sku != null && String(data.sku).trim() !== '') {
    formData.append('sku', data.sku);
  }
  if (data.model !== undefined) formData.append('model', data.model == null ? '' : data.model);
  if (data.barcode != null && String(data.barcode).trim() !== '') {
    formData.append('barcode', data.barcode);
  }
  if (data.price !== undefined) {
    formData.append('price', String(data.price));
  } else if (data.price_syp !== undefined) {
    formData.append('price_syp', String(data.price_syp));
  }
  if (data.quantity != null && !Number.isNaN(Number(data.quantity))) {
    formData.append('quantity', String(data.quantity));
  }
  if (data.discount_type !== undefined) {
    formData.append('discount_type', data.discount_type);
    formData.append(
      'discount',
      String(data.discount_type === 'none' ? 0 : (data.discount ?? 0))
    );
  } else if (data.discount !== undefined) {
    formData.append('discount', String(data.discount));
  }

  (data.attributes_values_ids ?? []).forEach((id) => {
    formData.append('attributes_values_ids[]', String(id));
  });

  (data.existing_images_ids ?? []).forEach((id) => {
    formData.append('existing_images_ids[]', String(id));
  });

  if (data.images && data.images.length > 0) {
    data.images.forEach((file) => formData.append('images[]', file));
  }

  formData.append('_method', 'PUT');
  return formData;
};

export const _ProductVariantApi = {
  getList: async (
    params?: ProductVariantListParams
  ): Promise<AdminProductVariantsListApiResponse['data']> => {
    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 10;
    const response = await axiosInstance.get<AdminProductVariantsListApiResponse>(
      apiRoutes.productVariant.list,
      { params }
    );
    const inner = response.data?.data;
    if (!inner) return emptyVariantList(page, perPage);
    return {
      items: Array.isArray(inner.items) ? inner.items : [],
      pagination: inner.pagination ?? {
        current_page: page,
        last_page: page,
        per_page: perPage,
        total: 0,
      },
    };
  },

  getById: async (id: number | string): Promise<AdminProductVariantListItem | null> => {
    const response = await axiosInstance.get<{
      status?: boolean;
      data?: AdminProductVariantListItem;
    }>(apiRoutes.productVariant.details(id));
    return response.data?.data ?? null;
  },

  update: async (id: number | string, data: ProductVariantUpdatePayload): Promise<any> => {
    const formData = buildVariantFormData(data);
    const response = await axiosInstance.post(apiRoutes.productVariant.update(id), formData, {
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return response.data;
  },

  /**
   * Soft-deletes the variant. Order history is preserved either way.
   *
   * Without `confirm`, the API answers `409` (rejected as `ConfirmationRequiredError`)
   * whenever linked data exists; pass `confirm: true` to go through after the user acks.
   */
  delete: async (id: number | string, options?: { confirm?: boolean }): Promise<any> => {
    const response = await axiosInstance.delete(apiRoutes.productVariant.delete(id), {
      params: options?.confirm ? { confirm: true } : undefined,
      // `useVariantDeleteFlow` owns every message for this call, including the 409 handshake.
      skipErrorToast: true,
    });
    return response.data;
  },

  /** Preview of what the delete would touch. Deletes nothing. */
  getDeleteImpact: async (id: number | string): Promise<VariantDeleteImpact | null> => {
    const response = await axiosInstance.get<VariantDeleteImpactResponse>(
      apiRoutes.productVariant.deleteImpact(id),
      { skipErrorToast: true }
    );
    return response.data?.data ?? null;
  },
};
