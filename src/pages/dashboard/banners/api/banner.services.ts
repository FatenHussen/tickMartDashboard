import type { BannerItem, BannerFormValues, BannerListResponse } from '../types/banner.types';

import { apiRoutes, axiosInstance } from '@/api';
import { couponLocalDateTimeToISO } from '@/pages/dashboard/coupons/validation/coupon.validation';

function appendBannerFields(formData: FormData, data: BannerFormValues) {
  formData.append('title[en]', data.title.en.trim());
  formData.append('title[ar]', data.title.ar.trim());
  formData.append('description[en]', data.description.en.trim());
  formData.append('description[ar]', data.description.ar.trim());
  formData.append('button_text[en]', data.button_text.en.trim());
  formData.append('button_text[ar]', data.button_text.ar.trim());
  formData.append('link', data.link.trim());
  formData.append('expires_at', couponLocalDateTimeToISO(data.expires_at.trim()));
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
    appendBannerFields(formData, data);

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
    appendBannerFields(formData, data);

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
