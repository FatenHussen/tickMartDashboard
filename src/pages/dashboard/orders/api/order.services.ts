import type {
  OrderListResponse,
  AssignDriverPayload,
  OrderDetailsResponse,
  OrdersToAssignResponse,
  ChangeItemStatusPayload,
  ChangeOrderStatusPayload,
  ChangeOrderStatusResponse,
} from '../types/order.types';

import { apiRoutes, axiosInstance } from '@/api';

function normalizeOrderListResponse(raw: OrderListResponse): OrderListResponse {
  const items = raw?.data?.items ?? [];
  const normalizedItems = items.map((item: any) => {
    const fallbackDriver =
      item?.driver ??
      item?.driver_data ??
      item?.assigned_driver ??
      (item?.driver_id
        ? {
            id: Number(item.driver_id),
            name: item?.driver_name ?? undefined,
            phone: item?.driver_phone ?? '',
          }
        : undefined);

    return {
      ...item,
      driver: fallbackDriver,
    };
  });

  return {
    ...raw,
    data: {
      ...raw.data,
      items: normalizedItems,
    },
  };
}

export const _OrderApi = {
  getListOrders: async (params?: {
    page?: number;
    per_page?: number;
    status?: string;
    search?: string;
    driver_id?: number;
    sort_field?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<OrderListResponse> => {
    const response = await axiosInstance.get<OrderListResponse>(apiRoutes.order.list, {
      params,
    });
    return normalizeOrderListResponse(response.data);
  },

  getOrderById: async (id: number | string): Promise<OrderDetailsResponse> => {
    const response = await axiosInstance.get<OrderDetailsResponse>(apiRoutes.order.getOne(id));
    return response.data;
  },

  /**
   * Orders with no driver yet, optionally filtered by driver coverage.
   * When `filter_by_driver_coverage` is true, `driver_id` must be set.
   */
  getOrdersToAssign: async (params: {
    filter_by_driver_coverage?: boolean;
    driver_id?: number;
    status?: 'pending' | 'preparing';
    is_instant_delivery?: boolean;
  }): Promise<OrdersToAssignResponse> => {
    const filterByCoverage = Boolean(params.filter_by_driver_coverage);
    const instant = params.is_instant_delivery ?? true;

    // Laravel `boolean` rule: send 0/1 so query-string serialization is never ambiguous (JS `true`/`false` can fail validation).
    const queryParams: Record<string, number | string> = {
      filter_by_driver_coverage: filterByCoverage ? 1 : 0,
      is_instant_delivery: instant ? 1 : 0,
    };

    if (params.status) {
      queryParams.status = params.status;
    }
    if (filterByCoverage && params.driver_id != null) {
      queryParams.driver_id = params.driver_id;
    }

    const response = await axiosInstance.get<OrdersToAssignResponse>(apiRoutes.order.toAssign, {
      params: queryParams,
    });
    return response.data;
  },

  changeOrderStatus: async (
    id: number | string,
    data: ChangeOrderStatusPayload
  ): Promise<ChangeOrderStatusResponse> => {
    const response = await axiosInstance.patch<ChangeOrderStatusResponse>(
      apiRoutes.order.changeStatus(id),
      data
    );
    return response.data;
  },

  assignDriver: async (
    id: number | string,
    data: AssignDriverPayload
  ): Promise<any> => {
    const response = await axiosInstance.post(apiRoutes.order.assignDriver(id), data);
    return response.data;
  },

  changeItemStatus: async (
    itemId: number | string,
    data: ChangeItemStatusPayload
  ): Promise<any> => {
    const response = await axiosInstance.patch(apiRoutes.order.changeItemStatus(itemId), data);
    return response.data;
  },
};
