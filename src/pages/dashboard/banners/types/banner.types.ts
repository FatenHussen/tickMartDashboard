// ----------------------------------------------------------------------

export interface BannerItem {
  id: number;
  title: string | { en?: string; ar?: string };
  description: string | { en?: string; ar?: string } | any[] | null;
  button_text?: string | { en?: string; ar?: string } | null;
  image_url: string;
  link?: string | null;
  is_active: number;
  order: number;
  created_at: string;
  /** null / missing = permanent banner */
  expires_at?: string | null;
}

export interface BannerListResponse {
  status: boolean;
  message: string;
  data: {
    items: BannerItem[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}

/** Form values — all optional except `image` required on create (enforced by Zod). */
export interface BannerFormValues {
  title: {
    en: string;
    ar: string;
  };
  description: {
    en: string;
    ar: string;
  };
  button_text: {
    en: string;
    ar: string;
  };
  image: File | null;
  link: string;
  /** `datetime-local` value; empty = permanent (null on API) */
  expires_at: string;
}
