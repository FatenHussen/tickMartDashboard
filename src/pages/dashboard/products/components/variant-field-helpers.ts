import type { CurrencyData } from '@/pages/dashboard/currencies/types/currency.types';

export function optionalNumberInputDisplay(v: unknown): string | number {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return n;
}

export function toTwoDecimalNumber(raw: string): number | undefined {
  if (raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;
  return Math.round(value * 100) / 100;
}

export function toOptionalInt(raw: unknown): number | undefined {
  if (raw === '' || raw === null || raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.floor(n));
}

/** Discount is an integer 0–100 (percentage and fixed). Empty stays empty. */
export function toOptionalDiscountInt(raw: unknown): number | undefined {
  const n = toOptionalInt(raw);
  if (n == null) return undefined;
  return Math.min(100, n);
}

export function toOptionalNumber(raw: unknown): number | undefined {
  if (raw === '' || raw === null || raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function parseCurrencyRate(c: CurrencyData): number {
  const r = Number((c as { exchange_rate?: string | number }).exchange_rate);
  return r > 0 ? r : 1;
}

export function usdToLocalAmount(usd: number, rate: number): number {
  return Math.round(usd * rate);
}

export function localAmountToUsd(local: number, rate: number): number {
  return Math.round((local / rate) * 100) / 100;
}

export function priceAfterDiscount(
  price: number | null | undefined,
  discountType: string | null | undefined,
  discount: number | null | undefined
): number {
  const p = Number(price) || 0;
  const d = Number(discount) || 0;
  if (!p || !discountType || discountType === 'none' || d <= 0) return p;
  if (discountType === 'percentage') return Math.round((p - p * (d / 100)) * 100) / 100;
  if (discountType === 'fixed') return Math.max(0, Math.round((p - d) * 100) / 100);
  return p;
}

export function formatLiveAfterDiscountPreview(
  priceUsd: number | null | undefined,
  discountType: string | null | undefined,
  discount: number | null | undefined,
  sypRate: number | null | undefined
): string {
  const usd = Number(priceUsd);
  if (!Number.isFinite(usd) || (usd === 0 && (priceUsd == null || priceUsd === undefined))) {
    return '';
  }
  const afterUsd = priceAfterDiscount(usd, discountType, discount);
  if (sypRate != null && sypRate > 0) {
    return `SYP ${usdToLocalAmount(afterUsd, sypRate)} · $${afterUsd}`;
  }
  return `$${afterUsd}`;
}
