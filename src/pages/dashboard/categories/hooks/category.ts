import { queryKeys } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { _CategoryApi, type CategoryCreateUpdatePayload } from '../api/category.services';

export type CategoryListFilter = {
  /** Filter by parent: `0` or `null` = root categories (API: `parent_id=null`); positive id = direct children. */
  parent_id?: number | null;
  /** Alternative API param for listing children (some backends use this instead of `parent_id`). */
  category_id?: number;
  sort_field?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  /** Admin list filter — sent as `name` query param. */
  name?: string;
  is_active?: 0 | 1 | boolean;
  is_restaurant?: 0 | 1 | boolean;
};

export const useFetchCategories = (
  page: number = 1,
  limit: number = 25,
  filter?: CategoryListFilter,
  queryOptions?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: queryKeys.category.list({
      page,
      limit,
      parent_id: filter?.parent_id,
      category_id: filter?.category_id,
      sort_field: filter?.sort_field,
      sort_order: filter?.sort_order,
      search: filter?.search,
      name: filter?.name,
      is_active: filter?.is_active,
      is_restaurant: filter?.is_restaurant,
    }),
    queryFn: () =>
      _CategoryApi.getListCategoriesPaginated({
        page,
        per_page: limit,
        parent_id: filter?.parent_id,
        category_id: filter?.category_id,
        sort_field: filter?.sort_field,
        sort_order: filter?.sort_order,
        search: filter?.search,
        name: filter?.name,
        is_active: filter?.is_active,
        is_restaurant: filter?.is_restaurant,
      }),
    enabled: queryOptions?.enabled !== false,
  });

export const useFetchCategoryById = (id: number | string) => useQuery({
    queryKey: queryKeys.category.details(id),
    queryFn: () => _CategoryApi.getCategoryById(id),
    enabled: !!id,
  });

/** Walk parent_id until the root — category attributes are stored on the root. */
export const useRootCategoryId = (categoryId?: number) =>
  useQuery({
    queryKey: ['category', 'root-of', categoryId ?? 0],
    enabled: categoryId != null && categoryId > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let id = Number(categoryId);
      for (let i = 0; i < 8; i += 1) {
        const res = await _CategoryApi.getCategoryById(id);
        const cat = res.data;
        if (!cat) return id;
        const isRoot =
          cat.is_root === true ||
          cat.parent_id == null ||
          Number(cat.parent_id) === 0;
        if (isRoot) return Number(cat.id);
        const parentId = Number(cat.parent_id ?? cat.parent?.id);
        if (!Number.isFinite(parentId) || parentId <= 0) return Number(cat.id);
        id = parentId;
      }
      return id;
    },
  });

/** Preview of what deleting this category would affect — fetched right before showing the delete dialog. */
export const useFetchCategoryDeleteImpact = (id: number | string | null) =>
  useQuery({
    queryKey: queryKeys.category.deleteImpact(id as number | string),
    queryFn: () => _CategoryApi.getDeleteImpact(id as number | string),
    enabled: id != null,
    // The user is waiting on a modal; a retry only delays the fallback confirm.
    retry: false,
  });

/** Paginated linked entities affected by deleting this category — the delete dialog's "linked items" tab. */
export const useFetchCategoryLinkedItems = (
  id: number | string | null,
  page: number,
  perPage = 10
) =>
  useQuery({
    queryKey: queryKeys.category.linkedItems(id as number | string, page, perPage),
    queryFn: () =>
      _CategoryApi.getLinkedItems(id as number | string, { page, per_page: perPage }),
    enabled: id != null,
    retry: false,
  });

/** Creating/renaming/deleting a category also creates/renames/deletes its CMS page. */
function invalidateCategoryPages(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['pageBuilder'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.pageSection.pages() });
}

function invalidateCategoryLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({
    queryKey: ['category', 'list'],
    refetchType: 'active',
  });
  queryClient.refetchQueries({
    queryKey: ['category', 'list'],
    type: 'active',
  });
}

export const useCreateCategory = (page?: number, limit?: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CategoryCreateUpdatePayload) => _CategoryApi.createCategory(data),
    onSuccess: () => {
      invalidateCategoryLists(queryClient);
      invalidateCategoryPages(queryClient);
    },
  });
};

export const useUpdateCategory = (page?: number, limit?: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: CategoryCreateUpdatePayload }) =>
      _CategoryApi.updateCategory(id, data),
    onSuccess: (_, variables) => {
      invalidateCategoryLists(queryClient);
      invalidateCategoryPages(queryClient);
      queryClient.invalidateQueries({
        queryKey: queryKeys.category.details(variables.id),
      });
    },
  });
};

export const useSortCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { ordered_ids: number[]; parent_id?: number | null }) =>
      _CategoryApi.sortCategories(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['category', 'list'],
        refetchType: 'active',
      });
      queryClient.refetchQueries({
        queryKey: ['category', 'list'],
        type: 'active',
      });
    },
  });
};

export const useDeleteCategory = (page?: number, limit?: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, confirm }: { id: number | string; confirm?: boolean }) =>
      _CategoryApi.deleteCategory(id, { confirm }),
    onSuccess: (_, { id }) => {
      invalidateCategoryLists(queryClient);
      invalidateCategoryPages(queryClient);
      queryClient.invalidateQueries({
        queryKey: queryKeys.category.details(id),
      });
    },
  });
};
