import type { GiftListResponse, GiftDetailsResponse, BulkGiftCreatePayload, GiftCreateUpdatePayload } from '../types/gift.types';

import { apiRoutes, axiosInstance, postMultipart, putMultipart } from '@/api';

const appendTranslations = (
  formData: FormData,
  field: string,
  value?: { ar?: string; en?: string }
) => {
  if (!value) return;
  if (value.ar) formData.append(`${field}[ar]`, value.ar);
  if (value.en) formData.append(`${field}[en]`, value.en);
};

export type GiftListParams = {
  page?: number;
  per_page?: number;
  search?: string;
  /** Admin gifts list filter (same pattern as products). */
  category_id?: number;
  is_active?: boolean;
  sort_by?: 'id' | 'points_required' | 'created_at';
  sort_order?: 'asc' | 'desc';
};

export const _GiftApi = {
  getListGifts: async (params?: GiftListParams): Promise<GiftListResponse> => {
    const response = await axiosInstance.get<GiftListResponse>(apiRoutes.gift.list, { params });
    return response.data;
  },

  getGiftById: async (id: number | string): Promise<GiftDetailsResponse> => {
    const response = await axiosInstance.get<GiftDetailsResponse>(apiRoutes.gift.details(id));
    return response.data;
  },

  createGift: async (data: GiftCreateUpdatePayload): Promise<any> => {
    const formData = new FormData();
    appendTranslations(formData, 'name', data.name);
    appendTranslations(formData, 'description', data.description);
    appendTranslations(formData, 'terms_conditions', data.terms_conditions);
    if (data.image instanceof File) formData.append('image', data.image);
    formData.append('points_required', String(data.points_required));
    if (data.stock_quantity !== undefined) formData.append('stock_quantity', String(data.stock_quantity));
    if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');
    if (data.category_id) formData.append('category_id', String(data.category_id));
    if (data.shop_product_variant_id != null)
      formData.append('shop_product_variant_id', String(data.shop_product_variant_id));

    const response = await postMultipart(apiRoutes.gift.create, formData);
    return response.data;
  },

  updateGift: async (id: number | string, data: GiftCreateUpdatePayload): Promise<any> => {
    const formData = new FormData();
    appendTranslations(formData, 'name', data.name);
    appendTranslations(formData, 'description', data.description);
    appendTranslations(formData, 'terms_conditions', data.terms_conditions);
    if (data.image instanceof File) formData.append('image', data.image);
    formData.append('points_required', String(data.points_required));
    if (data.stock_quantity !== undefined) formData.append('stock_quantity', String(data.stock_quantity));
    if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');
    if (data.category_id) formData.append('category_id', String(data.category_id));
    if (data.shop_product_variant_id != null)
      formData.append('shop_product_variant_id', String(data.shop_product_variant_id));

    const response = await putMultipart(apiRoutes.gift.update(id), formData);
    return response.data;
  },

  deleteGift: async (id: number | string): Promise<any> => {
    const response = await axiosInstance.delete(apiRoutes.gift.delete(id));
    return response.data;
  },

  bulkCreateGifts: async (data: BulkGiftCreatePayload): Promise<any> => {
    const response = await axiosInstance.post(apiRoutes.gift.bulkCreate, data);
    return response.data;
  },
};
