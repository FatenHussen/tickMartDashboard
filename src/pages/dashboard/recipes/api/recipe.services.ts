import type {
  LocalizedField,
  RecipeListResponse,
  RecipeDetailsResponse,
  RecipeCreateUpdatePayload,
} from '../types/recipe.types';

import { apiRoutes, axiosInstance, postMultipart, patchMultipart } from '@/api';
import { toApiBilingualDescription } from '@/utils/optional-bilingual-api-placeholder';

function localizedEnAr(field: LocalizedField): { en: string; ar: string } {
  if (typeof field === 'string') {
    return { en: field, ar: field };
  }
  return { en: field?.en ?? '', ar: field?.ar ?? '' };
}

const buildFormData = (data: RecipeCreateUpdatePayload): FormData => {
  const fd = new FormData();

  fd.append('name[en]', data.name.en);
  fd.append('name[ar]', data.name.ar);

  if (data.description) {
    const { en: oen, ar: oar } = toApiBilingualDescription(
      data.description.en ?? '',
      data.description.ar ?? ''
    );
    fd.append('description[en]', oen);
    fd.append('description[ar]', oar);
  }

  if (data.image instanceof File) fd.append('image', data.image);

  if (data.images && data.images.length > 0) {
    data.images.forEach((file) => {
      if (file instanceof File) fd.append('images[]', file);
    });
  }

  (data.existing_images_ids ?? []).forEach((mediaId) => {
    fd.append('existing_images_ids[]', String(mediaId));
  });

  if (data.video_url) fd.append('video_url', data.video_url);
  if (data.video_title) {
    fd.append('video_title[en]', data.video_title.en || '');
    fd.append('video_title[ar]', data.video_title.ar || '');
  }
  if (data.video_desc) {
    fd.append('video_desc[en]', data.video_desc.en || '');
    fd.append('video_desc[ar]', data.video_desc.ar || '');
  }
  if (data.discount !== undefined) fd.append('discount', String(data.discount));
  if (data.delivery_price !== undefined) fd.append('delivery_price', String(data.delivery_price));
  if (data.serves !== undefined && data.serves !== '') fd.append('serves', String(data.serves));
  if (data.prepare_time !== undefined && data.prepare_time !== '') fd.append('prepare_time', String(data.prepare_time));

  data.items?.forEach((item, i) => {
    fd.append(`items[${i}][shop_product_variant_id]`, String(item.shop_product_variant_id));
    fd.append(`items[${i}][quantity]`, String(item.quantity));
    fd.append(`items[${i}][is_required]`, item.is_required ? '1' : '0');
    fd.append(`items[${i}][min_quantity]`, String(item.min_quantity));
    fd.append(`items[${i}][max_quantity]`, String(item.max_quantity));
    if (item.switchable_category_id) {
      fd.append(`items[${i}][switchable_category_id]`, String(item.switchable_category_id));
    }
  });

  data.steps?.forEach((step, i) => {
    const heat = localizedEnAr(step.heat_level);
    const time = localizedEnAr(step.time_minutes);
    const instr = localizedEnAr(step.instruction);
    fd.append(`steps[${i}][step_number]`, String(step.step_number));
    fd.append(`steps[${i}][heat_level][en]`, heat.en);
    fd.append(`steps[${i}][heat_level][ar]`, heat.ar);
    fd.append(`steps[${i}][time_minutes][en]`, time.en);
    fd.append(`steps[${i}][time_minutes][ar]`, time.ar);
    fd.append(`steps[${i}][instruction][en]`, instr.en);
    fd.append(`steps[${i}][instruction][ar]`, instr.ar);
  });

  if (data.badges && data.badges.length > 0) {
    data.badges.forEach((badgeId) => {
      fd.append('badges[]', String(badgeId));
    });
  }

  return fd;
};

export const _RecipeApi = {
  getListRecipes: async (params?: { page?: number; per_page?: number; search?: string }): Promise<RecipeListResponse> => {
    const response = await axiosInstance.get<RecipeListResponse>(apiRoutes.recipe.list, { params });
    return response.data;
  },

  getRecipeById: async (id: number | string): Promise<RecipeDetailsResponse> => {
    const response = await axiosInstance.get<RecipeDetailsResponse>(apiRoutes.recipe.details(id));
    return response.data;
  },

  createRecipe: async (data: RecipeCreateUpdatePayload): Promise<any> => {
    const response = await postMultipart(apiRoutes.recipe.create, buildFormData(data));
    return response.data;
  },

  updateRecipe: async (id: number | string, data: RecipeCreateUpdatePayload): Promise<any> => {
    const response = await patchMultipart(apiRoutes.recipe.update(id), buildFormData(data));
    return response.data;
  },

  deleteRecipe: async (id: number | string): Promise<any> => {
    const response = await axiosInstance.delete(apiRoutes.recipe.delete(id));
    return response.data;
  },
};
