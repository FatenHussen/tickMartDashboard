import type { ColorListParams, ColorCreatePayload } from '../types/color.types';

import { queryKeys } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { _ColorApi, listAllColors } from '../api/color.services';

export const useFetchColors = (params?: ColorListParams) =>
  useQuery({
    queryKey: queryKeys.color.list(params as Record<string, unknown>),
    queryFn: () => _ColorApi.getListColors(params),
  });

/** Active shades from `colors`, including later pages. Shared by attribute and product forms. */
export const useActiveColorCatalog = () =>
  useQuery({
    queryKey: queryKeys.color.list({ scope: 'active-catalog' }),
    queryFn: () => listAllColors({ per_page: 200, is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

export const useFetchColorById = (id: number | string) =>
  useQuery({
    queryKey: queryKeys.color.details(id),
    queryFn: () => _ColorApi.getColorById(id),
    enabled: !!id,
  });

export const useCreateColor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ColorCreatePayload) => _ColorApi.createColor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['color', 'list'] });
    },
  });
};

export const useUpdateColor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<ColorCreatePayload> }) =>
      _ColorApi.updateColor(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['color', 'list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.color.details(variables.id) });
    },
  });
};

export const useDeleteColor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => _ColorApi.deleteColor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['color', 'list'] });
    },
  });
};
