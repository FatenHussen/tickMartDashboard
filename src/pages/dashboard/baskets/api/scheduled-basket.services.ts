import type {
  ScheduledBasketListParams,
  ScheduledBasketListResponse,
  ScheduledBasketDetailsResponse,
  ScheduledBasketCreateUpdatePayload,
} from '../types/scheduled-basket.types';

import { apiRoutes, axiosInstance, postMultipart, patchMultipart } from '@/api';

function buildScheduledBasketFormData(data: ScheduledBasketCreateUpdatePayload): FormData {
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
  formData.append('schedule_id', String(data.schedule_id));
  if (data.discount === null) {
    formData.append('discount', '');
    formData.append('discount_type', '');
  } else if (data.discount !== undefined) {
    formData.append('discount', String(data.discount));
    if (data.discount_type) formData.append('discount_type', data.discount_type);
  }
  if (data.delivery_price !== undefined) formData.append('delivery_price', String(data.delivery_price));
  if (data.image instanceof File) formData.append('image', data.image);
  if (data.images?.length) {
    data.images.forEach((file) => {
      if (file instanceof File) formData.append('images[]', file);
    });
  }
  formData.append('is_active', data.is_active ? '1' : '0');

  // Items — Laravel expects boolean fields as 0/1 in multipart
  data.items.forEach((item, i) => {
    formData.append(`items[${i}][shop_product_variant_id]`, String(item.shop_product_variant_id));
    formData.append(`items[${i}][quantity]`, String(item.quantity));

    formData.append(`items[${i}][is_required]`, item.is_required ? '1' : '0');
    formData.append(`items[${i}][is_extra]`, item.is_extra ? '1' : '0');
    if (item.min_quantity != null && item.min_quantity >= 1) {
      formData.append(`items[${i}][min_quantity]`, String(item.min_quantity));
    }
    if (item.max_quantity != null && item.max_quantity >= 1) {
      formData.append(`items[${i}][max_quantity]`, String(item.max_quantity));
    }

    // Alternative variant IDs — Laravel expects items[i][shop_product_variant_ids][]
    if (item.shop_product_variant_ids && item.shop_product_variant_ids.length > 0) {
      item.shop_product_variant_ids.forEach((varId) => {
        formData.append(`items[${i}][shop_product_variant_ids][]`, String(varId));
      });
    }
  });

  if (data.badges && data.badges.length > 0) {
    data.badges.forEach((badgeId) => {
      formData.append('badges[]', String(badgeId));
    });
  }

  return formData;
}

export const _ScheduledBasketApi = {
  getListScheduledBaskets: async (params?: ScheduledBasketListParams): Promise<ScheduledBasketListResponse> => {
    const response = await axiosInstance.get<ScheduledBasketListResponse>(apiRoutes.scheduledBasket.list, {
      params,
    });
    return response.data;
  },

  getScheduledBasketById: async (id: number | string): Promise<ScheduledBasketDetailsResponse> => {
    const response = await axiosInstance.get<ScheduledBasketDetailsResponse>(apiRoutes.scheduledBasket.details(id));
    return response.data;
  },

  createScheduledBasket: async (data: ScheduledBasketCreateUpdatePayload): Promise<any> => {
    const formData = buildScheduledBasketFormData(data);
    const response = await postMultipart(apiRoutes.scheduledBasket.create, formData);
    return response.data;
  },

  updateScheduledBasket: async (id: number | string, data: ScheduledBasketCreateUpdatePayload): Promise<any> => {
    const formData = buildScheduledBasketFormData(data);
    const response = await patchMultipart(apiRoutes.scheduledBasket.update(id), formData);
    return response.data;
  },

  deleteScheduledBasket: async (id: number | string): Promise<any> => {
    const response = await axiosInstance.delete(apiRoutes.scheduledBasket.delete(id));
    return response.data;
  },
};
