import type {
  BasketListResponse,
  BasketDetailsResponse,
  BasketCreateUpdatePayload,
} from '../types/basket.types';

import { apiRoutes, axiosInstance, postMultipart, patchMultipart } from '@/api';

export const _BasketApi = {
  getListBaskets: async (
    params?: { page?: number; per_page?: number; search?: string }
  ): Promise<BasketListResponse> => {
    const response = await axiosInstance.get<BasketListResponse>(apiRoutes.basket.list, {
      params,
    });
    return response.data;
  },

  getBasketById: async (id: number | string): Promise<BasketDetailsResponse> => {
    const response = await axiosInstance.get<BasketDetailsResponse>(apiRoutes.basket.details(id));
    return response.data;
  },

  createBasket: async (data: BasketCreateUpdatePayload): Promise<any> => {
    const formData = new FormData();
    data.category_ids.forEach((cid) => {
      formData.append('category_ids[]', String(cid));
    });
    if (data.category_id != null) {
      formData.append('category_id', String(data.category_id));
    }
    formData.append('name[ar]', data.name.ar);
    formData.append('name[en]', data.name.en);
    if (data.description) {
      formData.append('description[en]', data.description.en || '');
      formData.append('description[ar]', data.description.ar || '');
    }
    formData.append('discount_type', data.discount_type);
    if (data.discount !== undefined) formData.append('discount', String(data.discount));
    if (data.offer_ends_at) formData.append('offer_ends_at', data.offer_ends_at);
    if (data.delivery_price !== undefined) formData.append('delivery_price', String(data.delivery_price));
    if (data.image instanceof File) formData.append('image', data.image);
    if (data.images?.length) {
      data.images.forEach((file) => {
        if (file instanceof File) formData.append('images[]', file);
      });
    }

    data.items.forEach((item, i) => {
      formData.append(`items[${i}][shop_product_variant_id]`, String(item.shop_product_variant_id));
      formData.append(`items[${i}][quantity]`, String(item.quantity));
    });

    if (data.badges && data.badges.length > 0) {
      data.badges.forEach((badgeId) => {
        formData.append('badges[]', String(badgeId));
      });
    }

    const response = await postMultipart(apiRoutes.basket.create, formData);
    return response.data;
  },

  updateBasket: async (id: number | string, data: BasketCreateUpdatePayload): Promise<any> => {
    const formData = new FormData();
    data.category_ids.forEach((cid) => {
      formData.append('category_ids[]', String(cid));
    });
    if (data.category_id != null) {
      formData.append('category_id', String(data.category_id));
    }
    formData.append('name[ar]', data.name.ar);
    formData.append('name[en]', data.name.en);
    if (data.description) {
      formData.append('description[en]', data.description.en || '');
      formData.append('description[ar]', data.description.ar || '');
    }
    formData.append('discount_type', data.discount_type);
    if (data.discount !== undefined) formData.append('discount', String(data.discount));
    if (data.offer_ends_at) formData.append('offer_ends_at', data.offer_ends_at);
    if (data.delivery_price !== undefined) formData.append('delivery_price', String(data.delivery_price));
    if (data.image instanceof File) formData.append('image', data.image);
    if (data.images?.length) {
      data.images.forEach((file) => {
        if (file instanceof File) formData.append('images[]', file);
      });
    }

    data.items.forEach((item, i) => {
      formData.append(`items[${i}][shop_product_variant_id]`, String(item.shop_product_variant_id));
      formData.append(`items[${i}][quantity]`, String(item.quantity));
    });

    if (data.badges && data.badges.length > 0) {
      data.badges.forEach((badgeId) => {
        formData.append('badges[]', String(badgeId));
      });
    }

    const response = await patchMultipart(apiRoutes.basket.update(id), formData);
    return response.data;
  },

  deleteBasket: async (id: number | string): Promise<any> => {
    const response = await axiosInstance.delete(apiRoutes.basket.delete(id));
    return response.data;
  },
};
