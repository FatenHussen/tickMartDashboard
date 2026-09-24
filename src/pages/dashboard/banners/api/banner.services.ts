import type { BannerItem, BannerFormValues, BannerListResponse } from '../types/banner.types';

import { apiRoutes, axiosInstance } from '@/api';
import { couponLocalDateTimeToISO } from '@/pages/dashboard/coupons/validation/coupon.validation';

/**
 * Append banner fields for multipart create/update.
 * Optional text fields are omitted when empty on create; on update empty
 * `expires_at` is sent as '' so the backend clears it (permanent banner).
 */
function appendBannerFields(
  formData: FormData,
  data: BannerFormValues,
  options: { isUpdate?: boolean } = {}
) {
  const { isUpdate = false } = options;

  const appendIfPresent = (key: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) formData.append(key, trimmed);
  };

  appendIfPresent('title[en]', data.title.en);
  appendIfPresent('title[ar]', data.title.ar);
  appendIfPresent('description[en]', data.description.en);
  appendIfPresent('description[ar]', data.description.ar);
  appendIfPresent('button_text[en]', data.button_text.en);
  appendIfPresent('button_text[ar]', data.button_text.ar);

  const link = data.link.trim();
  if (link) {
    formData.append('link', link);
  } else if (isUpdate) {
    formData.append('link', '');
  }

  const expiresRaw = data.expires_at.trim();
  if (expiresRaw) {
    formData.append('expires_at', couponLocalDateTimeToISO(expiresRaw));
  } else if (isUpdate) {
    // Clear expiry → permanent
    formData.append('expires_at', '');
  }
  // Create without expires_at → permanent (omit field)

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

    const response = await axiosInstance.post(apiRoutes.banner.create, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateBanner: async (id: number | string, data: BannerFormValues): Promise<any> => {
    const formData = new FormData();
    formData.append('_method', 'PATCH');
    appendBannerFields(formData, data, { isUpdate: true });

    const response = await axiosInstance.post(apiRoutes.banner.update(id), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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
