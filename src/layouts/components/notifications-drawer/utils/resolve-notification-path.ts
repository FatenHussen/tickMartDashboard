import { paths } from 'src/routes/paths';

export type NotificationTargetSource = {
  url?: string | null;
  type?: string | null;
  entityId?: string | null;
  title?: string | null;
  body?: string | null;
};

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function compactKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/notification$/i, '')
    .replace(/[^a-z0-9]+/g, '') ?? '';
}

function extractHashId(text: string): string | null {
  const match = text.match(/#\s*(\d+)/);
  return match?.[1] ?? null;
}

function looksLikeCustomOrder(text: string): boolean {
  return /طلب\s*سريع|طلب\s*مخصص|custom[_\s-]?order|quick[_\s-]?order|بانتظار\s*التسعير|pending[_\s-]?pricing/i.test(
    text
  );
}

function isCustomOrderType(type: string | null | undefined): boolean {
  if (!type) return false;
  const key = compactKey(type);
  return (
    key.includes('customorder') ||
    key.includes('quickorder') ||
    key.includes('custom_order') ||
    type.includes('custom-order-request') ||
    type.includes('custom_order_request')
  );
}

function isOrderType(type: string | null | undefined): boolean {
  if (!type || isCustomOrderType(type)) return false;
  const key = compactKey(type);
  return key.includes('order');
}

export function toInternalPath(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return null;
    }
    return trimmed;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function resolveNotificationHref(source: NotificationTargetSource): string | null {
  const explicit = firstString(source.url);
  if (explicit) return toInternalPath(explicit);

  const text = `${source.title ?? ''} ${source.body ?? ''}`;
  const inferredId = firstString(source.entityId, extractHashId(text));

  if (isCustomOrderType(source.type) || looksLikeCustomOrder(text)) {
    return inferredId
      ? paths.dashboard.customOrderRequest.details(inferredId)
      : paths.dashboard.customOrderRequests;
  }

  if (isOrderType(source.type)) {
    return inferredId ? `/orders/details/${inferredId}` : paths.dashboard.orders;
  }

  return null;
}

export function notificationIconType(source: NotificationTargetSource): string {
  const href = resolveNotificationHref(source);
  if (href?.includes('/custom-order-requests') || href?.includes('/orders')) return 'order';
  if (isCustomOrderType(source.type) || isOrderType(source.type)) return 'order';
  return 'mail';
}
