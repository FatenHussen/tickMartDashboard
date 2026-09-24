// ----------------------------------------------------------------------

export type OrderStatus =
  | 'pending'
  | 'waiting_approval'
  | 'preparing'
  | 'out_delivery'
  | 'delivered'
  | 'cancelled'
  | 'cancelled_by_admin'
  | 'rejected_by_delivery'
  | 'faild_deliver'
  | 'returned_by_user';

/** All statuses known from the admin orders API (filters / labels). */
export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'waiting_approval',
  'preparing',
  'out_delivery',
  'delivered',
  'cancelled',
  'cancelled_by_admin',
  'rejected_by_delivery',
  'faild_deliver',
  'returned_by_user',
];

/** Values allowed on PATCH …/orders/items/{id}/change-status. */
export const ORDER_ITEM_STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'preparing',
  'out_delivery',
  'delivered',
];

/** Forward fulfillment flow only (no going back to a previous step). */
export const ORDER_STATUS_PIPELINE: OrderStatus[] = [
  'pending',
  'preparing',
  'out_delivery',
  'delivered',
];

/** Admin may restart fulfillment from these terminal / failure states. */
export const ORDER_STATUSES_REOPEN_PIPELINE: OrderStatus[] = [
  'cancelled',
  'cancelled_by_admin',
  'rejected_by_delivery',
  'faild_deliver',
  'returned_by_user',
];

/** Allowed next statuses per backend transition rules (admin change-status). */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled', 'cancelled_by_admin'],
  waiting_approval: ['preparing', 'cancelled', 'cancelled_by_admin'],
  preparing: ['out_delivery', 'cancelled', 'cancelled_by_admin'],
  out_delivery: ['delivered', 'cancelled', 'cancelled_by_admin'],
  delivered: [],
  cancelled: [...ORDER_STATUS_PIPELINE],
  cancelled_by_admin: [...ORDER_STATUS_PIPELINE],
  rejected_by_delivery: [...ORDER_STATUS_PIPELINE],
  faild_deliver: [...ORDER_STATUS_PIPELINE],
  returned_by_user: [...ORDER_STATUS_PIPELINE],
};

/** Blocks assigning or changing driver (includes in-transit). */
export function orderStatusBlocksAssignDriver(status: OrderStatus): boolean {
  return (
    status === 'delivered' ||
    status === 'out_delivery' ||
    status === 'cancelled' ||
    status === 'cancelled_by_admin' ||
    status === 'rejected_by_delivery' ||
    status === 'faild_deliver' ||
    status === 'returned_by_user'
  );
}

/** Blocks “reject order” when already in a terminal outcome. */
export function orderStatusBlocksReject(status: OrderStatus): boolean {
  return (
    status === 'delivered' ||
    status === 'cancelled' ||
    status === 'cancelled_by_admin' ||
    status === 'rejected_by_delivery' ||
    status === 'faild_deliver' ||
    status === 'returned_by_user'
  );
}

/**
 * Next statuses the admin may choose (matches API transitions).
 * Prefer this over skipping ahead in the pipeline.
 */
export function getAllowedOrderStatusTransitions(current: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[current] ?? [];
}

/** Statuses strictly after the current step in the pipeline (skip allowed), or full pipeline when reopening. */
export function getUpcomingOrderStatuses(current: OrderStatus): OrderStatus[] {
  return getAllowedOrderStatusTransitions(current).filter((s) =>
    ORDER_STATUS_PIPELINE.includes(s)
  );
}

/**
 * Parse API / inconsistent strings to a canonical status.
 * Returns `null` for unknown non-empty values — never coerce those to `pending`.
 */
export function parseOrderStatus(
  raw: string | number | boolean | undefined | null
): OrderStatus | null {
  // Never treat boolean success flags (`response.status`) as order status.
  if (raw == null || raw === '' || typeof raw === 'boolean') return null;
  const s = String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!s || s === 'true' || s === 'false') return null;

  const aliases: Record<string, OrderStatus> = {
    pending: 'pending',
    waiting_approval: 'waiting_approval',
    waitingapproval: 'waiting_approval',
    preparing: 'preparing',
    out_delivery: 'out_delivery',
    out_for_delivery: 'out_delivery',
    outfordelivery: 'out_delivery',
    delivered: 'delivered',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    cancelled_by_admin: 'cancelled_by_admin',
    canceled_by_admin: 'cancelled_by_admin',
    cancelledbyadmin: 'cancelled_by_admin',
    rejected_by_delivery: 'rejected_by_delivery',
    rejectedbydelivery: 'rejected_by_delivery',
    faild_deliver: 'faild_deliver',
    failed_deliver: 'faild_deliver',
    failed_delivery: 'faild_deliver',
    failddeliver: 'faild_deliver',
    returned_by_user: 'returned_by_user',
    returnedbyuser: 'returned_by_user',
  };

  if (aliases[s]) return aliases[s];
  if ((ORDER_STATUS_OPTIONS as readonly string[]).includes(s)) return s as OrderStatus;
  return null;
}

/**
 * Map API / inconsistent strings to a canonical status so comparisons and
 * `<select value={…}>` work.
 *
 * Empty / missing → `pending` (draft default only).
 * Unknown non-empty values are **not** mapped to `pending` — callers that need
 * a guaranteed `OrderStatus` for styling should use `parseOrderStatus` + fallback UI.
 */
export function normalizeOrderStatus(
  raw: string | number | boolean | undefined | null
): OrderStatus {
  return parseOrderStatus(raw) ?? 'pending';
}

export interface OrderUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

export interface OrderItemProduct {
  id: number;
  name: string | { ar?: string; en?: string };
  price: number;
  image?: string;
}

export interface OrderItem {
  id: number;
  product: OrderItemProduct;
  quantity: number;
  price: number;
  status: OrderStatus;
  status_label?: string | null;
  variant?: {
    id: number;
    attributes?: Array<{ name: string; value: string }>;
  };
}

export interface OrderDriver {
  id: number;
  name?: string;
  phone: string;
  address?: string;
  status?: string;
  is_active?: number | boolean;
  rate_per_order?: string | number;
}

export interface OrderPaymentMethod {
  id: number;
  name: string;
  /** Relative path or absolute URL (e.g. payments/image3.png) */
  icon?: string | null;
}

export interface OrderData {
  id: number;
  /** Human-readable reference from API (e.g. ORD-260325-00022) */
  order_code?: string;
  /** @deprecated Some responses used this name; prefer `order_code` */
  order_number?: string;
  status: OrderStatus;
  /** Arabic (or localized) label from API when present */
  status_label?: string | null;
  total: number;
  /** Sum of line items before delivery (often after basket/coupon discounts) */
  subtotal?: number;
  delivery_price?: number;
  /** Legacy combined discount; list API may use `basket_discount` / `coupon_discount` instead */
  discount?: number;
  /** List API: basket line discount total */
  basket_discount?: number;
  coupon_discount?: number | null;
  subscription_discount?: string | number;
  price_after_discount?: number;
  rating?: number;
  user: OrderUser;
  driver?: OrderDriver;
  payment_method?: OrderPaymentMethod | null;
  items?: OrderItem[];
  address?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface OrderListResponse {
  status: boolean;
  message: string;
  data: {
    items: OrderData[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}

export interface OrderDetailAffiliate {
  affiliate_rate: string;
  affiliate_source: string;
  affiliate_commission: number;
  affiliate_commission_type?: string;
  affiliate_fixed_commission?: number | string;
  affiliate_commission_amount?: number;
}

export interface OrderDetailTimestamps {
  pending_at: string | null;
  preparing_at: string | null;
  out_delivery_at: string | null;
  delivered_at: string | null;
  returned_by_user_at?: string | null;
}

export interface OrderDetailUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  area?: string;
  address?: string;
  is_active?: boolean;
  affiliate: {
    is_affiliate: boolean;
    affiliate_approved: boolean;
    affiliate_id: string;
  };
  created_at: string;
}

export interface OrderDetailDriver {
  id: number;
  name: string;
  phone: string;
  status: string;
  image: string | null;
  rate_per_order: number;
  is_active: boolean;
  average_rating: number;
  total_orders: number;
  completed_orders: number;
  total_earnings: number;
  created_at: string;
}

export interface OrderDetailItemVariantAttribute {
  type: string;
  value: string;
  attribute: string;
}

/** Optional line extra from cart (name/price varies by API). */
export interface OrderDetailItemExtra {
  id?: number;
  name?: string;
  label?: string;
  price?: number;
  quantity?: number;
  [key: string]: unknown;
}

export interface OrderDetailItem {
  id: number;
  product_name: string;
  product_image?: string | null;
  note?: string | null;
  quantity: number;
  /** Legacy list/detail field; detail API may use `unit_price` / `final_price` instead. */
  price?: number;
  unit_price?: number;
  final_price?: number;
  subtotal?: number;
  total?: number;
  unit_price_formatted?: string | null;
  final_price_formatted?: string | null;
  subtotal_formatted?: string | null;
  total_formatted?: string | null;
  extras_total?: number;
  extras_total_formatted?: string | null;
  discount?: number;
  status: OrderStatus;
  status_label?: string | null;
  delivery_time?: string | null;
  extras?: OrderDetailItemExtra[] | null;
  variant_attributes?:
    | Array<OrderDetailItemVariantAttribute>
    | Record<string, string | OrderDetailItemVariantAttribute>
    | null;
}

export interface OrderDetailData {
  id: number;
  order_code: string;
  status: OrderStatus;
  /** Prefer for display when present (API Arabic label). */
  status_label?: string | null;
  rejection_reason?: string | null;
  cart_type: string;
  is_instant_delivery: boolean;
  is_paid: boolean;
  delivery_price: number;
  currency?: string;
  currency_symbol?: string;
  subtotal: number;
  total: number;
  /** Present on some responses; otherwise derive from `total` or `total + delivery`. */
  total_with_delivery?: number;
  subtotal_formatted?: string | null;
  delivery_price_formatted?: string | null;
  total_formatted?: string | null;
  total_quantity: number;
  basket_discount: number;
  basket_discount_formatted?: string | null;
  coupon_discount: number | null;
  assigned_by: string;
  coupon_discount_from_points: string;
  free_delivery_from_points: number;
  used_coupon_exchange_id?: number | null;
  use_coupon_exchange_id?: number | null;
  used_free_delivery_exchange_id?: number | null;
  use_free_delivery_exchange_id?: number | null;
  created_at: string;
  affiliate: OrderDetailAffiliate | null;
  timestamps: OrderDetailTimestamps;
  user: OrderDetailUser;
  driver: OrderDetailDriver | null;
  user_address: any | null;
  baskes: any | null;
  basket_schedule: any | null;
  items: OrderDetailItem[];
}

/** Dropdown option from `GET /orders/to-assign`. */
export interface OrderToAssignOption {
  id: number;
  value: string;
}

export interface OrdersToAssignResponse {
  status: boolean;
  message: string;
  data: OrderToAssignOption[];
}

export interface OrderDetailsResponse {
  status: boolean;
  message: string;
  data: OrderDetailData;
}

export interface ChangeOrderStatusResponse {
  status: boolean;
  message: string;
  data: Partial<OrderDetailData> & {
    id: number;
    status: OrderStatus;
    status_label?: string | null;
  };
}

export interface ChangeOrderStatusPayload {
  status: OrderStatus;
  /** Required when rejecting / cancelling by admin (see API rules). */
  rejection_reason?: string;
}

export interface AssignDriverPayload {
  driver_id: number;
}

export interface ChangeItemStatusPayload {
  status: OrderStatus;
}
