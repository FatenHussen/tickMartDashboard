import i18n from '@/lib/i18n';
import { numberFormatLocaleForUi, normalizeIndicNumeralsToLatin } from '@/utils/numeral-locale';

const CURRENCY_SYMBOL_AR = 'ل.س';
const CURRENCY_SYMBOL_EN = 'SYP';

type FormatDecimalOptions = {
  maxDecimals?: number;
  locale?: string;
};

type FormatCurrencyOptions = {
  decimals?: number;
  symbol?: boolean;
};

type FormatMoneyLineOptions = {
  maxDecimals?: number;
  locale?: string;
};

function parseNumeric(value: number | string | null | undefined): number | null {
  const numeric =
    typeof value === 'number'
      ? value
      : Number.parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

/** Format a number without trailing zeros (e.g. 100.00 -> 100, 55.50 -> 55.5). */
export function formatDecimal(
  value: number | string | null | undefined,
  options: FormatDecimalOptions = {}
): string {
  const { maxDecimals = 2, locale = numberFormatLocaleForUi(i18n.language) } = options;
  const numeric = parseNumeric(value);
  if (numeric === null) return '—';

  return normalizeIndicNumeralsToLatin(
    numeric.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    })
  );
}

/** Strip trailing zeros from decimal portions in pre-formatted API money strings. */
export function normalizeFormattedMoneyText(text: string | null | undefined): string {
  if (!text) return '—';
  const trimmed = text.trim();
  if (!trimmed) return '—';

  const normalized = trimmed.replace(/(\d[\d,]*)\.(\d+)/g, (_match, intPart: string, frac: string) => {
    const trimmedFrac = frac.replace(/0+$/, '');
    return trimmedFrac ? `${intPart}.${trimmedFrac}` : intPart;
  });

  return normalizeIndicNumeralsToLatin(normalized);
}

/**
 * Prefer numeric fallback when available; otherwise normalize API formatted strings.
 */
export function formatMoneyLine(
  formatted: string | null | undefined,
  fallback: unknown,
  options: FormatMoneyLineOptions = {}
): string {
  const numeric = parseNumeric(fallback as number | string | null | undefined);
  if (numeric !== null) {
    return formatDecimal(numeric, options);
  }

  if (formatted != null && String(formatted).trim() !== '') {
    return normalizeFormattedMoneyText(String(formatted));
  }

  return '—';
}

export function formatCurrency(
  value: number | string | null | undefined,
  options: FormatCurrencyOptions = {}
): string {
  const { decimals = 2, symbol = true } = options;
  const numeric = parseNumeric(value);

  if (numeric === null) {
    const zero = symbol ? normalizeIndicNumeralsToLatin(`0 ${getCurrencySymbol()}`) : '0';
    return zero;
  }

  const formatted = formatDecimal(numeric, { maxDecimals: decimals });

  if (!symbol) return formatted;

  return normalizeIndicNumeralsToLatin(`${formatted} ${getCurrencySymbol()}`);
}

export function getCurrencySymbol(): string {
  return i18n.language === 'ar' ? CURRENCY_SYMBOL_AR : CURRENCY_SYMBOL_EN;
}

/** Row shape from API multi-currency maps (`*_currencies`). */
export type ApiCurrencyAmount = {
  amount: number;
  currency: string;
  symbol?: string;
  formatted?: string;
};

function isArabicLanguage(lng: string): boolean {
  return lng === 'ar' || lng.startsWith('ar');
}

function formatAmountForLocale(amount: number, lng: string): string {
  return formatDecimal(amount, {
    maxDecimals: 2,
    locale: numberFormatLocaleForUi(lng),
  });
}

/**
 * One label per locale: Arabic prefers the API symbol (e.g. ل.س), English the ISO code (e.g. SYP).
 * Avoids showing both the code and a formatted string that already includes the other script.
 */
export function formatApiCurrencyAmountForLanguage(
  block: ApiCurrencyAmount | null | undefined,
  language?: string
): string {
  if (!block) return '—';
  const raw = typeof block.amount === 'number' ? block.amount : Number(block.amount);
  if (!Number.isFinite(raw)) return '—';
  const lng = language ?? i18n.language;

  if (isArabicLanguage(lng)) {
    const sym = (block.symbol ?? '').trim() || (block.currency ?? '').trim();
    if (!sym) return formatAmountForLocale(raw, lng);
    return `${sym} ${formatAmountForLocale(raw, lng)}`;
  }

  const code = (block.currency ?? '').trim();
  if (!code) return formatAmountForLocale(raw, lng);
  return `${code} ${formatAmountForLocale(raw, lng)}`;
}
