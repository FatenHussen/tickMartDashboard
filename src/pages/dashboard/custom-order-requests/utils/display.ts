import type { CustomOrderRequestListItem } from '../types/custom-order-request.types';

import { formatTranslated } from '@/utils/format-translated';
import { resolveStorageImageUrl } from '@/utils/shop-variant-image';

/**
 * Safe label for list/details cells. Never returns an object (React #31).
 * Handles strings, `{ ar, en }`, and `{ name }` / `{ title }` relations.
 */
export function customOrderDisplayText(...values: unknown[]): string {
  for (const value of values) {
    if (value == null || value === '') continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const text = String(value).trim();
      if (text) return text;
      continue;
    }
    if (typeof value === 'object') {
      const translated = formatTranslated(value as Parameters<typeof formatTranslated>[0], '');
      if (translated) return translated;
      const o = value as Record<string, unknown>;
      const nested = customOrderDisplayText(o.name, o.title, o.label, o.code);
      if (nested) return nested;
    }
  }
  return '';
}

/** `address.area` is a string or `{ ar, en }` (API). Prefer UI language, then `ar`. */
export function getCustomOrderRequestAreaLabel(item: CustomOrderRequestListItem): string {
  const address = item.address;
  if (!address || typeof address !== 'object') return '';
  const area = address.area;
  if (typeof area === 'string') return area.trim();
  const localized = formatTranslated(area as Parameters<typeof formatTranslated>[0], '');
  if (localized) return localized;
  if (area && typeof area === 'object') {
    const o = area as Record<string, unknown>;
    if (typeof o.ar === 'string' && o.ar.trim()) return o.ar.trim();
    return customOrderDisplayText(o.name, o.en);
  }
  return '';
}

export function getCustomOrderRequestText(item: CustomOrderRequestListItem): string {
  return (
    customOrderDisplayText(item.description, item.text, item.content, item.note, item.message) ||
    '—'
  );
}

export function getCustomOrderRequestUserName(item: CustomOrderRequestListItem): string {
  return customOrderDisplayText(item.user?.name) || '—';
}

export function getCustomOrderRequestUserPhone(item: CustomOrderRequestListItem): string {
  return customOrderDisplayText(item.user?.phone);
}

export function getCustomOrderRequestPaymentMethodLabel(item: CustomOrderRequestListItem): string {
  const pm = item.payment_method;
  if (typeof pm === 'string') return pm.trim() || '—';
  if (pm && typeof pm === 'object') {
    return customOrderDisplayText(pm.name, pm.code) || '—';
  }
  return '—';
}

export function getCustomOrderRequestCreatedAt(item: CustomOrderRequestListItem): string {
  return customOrderDisplayText(item.created_at) || '—';
}

export function getCustomOrderRequestStatusKey(item: CustomOrderRequestListItem): string {
  const raw = item.status;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const key = customOrderDisplayText(o.key, o.status, o.code, o.slug, o.name);
    if (key) return key;
  }
  return customOrderDisplayText(raw);
}

export function getCustomOrderRequestStatusLabel(
  item: CustomOrderRequestListItem,
  fallback = ''
): string {
  return customOrderDisplayText(item.status_label) || fallback || getCustomOrderRequestStatusKey(item) || '—';
}

export function getCustomOrderRequestAddress(item: CustomOrderRequestListItem): string {
  const fromText = customOrderDisplayText(item.address_text);
  if (fromText) return fromText;
  if (typeof item.address === 'string' && item.address.trim()) {
    return item.address.trim();
  }
  if (item.address && typeof item.address === 'object') {
    const a = item.address;
    const parts = [
      customOrderDisplayText(a.label),
      customOrderDisplayText(a.street_name, a.street),
      getCustomOrderRequestAreaLabel(item),
    ].filter(Boolean);
    if (parts.length) return parts.join(' · ');
  }
  return '—';
}

export function getCustomOrderRequestExpectedTime(item: CustomOrderRequestListItem): string {
  return (
    customOrderDisplayText(item.expected_delivery_time, item.expected_at, item.delivery_time) ||
    '—'
  );
}

export function getCustomOrderRequestImageUrls(item: CustomOrderRequestListItem): string[] {
  const images = item.images;
  if (!Array.isArray(images) || images.length === 0) return [];

  return images
    .map((img) => {
      if (typeof img === 'string') return resolveStorageImageUrl(img);
      if (img && typeof img === 'object') {
        return resolveStorageImageUrl(img.url ?? img.path ?? img.image ?? null);
      }
      return null;
    })
    .filter((url): url is string => Boolean(url));
}

export function getLinkedOrderId(item: CustomOrderRequestListItem): number | null {
  if (typeof item.order_id === 'number' && item.order_id > 0) return item.order_id;
  if (item.order?.id != null && Number(item.order.id) > 0) return Number(item.order.id);
  return null;
}
