// ----------------------------------------------------------------------

export interface CurrencyData {
  id: number;
  code: string;
  name: { ar?: string; en?: string } | string;
  symbol: string;
  exchange_rate: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurrencyListResponse {
  status: boolean;
  message: string;
  data: {
    items: CurrencyData[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    } | null;
  };
}

export interface CurrencyDetailsResponse {
  status: boolean;
  message: string;
  data: CurrencyData;
}

export interface CurrencyCreateUpdatePayload {
  code: string;
  name: { ar: string; en: string };
  symbol: string;
  exchange_rate: number;
  is_default?: boolean;
  is_active?: boolean;
}
