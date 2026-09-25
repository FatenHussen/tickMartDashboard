// ----------------------------------------------------------------------

export interface BannerLocaleText {
  ar?: string | null;
  en?: string | null;
}

/** Details: `{ ar, en }` with `null` = cleared. List: localized string or `null`. */
export type BannerTextField = string | BannerLocaleText | null;

export interface BannerItem {
  id: number;
  title: BannerTextField;
  description: BannerTextField;
  button_text?: BannerTextField;
  image_url: string;
  link?: string | null;
  is_active: number | boolean;
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
