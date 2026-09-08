import type { NavMenuItemListQueryParams } from '../types';

import { queryKeys } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { _NavMenuItemApi } from '../api/services';

// ----------------------------------------------------------------------

const LIST_ROOT = ['navMenuItem', 'list'] as const;

export const useFetchNavMenuItems = (params?: NavMenuItemListQueryParams) =>
  useQuery({
    queryKey: queryKeys.navMenuItem.list(params as Record<string, unknown> | undefined),
    queryFn: () => _NavMenuItemApi.getList(params),
  });

export const useFetchNavMenuItemById = (id: number | string) =>
  useQuery({
    queryKey: queryKeys.navMenuItem.details(id),
    queryFn: () => _NavMenuItemApi.getById(id),
    enabled: !!id,
  });

export const useCreateNavMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => _NavMenuItemApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_ROOT });
    },
  });
};

export const useUpdateNavMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: number | string; formData: FormData }) =>
      _NavMenuItemApi.update(id, formData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LIST_ROOT });
      queryClient.invalidateQueries({ queryKey: queryKeys.navMenuItem.details(variables.id) });
    },
  });
};

/** In-table show/hide switch: partial update, nothing else about the item changes. */
export const useToggleNavMenuItemActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number | string; isActive: boolean }) =>
      _NavMenuItemApi.patch(id, { is_active: isActive }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LIST_ROOT });
      queryClient.invalidateQueries({ queryKey: queryKeys.navMenuItem.details(variables.id) });
    },
  });
};

export const useDeleteNavMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => _NavMenuItemApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_ROOT });
    },
  });
};

export const useReorderNavMenuItems = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: number[]) => _NavMenuItemApi.reorder(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_ROOT });
    },
  });
};

export const useFetchNavMenuRouteKeys = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.navMenuItem.routeKeys(),
    queryFn: () => _NavMenuItemApi.getRouteKeys(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
