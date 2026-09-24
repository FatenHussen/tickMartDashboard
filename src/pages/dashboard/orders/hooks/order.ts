import type {
  AssignDriverPayload,
  ChangeItemStatusPayload,
  ChangeOrderStatusPayload,
  OrderDetailsResponse,
} from '../types/order.types';

import { queryKeys } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { _OrderApi } from '../api/order.services';
import { parseOrderStatus } from '../types/order.types';

export const useFetchOrders = (
  page: number = 1,
  perPage: number = 10,
  status?: string,
  search?: string,
  driverId?: number,
  sortField?: string,
  sortOrder?: 'asc' | 'desc'
) =>
  useQuery({
    queryKey: queryKeys.order.list({
      page,
      per_page: perPage,
      status,
      search,
      driver_id: driverId,
      sort_field: sortField,
      sort_order: sortOrder,
    }),
    queryFn: () =>
      _OrderApi.getListOrders({
        page,
        per_page: perPage,
        status,
        search,
        driver_id: driverId,
        sort_field: sortField,
        sort_order: sortOrder,
      }),
  });

export const useFetchOrderById = (id: number | string) =>
  useQuery({
    queryKey: queryKeys.order.details(id),
    queryFn: () => _OrderApi.getOrderById(id),
    enabled: !!id,
  });

export const useChangeOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      queryId,
    }: {
      id: number | string;
      data: ChangeOrderStatusPayload;
      /** Use this for refetch to match the query key (e.g. route param string) */
      queryId?: number | string;
    }) => _OrderApi.changeOrderStatus(id, data),
    onSuccess: async (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', 'list'] });
      const refetchId = variables.queryId ?? variables.id;
      const detailsKey = queryKeys.order.details(refetchId);
      // Prefer `data.status` / `data.status_label` — never the root success boolean.
      const nextStatus = parseOrderStatus(response?.data?.status);
      if (nextStatus) {
        queryClient.setQueryData<OrderDetailsResponse>(detailsKey, (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              status: nextStatus,
              status_label: response.data.status_label ?? old.data.status_label,
            },
          };
        });
      }
      await queryClient.refetchQueries({ queryKey: detailsKey });
    },
  });
};

export const useAssignDriver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      queryId,
    }: {
      id: number | string;
      data: AssignDriverPayload;
      queryId?: number | string;
      /** When assigning from the driver screen, refresh that driver's cache. */
      refreshDriverId?: number;
    }) => _OrderApi.assignDriver(id, data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['order', 'to-assign'] });
      const refetchId = variables.queryId ?? variables.id;
      await queryClient.refetchQueries({ queryKey: queryKeys.order.details(refetchId) });
      if (variables.refreshDriverId != null) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.driver.details(variables.refreshDriverId),
        });
      }
    },
  });
};

export const useFetchOrdersToAssign = (
  driverId: number,
  args: {
    filterByDriverCoverage: boolean;
    status?: 'pending' | 'preparing';
    isInstantDelivery: boolean;
  },
  enabled = true
) =>
  useQuery({
    queryKey: queryKeys.order.toAssign({
      driverId,
      filterByDriverCoverage: args.filterByDriverCoverage,
      status: args.status,
      isInstantDelivery: args.isInstantDelivery,
    }),
    queryFn: () =>
      _OrderApi.getOrdersToAssign({
        filter_by_driver_coverage: args.filterByDriverCoverage,
        driver_id: driverId,
        status: args.status,
        is_instant_delivery: args.isInstantDelivery,
      }),
    enabled: enabled && Number.isFinite(driverId) && driverId > 0,
  });

export const useChangeItemStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      data,
      orderId,
      queryId,
    }: {
      itemId: number | string;
      data: ChangeItemStatusPayload;
      orderId?: number | string;
      /** Use this for refetch to match the query key (e.g. route param string) */
      queryId?: number | string;
    }) => _OrderApi.changeItemStatus(itemId, data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', 'list'] });
      const refetchId = variables.queryId ?? variables.orderId;
      if (refetchId != null) {
        await queryClient.refetchQueries({
          queryKey: queryKeys.order.details(refetchId),
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['order'] });
      }
    },
  });
};
