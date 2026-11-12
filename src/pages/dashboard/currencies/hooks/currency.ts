import type { CurrencyCreateUpdatePayload } from '../types/currency.types';

import { queryKeys } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { _CurrencyApi } from '../api/currency.services';

export const useFetchCurrencies = (
  page: number = 1,
  perPage: number = 10,
  params?: { search?: string }
) =>
  useQuery({
    queryKey: queryKeys.currency.list({ page, per_page: perPage, ...params }),
    queryFn: () => _CurrencyApi.getListCurrencies({ page, per_page: perPage, ...params }),
  });

export const useFetchCurrencyById = (id: number | string) =>
  useQuery({
    queryKey: queryKeys.currency.details(id),
    queryFn: () => _CurrencyApi.getCurrencyById(id),
    enabled: !!id,
  });

export const useCreateCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CurrencyCreateUpdatePayload) => _CurrencyApi.createCurrency(data),
    // A new default can change any existing currency's default status.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currency'] }),
  });
};

export const useUpdateCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: CurrencyCreateUpdatePayload }) =>
      _CurrencyApi.updateCurrency(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currency'] }),
  });
};

export const useDeleteCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => _CurrencyApi.deleteCurrency(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currency'] }),
  });
};

export const useToggleCurrencyStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => _CurrencyApi.toggleStatus(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currency'] }),
  });
};
