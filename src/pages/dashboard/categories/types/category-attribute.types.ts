// ----------------------------------------------------------------------

export interface CategoryAttributeValue {
  id?: number;
  /** List payloads may send a display string; create/edit uses `{ ar, en }`. */
  name:
    | {
        ar: string;
        en: string;
      }
    | string;
}

export interface CategoryAttributeData {
  id: number;
  /** Root category the attribute is saved on (always a root — see root_category_id). */
  category_id?: number;
  /** Same value as category_id; the attribute is always resolved/saved on the root. */
  root_category_id?: number;
  name: string | { ar?: string; en?: string };
  category: string;
  type: string;
  /** Values defined on the root; inherited by every subcategory. */
  values?: CategoryAttributeValue[];
  is_active?: boolean;
}

export interface CategoryAttributeListResponse {
  status: boolean;
  message: string;
  data: {
    items: CategoryAttributeData[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}

export interface CategoryAttributeDetailData {
  id: number;
  /** Root category the attribute is saved on (always a root — see root_category_id). */
  category_id?: number;
  /** Same value as category_id; the attribute is always resolved/saved on the root. */
  root_category_id?: number;
  name: {
    ar: string;
    en: string;
  };
  category: string;
  type: string;
  values: CategoryAttributeValue[];
  is_active?: boolean;
}

export interface CategoryAttributeDetailResponse {
  status: boolean;
  message: string;
  data: CategoryAttributeDetailData;
}

export interface CategoryAttributeCreateUpdatePayload {
  category_id: number;
  name: {
    en: string;
    ar: string;
  };
  type: string;
  values?: Array<{
    /** Required on update for existing values so the backend keeps the same row/id. */
    id?: number;
    name: {
      en: string;
      ar: string;
    };
  }>;
}

// ----------------------------------------------------------------------
// Delete impact preview

export interface CategoryAttributeDeleteWarning {
  key: string;
  count: number;
  /** Already translated server-side per the request's language. */
  message: string;
}

export interface CategoryAttributeDeleteImpactData {
  type: string;
  id: number;
  name: { ar: string; en: string } | string;
  requires_confirmation: boolean;
  counts?: Partial<{
    attribute_values: number;
    product_variants: number;
    products: number;
    active_orders: number;
  }>;
  warnings?: CategoryAttributeDeleteWarning[];
}

export interface CategoryAttributeDeleteImpactResponse {
  status: boolean;
  message: string;
  data: CategoryAttributeDeleteImpactData;
}

export interface CategoryAttributeLinkedItem {
  variant_id: number;
  /** `{}`/`[]` when the variant has no translated name — fall back to the product name. */
  variant_name: { ar?: string; en?: string } | Record<string, never> | unknown[];
  sku: string | null;
  variant_image: string | null;
  product: {
    id: number;
    product_number: string;
    name: string;
    image: string | null;
    category: { id: number; name: string };
  };
  used_values: Array<{ id: number; name: string; hex?: string | null }>;
}

export interface CategoryAttributeLinkedItemsResponse {
  status: boolean;
  message: string;
  data: {
    items: CategoryAttributeLinkedItem[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}

