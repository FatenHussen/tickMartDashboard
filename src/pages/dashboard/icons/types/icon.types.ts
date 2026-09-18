export interface IconItem {
  id: number;
  name: string | { en: string; ar: string };
  /** Seeded SVG URL (`storage/icons/*.svg`). Same asset as `image`. */
  icon?: string | null;
  image: string;
  description: string | { en: string; ar: string } | null;
  full_description?: { en: string; ar: string } | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IconListResponse {
  status: boolean;
  message: string;
  data: {
    items: IconItem[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}

export interface IconDetailsResponse {
  status: boolean;
  message: string;
  data: IconItem;
}

export interface IconCreatePayload {
  name: { en: string; ar: string };
  image: File | null;
  description?: { en: string; ar: string };
  full_description?: { en: string; ar: string };
  is_active?: boolean;
}
