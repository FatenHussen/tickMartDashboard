// ----------------------------------------------------------------------

export type CustomOrderRequestStatus =
  | 'pending_pricing'
  | 'waiting_approval'
  | 'cancelled'
  | 'approved'
  | 'converted';

export const CUSTOM_ORDER_REQUEST_STATUS_OPTIONS: CustomOrderRequestStatus[] = [
  'pending_pricing',
  'waiting_approval',
  'cancelled',
  'approved',
  'converted',
];

export type CustomOrderLocalizedName = string | { ar?: string; en?: string } | null;

export interface CustomOrderRequestPaymentMethod {
  id?: number;
  name?: CustomOrderLocalizedName;
  code?: string | null;
  icon?: string | null;
}

export interface CustomOrderRequestUser {
  id: number;
  name?: CustomOrderLocalizedName;
  email?: string;
  phone?: string;
}

export interface CustomOrderRequestAddress {
  id?: number;
  label?: CustomOrderLocalizedName;
  street_name?: string | null;
  street?: string | null;
  /** String or `{ ar, en }` — never render the object itself. */
  area?: CustomOrderLocalizedName | { id?: number; name?: CustomOrderLocalizedName };
  full_address?: string;
  address?: string;
  building?: string;
  floor?: string;
  notes?: string;
  lat?: number | string;
  lng?: number | string;
}

export interface CustomOrderRequestImage {
  id?: number;
  url?: string;
  path?: string;
  image?: string;
}

export interface CustomOrderRequestListItem {
  id: number;
  user?: CustomOrderRequestUser | null;
  user_id?: number;
  status: CustomOrderRequestStatus | string;
  status_label?: string | null;
  /** Customer free-text request */
  description?: string | null;
  note?: string | null;
  text?: string | null;
  content?: string | null;
  images?: Array<string | CustomOrderRequestImage> | null;
  address?: string | CustomOrderRequestAddress | null;
  address_text?: string | null;
  expected_delivery_time?: string | null;
  expected_at?: string | null;
  delivery_time?: string | null;
  payment_method?: string | CustomOrderRequestPaymentMethod | null;
  approximate_total?: number | string | null;
  delivery_price?: number | string | null;
  order_id?: number | null;
  order?: { id: number; order_code?: string; status?: string } | null;
  admin_note?: string | null;
  rejection_reason?: string | null;
  is_instant_delivery?: boolean | number | null;
  price_variance_type?: 'percent' | 'fixed' | string | null;
  price_variance_value?: number | string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CustomOrderRequestListResponse {
  status: boolean;
  message: string;
  data: {
    items: CustomOrderRequestListItem[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}

export interface CustomOrderRequestDetailsResponse {
  status: boolean;
  message: string;
  data: CustomOrderRequestListItem;
}

export type ConvertCatalogItem = {
  type: 'catalog';
  shop_product_variant_id: number;
  quantity: number;
  note?: string;
  /** UI-only: unit price from catalog for live summary */
  unit_price?: number;
  /** UI-only label */
  label?: string;
};

export type ConvertExternalItem = {
  type: 'external';
  product_name: string;
  unit_price: number;
  quantity: number;
  note?: string;
  invoice_image?: File | null;
};

export type ConvertItemInput = ConvertCatalogItem | ConvertExternalItem;

export interface ConvertCustomOrderPayload {
  items: ConvertItemInput[];
  delivery_price?: number;
  approximate_total?: number;
  price_variance_type?: 'percent' | 'fixed';
  price_variance_value?: number;
  admin_note?: string;
  is_instant_delivery?: boolean;
}

export interface CancelCustomOrderPayload {
  rejection_reason: string;
}

export interface CustomOrderRequestListParams {
  page?: number;
  per_page?: number;
  status?: string;
  user_id?: number | string;
  search?: string;
  sort_field?: string;
  sort_order?: 'asc' | 'desc';
}
