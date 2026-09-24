// ----------------------------------------------------------------------

export interface BannerItem {
  id: number;
  title: string | { en?: string; ar?: string };
  description: string | { en?: string; ar?: string } | any[] | null;
  button_text?: string | { en?: string; ar?: string } | null;
  image_url: string;
  link?: string;
  is_active: number;
  order: number;
  created_at: string;
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

export interface BannerCreatePayload {
  'title.en': string;
  'title.ar': string;
  'description.en': string;
  'description.ar': string;
  'button_text.en': string;
  'button_text.ar': string;
  image: File;
  link: string;
  expires_at: string;
}

export interface BannerUpdatePayload {
  _method: 'PATCH';
  'title.en': string;
  'title.ar': string;
  'description.en': string;
  'description.ar': string;
  'button_text.en': string;
  'button_text.ar': string;
  image?: File;
  link: string;
  expires_at: string;
}

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
  /** `datetime-local` value in the form; sent to API as ISO via services */
  expires_at: string;
}
