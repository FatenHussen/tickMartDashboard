// ----------------------------------------------------------------------

export type ProductExtraDetailLangPair = {
  ar: string;
  en: string;
};

export interface ProductExtraDetailCategoryRef {
  id: number;
  name: string | ProductExtraDetailLangPair;
}

export interface ProductExtraDetailRowApi {
  id: number;
  category?: ProductExtraDetailCategoryRef;
  detail_key: string | ProductExtraDetailLangPair;
  detail_value?: string | ProductExtraDetailLangPair | null;
  price: number;
  is_active: boolean;
}

export interface ProductExtraDetailListResponse {
  status: boolean;
  message: string;
  data: {
    items: ProductExtraDetailRowApi[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}

export interface ProductExtraDetailDetailData {
  id: number;
  category: {
    id: number;
    name: ProductExtraDetailLangPair | string;
  };
  detail_key: ProductExtraDetailLangPair;
  detail_value?: ProductExtraDetailLangPair | null;
  price: number;
  is_active: boolean;
}

export interface ProductExtraDetailDetailResponse {
  status: boolean;
  message: string;
  data: ProductExtraDetailDetailData;
}

export interface ProductExtraDetailCreateUpdatePayload {
  category_id: number;
  detail_key: ProductExtraDetailLangPair;
  price: number;
  detail_value?: ProductExtraDetailLangPair;
  is_active: boolean;
}
