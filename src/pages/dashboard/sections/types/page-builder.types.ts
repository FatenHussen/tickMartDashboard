import type { Pagination, PageSectionListItem } from './page-section.types';

// ----------------------------------------------------------------------

/** Row returned by `GET /api/admin/pages` (paginated list). */
export interface PageBuilderListItem {
  id: number;
  title: string | { ar?: string; en?: string };
  slug: string;
  filters?: Record<string, unknown> | null;
  sections_count?: number;
  /** Auto-generated page that belongs to a category — never created/deleted manually. */
  is_category_page?: boolean;
  /** Linked category id when `is_category_page` is true. */
  category_id?: number | null;
  /** `false` on category pages — deletion happens via `DELETE /admin/categories/{id}`. */
  can_delete_page?: boolean;
  /** `false` on category pages — title/slug follow the category and reject direct edits (422). */
  can_edit_metadata?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PageBuilderListResponse {
  status: boolean;
  message: string;
  data: {
    items: PageBuilderListItem[];
    pagination: Pagination;
  };
}

/** `GET /api/admin/pages/{page}` — page with its linked sections (AdminOneResource shape). */
export interface PageBuilderDetails extends PageBuilderListItem {
  sections?: PageSectionListItem[];
  /** Category pages only: the endpoint that actually removes this page, e.g. `DELETE /api/admin/categories/12`. */
  delete_page_via?: string;
}

export interface PageBuilderDetailsResponse {
  status: boolean;
  message: string;
  data: PageBuilderDetails;
}

export interface PageCreateUpdatePayload {
  title: string;
  /** Optional — derived from `title` server-side when omitted. Must be unique. */
  slug?: string;
  filters?: Record<string, unknown>;
}

export type PageBuilderListQueryParams = {
  page?: number;
  per_page?: number;
  search?: string;
  sort_field?: string;
  sort_order?: string;
  /** `content` = regular pages only, `category` = auto category pages only. Omit for all. */
  type?: 'content' | 'category';
  /** Returns the page of one specific category. */
  category_id?: number;
};

// ----------------------------------------------------------------------

export type UnifiedSectionType = 'manual' | 'api';

/** Section arrangement on the page. */
export type UnifiedSectionLayout = 'slider' | 'list' | 'grid';

/** Card shape inside the section. */
export type UnifiedSectionVariant = 'horizontal' | 'vertical' | 'square';

/** Row returned by `GET /api/admin/pages/{page}/sliders` — every existing section. */
export interface SliderLibraryItem {
  id: number;
  name: string | { ar?: string; en?: string };
  content_type?: string;
  type?: UnifiedSectionType;
  layout?: string;
  variant?: string;
  background_color?: string | null;
  background_card_color?: string | null;
  /** First banner image when `content_type` is `banner`. `null` = no image. */
  image_url?: string | null;
  /** How many pages already use this section. */
  pages_count?: number;
}

export interface SliderLibraryResponse {
  status: boolean;
  message: string;
  data: {
    items: SliderLibraryItem[];
    pagination: Pagination;
  };
}

export type SliderLibraryQueryParams = {
  page?: number;
  per_page?: number;
  search?: string;
  content_type?: string;
  type?: UnifiedSectionType;
};

/**
 * Payload for `POST /api/admin/pages/{page}/sections`.
 * Pass `section_id` to link an existing section (name/variant/colors are copied,
 * and may be overridden). Or send the full section body (`type` + `content_type`
 * + items/filters) to create and link in one call.
 */
export interface UnifiedSectionCreatePayload {
  type?: UnifiedSectionType;
  /** Link an existing section. Other content fields are ignored. */
  section_id?: number;
  name?: { ar: string; en: string };
  content_type?: string;
  /** Sent with `type=api` so the backend knows which feed to run. */
  api_method?: string;
  /** Required when creating with `type=manual` (create-and-link). */
  item_ids?: Array<{ item_id: number; order: number; link?: string | null }>;
  /** Display filters when creating with `type=api`. */
  filters?: Record<string, unknown>;
  position?: 'before' | 'after';
  /** Defaults to last order + 1 server-side. */
  order?: number;
  /** Section arrangement: slider | list | grid. */
  layout?: UnifiedSectionLayout;
  /** Card shape: horizontal | vertical | square. */
  variant?: UnifiedSectionVariant;
  background_color?: string;
  background_card_color?: string;
  show_when?: Record<string, unknown>;
  /**
   * Backend-owned content-type id (banner/product/shop…).
   * Never send from the dashboard — the API sets it from the linked section.
   */
  display_type_id?: number;
}
