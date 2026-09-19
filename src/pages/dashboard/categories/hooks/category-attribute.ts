import { queryKeys } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  _CategoryAttributeApi,
  type CategoryAttributeListParams,
  type CategoryAttributeCreateUpdatePayload,
} from '../api/category-attribute.services';

export type UseFetchCategoryAttributesOptions = {
  enabled?: boolean;
  /** When true, the query runs only after `filters.category_id` is set. */
  requireCategoryId?: boolean;
};

export const useFetchCategoryAttributes = (
  filters: CategoryAttributeListParams = {},
  options?: UseFetchCategoryAttributesOptions
) =>
  useQuery({
    queryKey: queryKeys.categoryAttribute.list(filters as Record<string, unknown>),
    queryFn: () => _CategoryAttributeApi.getListCategoryAttributes(filters),
    enabled:
      options?.enabled !== false &&
      (!options?.requireCategoryId ||
        (filters.category_id != null && `${filters.category_id}` !== '')),
  });

export const useFetchCategoryAttributeById = (id: number | string) =>
  useQuery({
    queryKey: queryKeys.categoryAttribute.details(id),
    queryFn: () => _CategoryAttributeApi.getCategoryAttributeById(id),
    enabled: !!id,
  });

/** Preview of what deleting this attribute would affect — fetched right before showing the delete dialog. */
export const useFetchCategoryAttributeDeleteImpact = (id: number | string | null) =>
  useQuery({
    queryKey: queryKeys.categoryAttribute.deleteImpact(id as number | string),
    queryFn: () => _CategoryAttributeApi.getDeleteImpact(id as number | string),
    enabled: id != null,
    // The user is waiting on a modal; a retry only delays the fallback confirm.
    retry: false,
  });

/** Paginated product variants using this attribute — the delete dialog's "linked items" tab. */
export const useFetchCategoryAttributeLinkedItems = (
  id: number | string | null,
  page: number,
  perPage = 10
) =>
  useQuery({
    queryKey: queryKeys.categoryAttribute.linkedItems(id as number | string, page, perPage),
    queryFn: () =>
      _CategoryAttributeApi.getLinkedItems(id as number | string, { page, per_page: perPage }),
    enabled: id != null,
    retry: false,
  });

export const useCreateCategoryAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CategoryAttributeCreateUpdatePayload) =>
      _CategoryAttributeApi.createCategoryAttribute(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categoryattribute', 'list'],
        refetchType: 'active',
      });
      queryClient.refetchQueries({
        queryKey: ['categoryattribute', 'list'],
        type: 'active',
      });
    },
  });
};

export const useUpdateCategoryAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: CategoryAttributeCreateUpdatePayload;
    }) => _CategoryAttributeApi.updateCategoryAttribute(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['categoryattribute', 'list'],
        refetchType: 'active',
      });
      queryClient.refetchQueries({
        queryKey: ['categoryattribute', 'list'],
        type: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.categoryAttribute.details(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
};

export const useDeleteCategoryAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, confirm }: { id: number | string; confirm?: boolean }) =>
      _CategoryAttributeApi.deleteCategoryAttribute(id, { confirm }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ['categoryattribute', 'list'],
        refetchType: 'active',
      });
      queryClient.refetchQueries({
        queryKey: ['categoryattribute', 'list'],
        type: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.categoryAttribute.details(id),
      });
    },
  });
};
