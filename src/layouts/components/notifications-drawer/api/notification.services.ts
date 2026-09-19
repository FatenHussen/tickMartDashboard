import { apiRoutes, axiosInstance } from '@/api';

import { formatTranslated } from 'src/utils/format-translated';

// ----------------------------------------------------------------------

export type NotificationApiItem = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  url?: string | null;
};

export type NotificationListResponse = {
  status: boolean;
  message: string;
  data: NotificationApiItem[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  return formatTranslated(value as Parameters<typeof formatTranslated>[0], '');
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

export function normalizeNotificationItem(raw: unknown): NotificationApiItem | null {
  const item = asRecord(raw);
  if (!item) return null;

  const nested = asRecord(item.data) ?? {};
  const id = item.id ?? nested.id;
  if (id == null || String(id).trim() === '') return null;

  return {
    id: String(id),
    title: asText(item.title ?? nested.title ?? nested.message ?? item.message),
    body: asText(item.body ?? nested.body ?? nested.content ?? item.content),
    read_at: (item.read_at as string | null | undefined) ?? null,
    created_at: String(item.created_at ?? nested.created_at ?? ''),
    url: firstString(
      item.url,
      item.link,
      item.target_page,
      nested.url,
      nested.link,
      nested.target_page
    ),
  };
}

export function extractNotificationItems(payload: unknown): NotificationApiItem[] {
  const root = asRecord(payload);
  const data = root?.data ?? payload;

  if (Array.isArray(data)) {
    return data.map(normalizeNotificationItem).filter((item): item is NotificationApiItem => item != null);
  }

  const dataObj = asRecord(data);
  const items = dataObj?.items ?? dataObj?.notifications ?? dataObj?.data;
  if (Array.isArray(items)) {
    return items.map(normalizeNotificationItem).filter((item): item is NotificationApiItem => item != null);
  }

  return [];
}

export const _NotificationApi = {
  getList: async (): Promise<NotificationListResponse> => {
    const response = await axiosInstance.get(apiRoutes.auth.notifications);
    const items = extractNotificationItems(response.data);
    return {
      status: Boolean((response.data as { status?: boolean })?.status ?? true),
      message: String((response.data as { message?: string })?.message ?? ''),
      data: items,
    };
  },
};
