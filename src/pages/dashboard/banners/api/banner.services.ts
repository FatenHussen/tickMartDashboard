import type { BannerItem, BannerFormValues, BannerListResponse } from '../types/banner.types';

import { apiRoutes, axiosInstance, patchMultipart } from '@/api';
import { couponLocalDateTimeToISO } from '@/pages/dashboard/coupons/validation/coupon.validation';

/**
 * Append banner fields for multipart create/update.
 * Create omits empty text so the backend stores nulls.
 * Update always sends text fields, including '' — a PATCH that omits a key
 * keeps the old value, so clearing the form would succeed without saving.
 * Empty `expires_at` on update is stored as null (permanent banner).
 */
function appendBannerFields(
  formData: FormData,
  data: BannerFormValues,
  options: { isUpdate?: boolean } = {}
) {
  const { isUpdate = false } = options;

  const appendText = (key: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed || isUpdate) formData.append(key, trimmed);
  };

  appendText('title[en]', data.title.en);
  appendText('title[ar]', data.title.ar);
  appendText('description[en]', data.description.en);
  appendText('description[ar]', data.description.ar);
  appendText('button_text[en]', data.button_text.en);
  appendText('button_text[ar]', data.button_text.ar);
  appendText('link', data.link);

  const expiresRaw = data.expires_at.trim();
  if (expiresRaw) {
    formData.append('expires_at', couponLocalDateTimeToISO(expiresRaw));
  } else if (isUpdate) {
    formData.append('expires_at', '');
  }

  if (data.image instanceof File) {
    formData.append('image', data.image);
  }
}

export const _BannerApi = {
  getListBanners: async (
    params?: { page?: number; per_page?: number; search?: string }
  ): Promise<BannerListResponse> => {
    const response = await axiosInstance.get<BannerListResponse>(apiRoutes.banner.list, {
      params,
    });
    return response.data;
  },

  createBanner: async (data: BannerFormValues): Promise<any> => {
    const formData = new FormData();
    appendBannerFields(formData, data, { isUpdate: false });

    const response = await axiosInstance.post(apiRoutes.banner.create, formData);
    return response.data;
  },

  updateBanner: async (id: number | string, data: BannerFormValues): Promise<any> => {
    const formData = new FormData();
    appendBannerFields(formData, data, { isUpdate: true });

    const response = await patchMultipart(apiRoutes.banner.update(id), formData);
    return response.data;
  },

  deleteBanner: async (id: number | string): Promise<any> => {
    const response = await axiosInstance.delete(apiRoutes.banner.delete(id));
    return response.data;
  },

  getBannerById: async (id: number | string): Promise<{ status: boolean; data: BannerItem }> => {
    const response = await axiosInstance.get(apiRoutes.banner.details(id));
    return response.data;
  },
};
