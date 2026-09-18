import type { IconCreatePayload } from '../types/icon.types';

import { queryKeys } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { _IconApi } from '../api/icon.services';

export const useFetchIcons = (
  page: number = 1,
  perPage: number = 10,
  params?: { search?: string; is_active?: number }
) =>
  useQuery({
    queryKey: queryKeys.icon.list({ page, per_page: perPage, ...params }),
    queryFn: () => _IconApi.getListIcons({ page, per_page: perPage, ...params }),
  });

export const useFetchIconById = (id: number | string) =>
  useQuery({
    queryKey: queryKeys.icon.details(id),
    queryFn: () => _IconApi.getIconById(id),
    enabled: !!id,
  });

export const useCreateIcon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IconCreatePayload) => _IconApi.createIcon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['icon', 'list'] });
    },
  });
};

export const useUpdateIcon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<IconCreatePayload> }) =>
      _IconApi.updateIcon(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['icon', 'list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.icon.details(variables.id) });
    },
  });
};

export const useDeleteIcon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => _IconApi.deleteIcon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['icon', 'list'] });
    },
  });
};
