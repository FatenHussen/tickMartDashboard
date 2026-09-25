import { isActiveLanguageArabic } from 'src/lib/language-code';

// ----------------------------------------------------------------------

export type TranslatedValue =
  | string
  | { ar?: string; en?: string }
  | null
  | undefined
  | unknown[];

/**
 * Safely format a value that may be a string or { ar, en } object.
 * Picks `ar` or `en` based on the active UI language (i18n).
 */
export function formatTranslated(value: TranslatedValue, fallback = '-'): string {
  if (value == null) return fallback;
  if (Array.isArray(value)) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'object' && (value.ar != null || value.en != null)) {
    const obj = value as { ar?: string; en?: string };
    if (isActiveLanguageArabic()) {
      return obj.ar || obj.en || fallback;
    }
    return obj.en || obj.ar || fallback;
  }
  return fallback;
}

/**
 * Banner card title. Active language first, then the other.
 * `null`, `""`, or `{ ar: null, en: null }` → empty (image only).
 */
export function bannerCardName(title: unknown): string {
  if (typeof title === 'string') return title.trim();
  if (title && typeof title === 'object' && !Array.isArray(title)) {
    const locale = title as { ar?: string | null; en?: string | null };
    const primary = isActiveLanguageArabic() ? locale.ar : locale.en;
    const secondary = isActiveLanguageArabic() ? locale.en : locale.ar;
    return (primary || secondary || '').trim();
  }
  return '';
}

/** Pick the first non-empty label from title/name fields (string or `{ ar, en }`). */
export function resolveItemDisplayLabel(
  ...values: (TranslatedValue | undefined)[]
): string {
  for (const value of values) {
    const label = formatTranslated(value, '');
    if (label) return label;
  }
  return '';
}
