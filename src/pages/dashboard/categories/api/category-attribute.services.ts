import type {
  CategoryAttributeListResponse,
  CategoryAttributeDetailResponse,
  CategoryAttributeLinkedItemsResponse,
  CategoryAttributeCreateUpdatePayload,
  CategoryAttributeDeleteImpactResponse,
} from '../types/category-attribute.types';

import { apiRoutes, axiosInstance, postMultipart, putMultipart } from '@/api';

export type { CategoryAttributeCreateUpdatePayload };

export type CategoryAttributeListParams = {
  page?: number;
  per_page?: number;
  category_id?: number | string;
  name?: string;
  search?: string;
  type?: string;
  is_active?: 0 | 1 | boolean;
  /** Filter by `created_at` (inclusive), ISO date `YYYY-MM-DD` */
  date_from?: string;
  date_to?: string;
};

/**
 * Wire format: `values[0][id]=31` + `values[0][name][ar]=XS`.
 * Existing rows keep `id` so a rename updates the same DB row.
 * Omit the `values` key entirely when the caller did not pass it.
 */
function buildCategoryAttributeFormData(
  data: CategoryAttributeCreateUpdatePayload
): FormData {
  const formData = new FormData();
  formData.append('category_id', String(data.category_id));
  formData.append('type', data.type);
  formData.append('name[ar]', data.name.ar);
  formData.append('name[en]', data.name.en);
  data.values?.forEach((row, index) => {
    const valueId = Number(row.id);
    if (Number.isInteger(valueId) && valueId > 0) {
      formData.append(`values[${index}][id]`, String(valueId));
    }
    formData.append(`values[${index}][name][ar]`, row.name.ar);
    formData.append(`values[${index}][name][en]`, row.name.en);
  });
  return formData;
}

function appendIf(
  target: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined | null
) {
  if (value === undefined || value === null || value === '') return;
  if (typeof value === 'boolean') {
    target.set(key, value ? '1' : '0');
    return;
  }
  target.set(key, String(value));
}

export const _CategoryAttributeApi = {
  getListCategoryAttributes: async (
    params: CategoryAttributeListParams = {}
  ): Promise<CategoryAttributeListResponse> => {
    const {
      page = 1,
      per_page = 25,
      category_id,
      name,
      search,
      type,
      is_active,
      date_from,
      date_to,
    } = params;
    const searchParams = new URLSearchParams();
    appendIf(searchParams, 'page', page);
    appendIf(searchParams, 'per_page', per_page);
    if (
      category_id != null &&
      category_id !== '' &&
      !(typeof category_id === 'number' && category_id === 0) &&
      !(typeof category_id === 'string' && category_id === '0')
    ) {
      appendIf(searchParams, 'category_id', category_id);
    }
    if (name?.trim()) searchParams.set('name', name.trim());
    if (search?.trim()) searchParams.set('search', search.trim());
    appendIf(searchParams, 'type', type);
    if (is_active === true || is_active === 1) searchParams.set('is_active', '1');
    else if (is_active === false || is_active === 0) searchParams.set('is_active', '0');
    appendIf(searchParams, 'date_from', date_from);
    appendIf(searchParams, 'date_to', date_to);

    const query = searchParams.toString();
    const url = query
      ? `${apiRoutes.categoryAttribute.list}?${query}`
      : apiRoutes.categoryAttribute.list;
    const response = await axiosInstance.get<CategoryAttributeListResponse>(url);
    return response.data;
  },

  getCategoryAttributeById: async (
    id: number | string
  ): Promise<CategoryAttributeDetailResponse> => {
    const response = await axiosInstance.get<CategoryAttributeDetailResponse>(
      apiRoutes.categoryAttribute.details(id)
    );
    return response.data;
  },
  createCategoryAttribute: async (data: CategoryAttributeCreateUpdatePayload): Promise<any> => {
    const response = await postMultipart(
      apiRoutes.categoryAttribute.create,
      buildCategoryAttributeFormData(data)
    );
    return response.data;
  },
  updateCategoryAttribute: async (
    id: number | string,
    data: CategoryAttributeCreateUpdatePayload
  ): Promise<any> => {
    const response = await putMultipart(
      apiRoutes.categoryAttribute.update(id),
      buildCategoryAttributeFormData(data)
    );
    return response.data;
  },
  /**
   * Deletes the attribute. Without `confirm`, linked records yield `409`
   * (`ConfirmationRequiredError`) instead of acting — pass `confirm: true` after the user acks.
   */
  deleteCategoryAttribute: async (
    id: number | string,
    options?: { confirm?: boolean }
  ): Promise<any> => {
    const response = await axiosInstance.delete(apiRoutes.categoryAttribute.delete(id), {
      params: options?.confirm ? { confirm: true } : undefined,
    });
    return response.data;
  },
  /**
   * Preview of what the delete would affect. Best-effort: the dialog falls back to a plain
   * "are you sure?" when this is unavailable, so a failure here is not worth a toast.
   */
  getDeleteImpact: async (id: number | string): Promise<CategoryAttributeDeleteImpactResponse> => {
    const response = await axiosInstance.get<CategoryAttributeDeleteImpactResponse>(
      apiRoutes.categoryAttribute.deleteImpact(id),
      { skipErrorToast: true }
    );
    return response.data;
  },
  getLinkedItems: async (
    id: number | string,
    params: { page?: number; per_page?: number } = {}
  ): Promise<CategoryAttributeLinkedItemsResponse> => {
    const searchParams = new URLSearchParams();
    appendIf(searchParams, 'page', params.page ?? 1);
    appendIf(searchParams, 'per_page', params.per_page ?? 10);
    const query = searchParams.toString();
    const response = await axiosInstance.get<CategoryAttributeLinkedItemsResponse>(
      `${apiRoutes.categoryAttribute.linkedItems(id)}?${query}`,
      // Same as the impact preview: the tab renders its own empty state on failure.
      { skipErrorToast: true }
    );
    return response.data;
  },
};
