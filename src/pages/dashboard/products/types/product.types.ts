// ----------------------------------------------------------------------

/** Product item as returned in the LIST response (flat/translated names) */
export interface ProductData {
  id: number;
  category_id: string | number;
  brand_id: string | number | null;
  /** When the list API embeds category relation */
  category?: { id: number; name: string | { en: string; ar: string } } | null;
  /** When the list API embeds vendor (seller) */
  vendor?: { id: number; name: string | { en: string; ar: string } } | null;
  /** Primary shop or first shop name source */
  shop?: { id: number; name: string | { en: string; ar: string } } | null;
  /** Multiple shops (list endpoints may return this shape) */
  shops?: Array<{ id?: number; name?: string; shop_name?: string }> | null;
  name: string;
  description: string;
  full_description: string | null;
  country: string | null;
  sku: string | null;
  model: string | null;
  price: number;
  price_after_discount: number | null;
  discount?: number | null;
  discount_type?: string | null;
  quantity: number | null;
  barcode: string | null;
  time_prepare: string | null;
  bought_with: number[] | { id: number; name?: string }[] | null;
  is_instant_delivery: boolean | number;
  is_visible?: boolean | number;
  image: string | null;
  images: string[];
  thumbnail?: string | null;
  created_at: string;
  approval_status?: string | null;
  approval_status_label?: string | null;
  /** Shelf life / expiry (ISO or YYYY-MM-DD from API) */
  expiry_date?: string | null;
  is_restaurant?: boolean;
  /** `platform` = site/Tikmool; `shop` = linked to branch(es). */
  sale_channel?: 'platform' | 'shop' | string | null;
}

/** Per-currency breakdown from product detail API (`price_currencies`, `cost_price_currencies`, etc.) */
export interface ProductDetailCurrencyAmount {
  amount: number;
  currency: string;
  symbol: string;
  formatted: string;
}

/** Product as returned in the SINGLE/DETAIL response (bilingual fields + relations) */
export interface ProductDetailData {
  id: number;
  /** Optional merchandising / ERP reference */
  product_number?: string | null;
  category_id: number;
  brand_id: number | null;
  vendor_id?: number | null;
  /** `platform` = sold on site (auto platform shop); `shop` = explicit branch links. */
  sale_channel?: 'platform' | 'shop' | string | null;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  full_description: { en: string; ar: string } | null;
  country_id?: number | null;
  sale_country_id?: number | null;
  /**
   * Country of origin: legacy bilingual object from older API, or relation `{ id, name }`.
   */
  country?:
    | { en: string; ar: string }
    | { id: number; name: string | { en: string; ar: string } }
    | null;
  /** Origin country relation (current API — `/admin/countries`) */
  origin_country?: { id: number; name: string | { en: string; ar: string } } | null;
  /** Sale market (from `/admin/sale-countries`); `name` may be a plain string */
  sale_country?: { id: number; name: string | { en: string; ar: string }; icon?: string | null } | null;
  price: number | null;
  /** When API uses `/admin/units` instead of free-text `unit`. */
  unit_id?: number | null;
  /** Human-readable primary price when API provides it */
  price_formatted?: string | null;
  /** Map keyed by ISO currency code (e.g. USD, SYP) */
  price_currencies?: Record<string, ProductDetailCurrencyAmount> | null;
  price_after_discount: number | null;
  price_after_discount_formatted?: string | null;
  price_after_discount_currencies?: Record<string, ProductDetailCurrencyAmount> | null;
  discount?: number | null;
  discount_type?: 'none' | 'percentage' | 'fixed' | string | null;
  cost_price?: number | null;
  cost_price_formatted?: string | null;
  cost_price_currencies?: Record<string, ProductDetailCurrencyAmount> | null;
  quantity: number | null;
  /** Aggregated sellable stock when API provides it (may differ from `quantity`). */
  stock?: number | null;
  max_purchase_quantity?: number | null;
    unit?: string | { id?: number; name?: string | { en: string; ar: string } } | null;
  warranty_period?: number | null;
  warranty_id?: number | null;
  warranty?: {
    id: number;
    name?: string | { en?: string; ar?: string } | null;
    description?: string | { en?: string; ar?: string } | null;
  } | null;
  sku: string | null;
  model: string | null;
  barcode: string | null;
  time_prepare: string | null;
  /** Product-level delivery time (e.g. external vendors). */
  delivery_time?: string | null;
  /** Product shelf life / expiry (ISO date string from API). */
  expiry_date?: string | null;
  bought_with: number[] | Array<{ id: number; name?: string }>;
  is_instant_delivery: boolean | number;
  is_visible?: boolean | number;
  is_restaurant?: boolean;
  thumbnail?: string | null;
  category: { id: number; name: string; is_restaurant?: boolean };
  brand: { id: number; name: string } | null;
  vendor?: { id: number; name: string } | null;
  approval_status?: string | null;
  approval_status_label?: string | null;
  rejection_reason?: string | null;
  seo_title?: { en: string; ar: string } | null;
  seo_description?: { en: string; ar: string } | null;
  /** API may return comma-separated strings or string arrays per locale. */
  seo_keywords?:
    | { ar?: string[] | string; en?: string[] | string }
    | Record<string, string[] | string>
    | null;
  seo_image?: string | null;
  variants: Array<{
    id: number;
    name?: string | { en: string; ar: string };
    sku?: string | null;
    model?: string | null;
    barcode?: string | null;
    is_trend?: boolean | number;
    is_active?: boolean | number;
    attributes: Array<{ attribute: string; value: string; type: string }>;
    /** Sale price/stock now live on the variant itself — shared across every shop. */
    price: number;
    price_currencies?: Record<string, ProductDetailCurrencyAmount> | null;
    discount?: number | null;
    discount_type?: 'none' | 'percentage' | 'fixed' | string | null;
    discount_amount?: number | null;
    discount_currencies?: Record<string, ProductDetailCurrencyAmount> | null;
    price_after_discount?: number | null;
    price_after_discount_currencies?: Record<string, ProductDetailCurrencyAmount> | null;
    quantity: number;
    shops: Array<{
      id?: number;
      shop_id: number;
      shop_name: string;
      /** Branch purchase cost only — not a sale price; sale price lives on the variant above. */
      cost_price?: number | null;
      cost_price_currencies?: Record<string, ProductDetailCurrencyAmount> | null;
    }>;
    images: Array<{ id: number; url: string }>;
  }>;
  category_details: Array<{
    id: number;
    name: string;
    value: { en: string; ar: string };
    category_detail_id?: number;
    category_detail?: { id: number };
  }>;
  extra_details: Array<{
    id: number;
    category?: { id: number; name: string };
    key: { en: string; ar: string };
    value: { en: string; ar: string };
    price?: number | null;
    price_currencies?: Record<string, ProductDetailCurrencyAmount> | null;
    quantity?: number | null;
    product_extra_detail_id?: number | null;
  }>;
  images: Array<{ id: number; url: string }>;
  badges?: Array<{
    id: number;
    name?: string | { en: string; ar: string } | null;
    icon?: string | null;
    position?: string;
    postion?: string;
  }>;
  icons?: Array<{ id: number; name?: string; icon?: string }>;
  rating?: number;
  rating_count?: number;
}

/** List API: doc shape (`success` + `meta`) or legacy `status` + nested `data`. */
export interface ProductListResponse {
  success?: boolean;
  status?: boolean;
  message?: string;
  data?: unknown;
  meta?: {
    current_page: number;
    from?: number;
    last_page: number;
    per_page: number;
    to?: number;
    total: number;
  };
  links?: Record<string, string | null>;
}

export interface ProductDetailResponse {
  success?: boolean;
  status?: boolean;
  message?: string;
  data: ProductDetailData;
}

export type ProductDiscountType = 'none' | 'percentage' | 'fixed';

export interface ProductCreateUpdatePayload {
  /** Sent in multipart body on update so the backend always receives the product id (not only in the URL). */
  id?: number;
  category_id: number;
  brand_id?: number | null;
  vendor_id?: number;
  /** `platform` = site product (no shop_variants); `shop` = must send shop_variants. */
  sale_channel?: 'platform' | 'shop';
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  full_description?: { en: string; ar: string };
  country_id?: number;
  sale_country_id?: number;
  /** Sale price in USD. Prefer this over `price_syp` when both are set (API ignores SYP). */
  price?: number;
  /** Sale price in SYP — converted server-side when `price` is omitted. */
  price_syp?: number;
  discount?: number;
  discount_type?: ProductDiscountType;
  cost_price?: number;
  /** Cost in SYP — converted server-side when `cost_price` is omitted. */
  cost_price_syp?: number;
  /**
   * Product-level stock — optional on every product (with or without variants).
   * Omit when empty. Variant stock is `variants[].quantity`.
   */
  quantity?: number;
  /** Optional unique product code (رقم المنتج). */
  product_number?: string;
  unit_id?: number;
  /** Omit when empty. Never send `""` — MySQL rejects empty integer. */
  warranty_id?: number | null;
  sku?: string;
  model?: string;
  barcode?: string;
  time_prepare?: string;
  delivery_time?: string;
  /** `YYYY-MM-DD` for forms; API may return full ISO datetime. */
  expiry_date?: string;
  is_instant_delivery: number;
  is_visible?: number;
  thumbnail?: File;
  images?: File[];
  existing_media_ids?: number[];

  seo_title?: { en?: string; ar?: string };
  seo_description?: { en?: string; ar?: string };
  seo_keywords?: { en?: string; ar?: string };
  seo_image?: File;

  variants?: Array<{
    id?: number;
    attributes_values_ids: number[];
    images?: File[];
    existing_images_ids?: number[];
    sku?: string;
    model?: string;
    barcode?: string;
    /** Sale price for this SKU, shared across every shop. */
    price?: number;
    /** Sale price in SYP when `price` is omitted. */
    price_syp?: number;
    /** Stock for this SKU, shared across every shop. */
    quantity?: number;
    discount?: number;
    discount_type?: ProductDiscountType;
    max_purchase_quantity?: number;
    /** 0 | 1 for multipart */
    is_trend?: number;
    /** 0 | 1 for multipart */
    is_active?: number;
  }>;

  category_details?: Array<{
    id?: number;
    category_detail_id: number;
    detail_value: { en: string; ar: string };
  }>;

  extra_details?: Array<{
    id?: number;
    /** Preset row from `/admin/product-extra-details` */
    product_extra_detail_id: number;
    /** Omitted or empty in UI defaults to 1 */
    quantity?: number;
    price: number;
  }>;

  bought_with?: number[];

  shop_variants?: Array<{
    id?: number;
    shop_id: number;
    variant_index: number;
    /** Branch purchase cost only — not a sale price. */
    cost_price?: number;
  }>;

  badges?: number[];
  icon_ids?: number[];
}

// ----------------------------------------------------------------------

/** Single variant row from `GET /admin/products/:id/variants` */
export interface AdminProductVariantListItem {
  id: number;
  product_id: number;
  sku?: string | null;
  model?: string | null;
  barcode?: string | null;
  /** Variant-specific image URL (may be absolute or a storage path). */
  variant_image?: string | null;
  product: {
    id: number;
    name: string | { en: string; ar: string };
    description?: string | { en: string; ar: string };
    image?: string | null;
    category?: { id: number; name: string | { en: string; ar: string } };
    brand?: { id: number; name: string | { en: string; ar: string } };
    price?: number;
  };
  attributes: Array<{
    id: number;
    name: string | { en: string; ar: string };
    category_attribute?: { id: number; name: string | { en: string; ar: string }; type?: string };
  }>;
  is_trend?: boolean | number;
  is_active?: boolean;
  /** Sale price/stock now live on the variant itself — shared across every shop. */
  price: number;
  discount?: number | null;
  discount_type?: string | null;
  price_after_discount?: number | null;
  quantity: number;
  shop_variants: Array<{
    id: number;
    shop: { id: number; name: string };
    /** Branch purchase cost only — not a sale price. */
    cost_price?: number;
  }>;
  created_at?: string;
}

export interface AdminProductVariantsListApiResponse {
  status: boolean;
  message: string;
  data: {
    items: AdminProductVariantListItem[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}

/** `POST /api/admin/products/import` row failure. */
export interface ProductImportFailedRow {
  row: number;
  errors: string[];
}

export interface ProductImportResultData {
  created: number;
  updated: number;
  failed: ProductImportFailedRow[];
}

export interface ProductImportResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  data: ProductImportResultData;
}
